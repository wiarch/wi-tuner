import {
    NOTE_NAMES,
    centsBetween,
    findClosestInstrumentString,
    formatNoteName,
    frequencyToNote,
    noteToFrequency,
    noteToMidi,
    type ClosestString,
    type InstrumentId,
    type NoteOptions,
} from "@wi-tuner/dsp-core";

export type TuneState = "idle" | "inTune" | "sharp" | "flat";

export interface TunerReading {
    displayNote: string | null;
    octave: number | null;
    frequencyHz: number | null;
    cents: number | null;
    targetHz: number | null;
    soundingMidi: number | null;
    closest: ClosestString | null;
    tuneState: TuneState;
}

export interface TunerReadingInput {
    frequencyHz: number | null;
    instrument: InstrumentId;
    tuningId: string;
    noteLocked: boolean;
    lockedSoundingMidi: number | null;
    thresholdCents: number;
    options: NoteOptions;
}

function concertOptions(options: NoteOptions): NoteOptions {
    return { ...options, transposeSemitones: 0 };
}

function frequencyForMidi(midi: number, options: NoteOptions): number | null {
    if (!Number.isInteger(midi)) return null;
    const pitchClass = ((midi % 12) + 12) % 12;
    const note = NOTE_NAMES[pitchClass];
    if (!note) return null;
    return noteToFrequency(
        note,
        Math.floor(midi / 12) - 1,
        concertOptions(options),
    );
}

function writtenFromMidi(
    soundingMidi: number,
    options: NoteOptions,
): { displayNote: string; octave: number } | null {
    const transpose = options.transposeSemitones ?? 0;
    if (!Number.isInteger(transpose) || transpose < -12 || transpose > 12)
        return null;
    const written = soundingMidi + transpose;
    const pitchClass = ((written % 12) + 12) % 12;
    const displayNote = formatNoteName(
        pitchClass,
        options.notationSystem ?? "english",
    );
    if (!displayNote) return null;
    return { displayNote, octave: Math.floor(written / 12) - 1 };
}

/** Written spelling of a concert pitch, after transposition and notation. */
export function writtenNoteLabel(
    note: string,
    octave: number,
    options: NoteOptions,
): string | null {
    const midi = noteToMidi(note, octave);
    if (midi === null) return null;
    const label = writtenFromMidi(midi, options);
    return label ? `${label.displayNote}${label.octave}` : null;
}

/**
 * Presentation reading. Cents always compare the measured frequency with the
 * sounding target. Transposition only changes the written note name.
 * Instrument mode targets the nearest string of the selected tuning.
 */
export function deriveTunerReading(input: TunerReadingInput): TunerReading {
    const frequencyHz =
        input.frequencyHz !== null &&
        Number.isFinite(input.frequencyHz) &&
        input.frequencyHz > 0
            ? input.frequencyHz
            : null;
    const sounding = concertOptions(input.options);
    const closest =
        frequencyHz !== null && input.instrument !== "chromatic"
            ? findClosestInstrumentString(
                  frequencyHz,
                  input.instrument,
                  input.tuningId,
                  sounding,
              )
            : null;
    const liveMidi =
        closest !== null
            ? noteToMidi(closest.string.note, closest.string.octave)
            : frequencyHz === null
              ? null
              : (frequencyToNote(frequencyHz, sounding)?.midi ?? null);
    const locked =
        input.noteLocked &&
        input.lockedSoundingMidi !== null &&
        Number.isInteger(input.lockedSoundingMidi)
            ? input.lockedSoundingMidi
            : null;
    const soundingMidi = locked ?? liveMidi;
    const targetHz =
        soundingMidi === null
            ? null
            : frequencyForMidi(soundingMidi, input.options);
    const cents =
        frequencyHz === null || targetHz === null
            ? null
            : centsBetween(frequencyHz, targetHz);
    const written =
        soundingMidi === null
            ? null
            : writtenFromMidi(soundingMidi, input.options);
    const threshold =
        Number.isFinite(input.thresholdCents) && input.thresholdCents >= 0
            ? input.thresholdCents
            : 2;
    const tuneState: TuneState =
        cents === null
            ? "idle"
            : Math.abs(cents) <= threshold
              ? "inTune"
              : cents > 0
                ? "sharp"
                : "flat";
    return {
        displayNote: written?.displayNote ?? null,
        octave: written?.octave ?? null,
        frequencyHz,
        cents,
        targetHz,
        soundingMidi,
        closest,
        tuneState,
    };
}
