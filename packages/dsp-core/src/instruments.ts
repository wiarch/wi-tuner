import { noteToFrequency, type NoteName } from "./theory";

export type InstrumentId =
    | "guitar"
    | "bass"
    | "violin"
    | "viola"
    | "cello"
    | "ukulele"
    | "banjo"
    | "mandolin"
    | "piano"
    | "chromatic";

export interface TuningString {
    label: string;
    note: NoteName;
    octave: number;
}
export interface TuningPreset {
    id: string;
    name: string;
    strings: readonly TuningString[];
}
export interface InstrumentPreset {
    id: InstrumentId;
    name: string;
    tunings: readonly TuningPreset[];
}
const s = (
    note: NoteName,
    octave: number,
    label: string = note,
): TuningString => ({ note, octave, label });
const tuning = (
    id: string,
    name: string,
    strings: TuningString[],
): TuningPreset => ({ id, name, strings });

const instruments: Record<InstrumentId, InstrumentPreset> = {
    guitar: {
        id: "guitar",
        name: "Guitar",
        tunings: [
            tuning("standard", "Standard E", [
                s("E", 2),
                s("A", 2),
                s("D", 3),
                s("G", 3),
                s("B", 3),
                s("E", 4, "e"),
            ]),
            tuning("drop-d", "Drop D", [
                s("D", 2),
                s("A", 2),
                s("D", 3),
                s("G", 3),
                s("B", 3),
                s("E", 4, "e"),
            ]),
            tuning("half-step-down", "Half step down", [
                s("D#", 2),
                s("G#", 2),
                s("C#", 3),
                s("F#", 3),
                s("A#", 3),
                s("D#", 4),
            ]),
            tuning("open-g", "Open G", [
                s("D", 2),
                s("G", 2),
                s("D", 3),
                s("G", 3),
                s("B", 3),
                s("D", 4),
            ]),
            tuning("open-d", "Open D", [
                s("D", 2),
                s("A", 2),
                s("D", 3),
                s("F#", 3),
                s("A", 3),
                s("D", 4),
            ]),
            tuning("dadgad", "DADGAD", [
                s("D", 2),
                s("A", 2),
                s("D", 3),
                s("G", 3),
                s("A", 3),
                s("D", 4),
            ]),
        ],
    },
    bass: {
        id: "bass",
        name: "Bass",
        tunings: [
            tuning("standard", "4-string standard", [
                s("E", 1),
                s("A", 1),
                s("D", 2),
                s("G", 2),
            ]),
            tuning("5-string", "5-string standard", [
                s("B", 0),
                s("E", 1),
                s("A", 1),
                s("D", 2),
                s("G", 2),
            ]),
            tuning("drop-d", "4-string Drop D", [
                s("D", 1),
                s("A", 1),
                s("D", 2),
                s("G", 2),
            ]),
        ],
    },
    violin: {
        id: "violin",
        name: "Violin",
        tunings: [
            tuning("standard", "Standard", [
                s("G", 3),
                s("D", 4),
                s("A", 4),
                s("E", 5),
            ]),
        ],
    },
    viola: {
        id: "viola",
        name: "Viola",
        tunings: [
            tuning("standard", "Standard", [
                s("C", 3),
                s("G", 3),
                s("D", 4),
                s("A", 4),
            ]),
        ],
    },
    cello: {
        id: "cello",
        name: "Cello",
        tunings: [
            tuning("standard", "Standard", [
                s("C", 2),
                s("G", 2),
                s("D", 3),
                s("A", 3),
            ]),
        ],
    },
    ukulele: {
        id: "ukulele",
        name: "Ukulele",
        tunings: [
            tuning("standard", "Soprano / concert / tenor", [
                s("G", 4),
                s("C", 4),
                s("E", 4),
                s("A", 4),
            ]),
            tuning("baritone", "Baritone", [
                s("D", 3),
                s("G", 3),
                s("B", 3),
                s("E", 4),
            ]),
        ],
    },
    banjo: {
        id: "banjo",
        name: "Banjo",
        tunings: [
            tuning("standard", "5-string open G", [
                s("G", 4, "5th"),
                s("D", 3),
                s("G", 3),
                s("B", 3),
                s("D", 4),
            ]),
        ],
    },
    mandolin: {
        id: "mandolin",
        name: "Mandolin",
        tunings: [
            tuning("standard", "Standard GDAE", [
                s("G", 3),
                s("D", 4),
                s("A", 4),
                s("E", 5),
            ]),
        ],
    },
    piano: {
        id: "piano",
        name: "Piano",
        tunings: [
            tuning(
                "88-key",
                "88-key range A0–C8",
                Array.from({ length: 88 }, (_, i) => {
                    const midi = 21 + i;
                    const names: NoteName[] = [
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
                    ];
                    const note = names[midi % 12] ?? "A";
                    const octave = Math.floor(midi / 12) - 1;
                    return s(note, octave, `${note}${octave}`);
                }),
            ),
        ],
    },
    chromatic: {
        id: "chromatic",
        name: "Chromatic",
        tunings: [tuning("default", "25 Hz–4.5 kHz", [])],
    },
};

export const INSTRUMENT_PRESETS: Readonly<
    Record<InstrumentId, InstrumentPreset>
> = Object.freeze(instruments);
export const INSTRUMENT_IDS = Object.freeze(
    Object.keys(instruments) as InstrumentId[],
);

export function getInstrumentPreset(instrumentId: string): InstrumentPreset {
    return Object.hasOwn(instruments, instrumentId)
        ? instruments[instrumentId as InstrumentId]
        : instruments.chromatic;
}

export function getTuningPreset(
    instrumentId: string,
    tuningId = "standard",
): TuningPreset {
    const available = getInstrumentPreset(instrumentId).tunings;
    return (
        available.find((item) => item.id === tuningId) ??
        available[0] ??
        tuning("default", "Chromatic", [])
    );
}

export interface ClosestString {
    string: TuningString;
    frequency: number;
    cents: number;
    distanceCents: number;
}
export function findClosestString(
    frequency: number,
    tuningPreset: TuningPreset,
    referencePitch = 440,
): ClosestString | null {
    if (
        !Number.isFinite(frequency) ||
        frequency <= 0 ||
        !Number.isFinite(referencePitch) ||
        referencePitch < 392 ||
        referencePitch > 500
    )
        return null;
    let closest: ClosestString | null = null;
    for (const string of tuningPreset.strings) {
        const target = noteToFrequency(
            string.note,
            string.octave,
            referencePitch,
        );
        if (target === null) continue;
        const cents = 1200 * Math.log2(frequency / target);
        if (!closest || Math.abs(cents) < closest.distanceCents)
            closest = {
                string,
                frequency: target,
                cents,
                distanceCents: Math.abs(cents),
            };
    }
    return closest;
}

export function findClosestInstrumentString(
    frequency: number,
    instrumentId: string,
    tuningId = "standard",
    referencePitch = 440,
): ClosestString | null {
    return findClosestString(
        frequency,
        getTuningPreset(instrumentId, tuningId),
        referencePitch,
    );
}
