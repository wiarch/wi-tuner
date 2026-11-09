export const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
] as const;

export const FLAT_NOTE_NAMES = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];
export type NotationSystem =
    | "solfege"
    | "english"
    | "english-sharps"
    | "english-flats"
    | "northern-europe";

export interface NoteReading {
    /** Canonical English sharp spelling, retained for compatibility. */
    note: NoteName;
    displayNote: string;
    octave: number;
    midi: number;
    cents: number;
    frequency: number;
}

export interface NoteOptions {
    referencePitch?: number;
    transposeSemitones?: number;
    notationSystem?: NotationSystem;
    temperament?: { offsetsCents: readonly number[] };
}

const NOTATION: Record<NotationSystem, readonly string[]> = {
    solfege: [
        "Do",
        "Do♯",
        "Re",
        "Re♯",
        "Mi",
        "Fa",
        "Fa♯",
        "Sol",
        "Sol♯",
        "La",
        "La♯",
        "Si",
    ],
    english: NOTE_NAMES,
    "english-sharps": NOTE_NAMES,
    "english-flats": FLAT_NOTE_NAMES,
    "northern-europe": [
        "C",
        "C♯",
        "D",
        "D♯",
        "E",
        "F",
        "F♯",
        "G",
        "G♯",
        "A",
        "B♭",
        "H",
    ],
};

const ALIASES = new Map<string, number>();
NOTE_NAMES.forEach((note, index) => ALIASES.set(note.toLowerCase(), index));
FLAT_NOTE_NAMES.forEach((note, index) =>
    ALIASES.set(note.toLowerCase(), index),
);
const SOLFEGE = [
    "do",
    "do#",
    "re",
    "re#",
    "mi",
    "fa",
    "fa#",
    "sol",
    "sol#",
    "la",
    "la#",
    "si",
];
SOLFEGE.forEach((note, index) => ALIASES.set(note, index));
ALIASES.set("h", 11);

export function parseNoteName(note: string): number | null {
    if (typeof note !== "string") return null;
    return (
        ALIASES.get(
            note.trim().replace("♯", "#").replace("♭", "b").toLowerCase(),
        ) ?? null
    );
}

export function formatNoteName(
    index: number,
    notationSystem: NotationSystem = "english",
): string {
    if (!Number.isInteger(index) || index < 0 || index > 11) return "";
    return NOTATION[notationSystem]?.[index] ?? NOTE_NAMES[index] ?? "";
}

export function noteToMidi(note: string, octave: number): number | null {
    const pitchClass = parseNoteName(note);
    if (
        pitchClass === null ||
        !Number.isInteger(octave) ||
        octave < -1 ||
        octave > 10
    )
        return null;
    return (octave + 1) * 12 + pitchClass;
}

export function isValidReferencePitch(referencePitch: number): boolean {
    return (
        Number.isFinite(referencePitch) &&
        referencePitch >= 392 &&
        referencePitch <= 500
    );
}

function offsetFromA(
    temperament: NoteOptions["temperament"],
    midi: number,
): number {
    if (!temperament) return 0;
    const pitchClass = ((midi % 12) + 12) % 12;
    return (
        (temperament.offsetsCents[pitchClass] ?? 0) -
        (temperament.offsetsCents[9] ?? 0)
    );
}

export function noteToFrequency(
    note: string,
    octave: number,
    referenceOrOptions: number | NoteOptions = 440,
): number | null {
    const options =
        typeof referenceOrOptions === "number"
            ? { referencePitch: referenceOrOptions }
            : referenceOrOptions;
    const referencePitch = options.referencePitch ?? 440;
    const midi = noteToMidi(note, octave);
    if (midi === null || !isValidReferencePitch(referencePitch)) return null;
    const transposition = options.transposeSemitones ?? 0;
    if (
        !Number.isInteger(transposition) ||
        transposition < -12 ||
        transposition > 12
    )
        return null;
    const targetMidi = midi + transposition;
    const temperamentOffset = offsetFromA(options.temperament, targetMidi);
    return (
        referencePitch *
        2 ** ((targetMidi - 69) / 12 + temperamentOffset / 1200)
    );
}

export function frequencyToNote(
    frequency: number,
    referenceOrOptions: number | NoteOptions = 440,
    extraOptions: Omit<NoteOptions, "referencePitch"> = {},
): NoteReading | null {
    const options =
        typeof referenceOrOptions === "number"
            ? { ...extraOptions, referencePitch: referenceOrOptions }
            : referenceOrOptions;
    const referencePitch = options.referencePitch ?? 440;
    if (
        !Number.isFinite(frequency) ||
        frequency <= 0 ||
        !isValidReferencePitch(referencePitch)
    )
        return null;
    const transpose = options.transposeSemitones ?? 0;
    if (!Number.isInteger(transpose) || transpose < -12 || transpose > 12)
        return null;

    const midiFloat = 69 + 12 * Math.log2(frequency / referencePitch);
    const midi = Math.round(midiFloat) + transpose;
    const pitchClass = ((midi % 12) + 12) % 12;
    const temperamentOffset = offsetFromA(options.temperament, midi);
    const targetFrequency =
        referencePitch * 2 ** ((midi - 69) / 12 + temperamentOffset / 1200);
    const canonical = NOTE_NAMES[pitchClass];
    if (!canonical) return null;
    return {
        note: canonical,
        displayNote: formatNoteName(
            pitchClass,
            options.notationSystem ?? "english",
        ),
        octave: Math.floor(midi / 12) - 1,
        midi,
        cents: Math.round(1200 * Math.log2(frequency / targetFrequency)),
        frequency,
    };
}

export function centsBetween(
    frequency: number,
    targetFrequency: number,
): number | null {
    if (
        !Number.isFinite(frequency) ||
        frequency <= 0 ||
        !Number.isFinite(targetFrequency) ||
        targetFrequency <= 0
    )
        return null;
    return 1200 * Math.log2(frequency / targetFrequency);
}

export function transposeNote(
    note: string,
    octave: number,
    semitones: number,
): { note: NoteName; octave: number } | null {
    const midi = noteToMidi(note, octave);
    if (
        midi === null ||
        !Number.isInteger(semitones) ||
        semitones < -12 ||
        semitones > 12
    )
        return null;
    const targetMidi = midi + semitones;
    const pitchClass = ((targetMidi % 12) + 12) % 12;
    const targetName = NOTE_NAMES[pitchClass];
    return targetName
        ? { note: targetName, octave: Math.floor(targetMidi / 12) - 1 }
        : null;
}
