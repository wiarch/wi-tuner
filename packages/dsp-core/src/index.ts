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

const FLAT_NOTE_NAMES = [
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
export type InstrumentId = "guitar" | "bass";

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

export interface NoteReading {
    note: NoteName;
    octave: number;
    midi: number;
    cents: number;
    frequency: number;
}

export interface PitchEstimate {
    frequency: number;
    clarity: number;
    rms: number;
}

const noteIndex = new Map<string, number>();
NOTE_NAMES.forEach((note, index) => noteIndex.set(note, index));
FLAT_NOTE_NAMES.forEach((note, index) => noteIndex.set(note, index));

export const INSTRUMENT_PRESETS: Readonly<
    Record<InstrumentId, InstrumentPreset>
> = {
    guitar: {
        id: "guitar",
        name: "Guitarra",
        tunings: [
            {
                id: "standard",
                name: "Estándar (E A D G B E)",
                strings: [
                    { label: "E", note: "E", octave: 2 },
                    { label: "A", note: "A", octave: 2 },
                    { label: "D", note: "D", octave: 3 },
                    { label: "G", note: "G", octave: 3 },
                    { label: "B", note: "B", octave: 3 },
                    { label: "e", note: "E", octave: 4 },
                ],
            },
            {
                id: "drop-d",
                name: "Drop D (D A D G B E)",
                strings: [
                    { label: "D", note: "D", octave: 2 },
                    { label: "A", note: "A", octave: 2 },
                    { label: "D", note: "D", octave: 3 },
                    { label: "G", note: "G", octave: 3 },
                    { label: "B", note: "B", octave: 3 },
                    { label: "e", note: "E", octave: 4 },
                ],
            },
        ],
    },
    bass: {
        id: "bass",
        name: "Bajo",
        tunings: [
            {
                id: "standard",
                name: "Estándar (E A D G)",
                strings: [
                    { label: "E", note: "E", octave: 1 },
                    { label: "A", note: "A", octave: 1 },
                    { label: "D", note: "D", octave: 2 },
                    { label: "G", note: "G", octave: 2 },
                ],
            },
            {
                id: "drop-d",
                name: "Drop D (D A D G)",
                strings: [
                    { label: "D", note: "D", octave: 1 },
                    { label: "A", note: "A", octave: 1 },
                    { label: "D", note: "D", octave: 2 },
                    { label: "G", note: "G", octave: 2 },
                ],
            },
        ],
    },
};

export function getInstrumentPreset(instrumentId: string): InstrumentPreset {
    return instrumentId === "bass"
        ? INSTRUMENT_PRESETS.bass
        : INSTRUMENT_PRESETS.guitar;
}

export function getTuningPreset(
    instrumentId: string,
    tuningId = "standard",
): TuningPreset {
    const instrument = getInstrumentPreset(instrumentId);
    return (
        instrument.tunings.find((tuning) => tuning.id === tuningId) ??
        instrument.tunings[0]!
    );
}

export function frequencyToNote(
    frequency: number,
    referencePitch = 440,
): NoteReading | null {
    if (
        !Number.isFinite(frequency) ||
        frequency <= 0 ||
        !Number.isFinite(referencePitch) ||
        referencePitch <= 0
    ) {
        return null;
    }

    const midiFloat = 69 + 12 * Math.log2(frequency / referencePitch);
    const midi = Math.round(midiFloat);
    const note = NOTE_NAMES[((midi % 12) + 12) % 12];
    if (!note) {
        return null;
    }

    return {
        note,
        octave: Math.floor(midi / 12) - 1,
        midi,
        cents: Math.round((midiFloat - midi) * 100),
        frequency,
    };
}

export function noteToFrequency(
    note: string,
    octave: number,
    referencePitch = 440,
): number | null {
    const index = noteIndex.get(note);
    if (
        index === undefined ||
        !Number.isInteger(octave) ||
        !Number.isFinite(referencePitch) ||
        referencePitch <= 0
    ) {
        return null;
    }

    const midi = (octave + 1) * 12 + index;
    return referencePitch * 2 ** ((midi - 69) / 12);
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
    ) {
        return null;
    }

    return 1200 * Math.log2(frequency / targetFrequency);
}

/** YIN-style fundamental-frequency estimator with bounded, decimated analysis. */
export function detectPitch(
    buffer: ArrayLike<number>,
    sampleRate: number,
): PitchEstimate | null {
    if (
        !buffer ||
        buffer.length < 256 ||
        !Number.isFinite(sampleRate) ||
        sampleRate <= 0
    ) {
        return null;
    }

    const decimation = 4;
    const sampleCount = Math.floor(buffer.length / decimation);
    const samples = new Float32Array(sampleCount);
    let energy = 0;

    for (let index = 0; index < sampleCount; index++) {
        const sample = buffer[index * decimation] ?? 0;
        samples[index] = sample;
        energy += sample * sample;
    }

    const rms = Math.sqrt(energy / sampleCount);
    if (rms < 0.008) {
        return null;
    }

    const effectiveRate = sampleRate / decimation;
    const minLag = Math.max(2, Math.floor(effectiveRate / 1200));
    const maxLag = Math.min(
        Math.floor(effectiveRate / 30),
        Math.floor(sampleCount / 2),
    );
    if (maxLag <= minLag) {
        return null;
    }

    const differences = new Float64Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
        let difference = 0;
        const limit = sampleCount - lag;
        for (let index = 0; index < limit; index++) {
            const delta = (samples[index] ?? 0) - (samples[index + lag] ?? 0);
            difference += delta * delta;
        }
        differences[lag] = difference;
    }

    let cumulative = 0;
    const normalized = new Float64Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
        cumulative += differences[lag] ?? 0;
        const difference = differences[lag] ?? 0;
        normalized[lag] =
            cumulative === 0
                ? 1
                : (difference * (lag - minLag + 1)) / cumulative;
    }

    const threshold = 0.18;
    let selectedLag = -1;
    for (let lag = minLag; lag <= maxLag; lag++) {
        if ((normalized[lag] ?? 1) < threshold) {
            while (
                lag + 1 <= maxLag &&
                (normalized[lag + 1] ?? 1) < (normalized[lag] ?? 1)
            ) {
                lag++;
            }
            selectedLag = lag;
            break;
        }
    }

    if (selectedLag === -1) {
        let bestValue = Infinity;
        for (let lag = minLag; lag <= maxLag; lag++) {
            const value = normalized[lag] ?? 1;
            if (value < bestValue) {
                bestValue = value;
                selectedLag = lag;
            }
        }
        if (selectedLag === -1 || (normalized[selectedLag] ?? 1) > 0.35) {
            return null;
        }
    }

    const current = normalized[selectedLag] ?? 1;
    const previous = normalized[selectedLag - 1] ?? current;
    const next = normalized[selectedLag + 1] ?? current;
    const denominator = previous - 2 * current + next;
    const adjustment =
        denominator === 0 ? 0 : (0.5 * (previous - next)) / denominator;
    const refinedLag = selectedLag + Math.max(-1, Math.min(1, adjustment));
    const frequency = effectiveRate / refinedLag;

    if (!Number.isFinite(frequency) || frequency < 30 || frequency > 1200) {
        return null;
    }

    return {
        frequency,
        clarity: Math.max(0, Math.min(1, 1 - current)),
        rms,
    };
}
