import { describe, expect, it } from "vitest";
import {
    AdaptiveNoiseGate,
    INSTRUMENT_IDS,
    INSTRUMENT_PRESETS,
    MetronomeScheduler,
    NOTE_NAMES,
    TapTempo,
    TEMPERAMENTS,
    centsBetween,
    createTemperament,
    detectPitch,
    exportTemperament,
    findClosestInstrumentString,
    findClosestString,
    formatNoteName,
    frequencyToNote,
    getInstrumentPreset,
    getTuningPreset,
    importTemperament,
    isValidReferencePitch,
    noteToFrequency,
    noteToMidi,
    parseNoteName,
    transposeNote,
    validateMetronomeConfig,
} from "../src";

const SAMPLE_RATE = 48_000;
function sine(
    frequency: number,
    length = 16_384,
    amplitude = 0.7,
): Float32Array {
    return Float32Array.from(
        { length },
        (_, index) =>
            amplitude *
            Math.sin((2 * Math.PI * frequency * index) / SAMPLE_RATE),
    );
}
function saw(frequency: number, length = 16_384): Float32Array {
    return Float32Array.from(
        { length },
        (_, index) =>
            0.65 * (2 * (((frequency * index) / SAMPLE_RATE) % 1) - 1),
    );
}
function seededNoise(length: number, amplitude = 0.4): Float32Array {
    let seed = 0x12345678;
    return Float32Array.from({ length }, () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return amplitude * ((seed / 0x1_0000_0000) * 2 - 1);
    });
}

describe("pitch detection", () => {
    it.each([25, 41.2034, 82.4069, 110, 440, 987.77, 4_500])(
        "detects a clean %s Hz sine within one cent",
        (hz) => {
            const result = detectPitch(sine(hz), SAMPLE_RATE);
            expect(result).not.toBeNull();
            expect(Math.abs(centsBetween(result!.frequency, hz)!)).toBeLessThan(
                1,
            );
            expect(result!.clarity).toBeGreaterThan(0.9);
        },
    );
    it("detects sawtooth and guitar-like harmonics without selecting an overtone", () => {
        expect(detectPitch(saw(110), SAMPLE_RATE)?.frequency).toBeCloseTo(
            110,
            1,
        );
        const fundamental = 82.4069;
        const frame = Float32Array.from(
            { length: 16_384 },
            (_, i) =>
                0.16 * Math.sin((2 * Math.PI * fundamental * i) / SAMPLE_RATE) +
                0.7 * Math.sin((4 * Math.PI * fundamental * i) / SAMPLE_RATE) +
                0.42 * Math.sin((6 * Math.PI * fundamental * i) / SAMPLE_RATE) +
                0.2 * Math.sin((8 * Math.PI * fundamental * i) / SAMPLE_RATE),
        );
        const result = detectPitch(frame, SAMPLE_RATE);
        expect(result).not.toBeNull();
        expect(
            Math.abs(centsBetween(result!.frequency, fundamental)!),
        ).toBeLessThan(1);
    });
    it("rejects silence, low-level hum, invalid frames and broadband noise", () => {
        expect(detectPitch(new Float32Array(16_384), SAMPLE_RATE)).toBeNull();
        expect(detectPitch(sine(60, 16_384, 0.001), SAMPLE_RATE)).toBeNull();
        expect(detectPitch(seededNoise(16_384), SAMPLE_RATE)).toBeNull();
        expect(detectPitch(null as never, SAMPLE_RATE)).toBeNull();
        expect(
            detectPitch(new Float32Array(512).fill(Number.NaN), SAMPLE_RATE),
        ).toBeNull();
        expect(detectPitch(new Float32Array(32), SAMPLE_RATE)).toBeNull();
        expect(detectPitch(sine(440), 0)).toBeNull();
    });
    it("tracks sudden pitch jumps and enforces configured range", () => {
        expect(detectPitch(sine(110), SAMPLE_RATE)?.frequency).toBeCloseTo(
            110,
            1,
        );
        expect(detectPitch(sine(440), SAMPLE_RATE)?.frequency).toBeCloseTo(
            440,
            1,
        );
        expect(
            detectPitch(sine(110), SAMPLE_RATE, { minFrequency: 200 }),
        ).toBeNull();
        expect(
            detectPitch(sine(440), SAMPLE_RATE, { maxFrequency: 4_600 }),
        ).toBeNull();
        expect(
            detectPitch(sine(440), SAMPLE_RATE, { minimumClarity: 1.1 }),
        ).toBeNull();
        expect(
            detectPitch(sine(440), SAMPLE_RATE, { minimumClarity: Number.NaN }),
        ).toBeNull();
        expect(
            detectPitch(sine(440), SAMPLE_RATE, {
                silenceThreshold: Number.NaN,
            }),
        ).toBeNull();
        expect(
            detectPitch(sine(440), SAMPLE_RATE, { minFrequency: 0 }),
        ).toBeNull();
        expect(detectPitch(sine(440), 8_000)).toBeNull();
    });
});

describe("note, notation, reference pitch and transposition", () => {
    it("converts A4 at default and alternate reference pitches", () => {
        expect(frequencyToNote(440)).toMatchObject({
            note: "A",
            octave: 4,
            midi: 69,
            cents: 0,
        });
        expect(noteToFrequency("A", 4, 442)).toBeCloseTo(442);
        expect(frequencyToNote(392, 392)?.note).toBe("A");
        expect(frequencyToNote(500, 500)?.note).toBe("A");
    });
    it("rejects out-of-range references, transpositions and malformed notes", () => {
        expect(isValidReferencePitch(392)).toBe(true);
        expect(isValidReferencePitch(500)).toBe(true);
        expect(isValidReferencePitch(391.99)).toBe(false);
        expect(frequencyToNote(440, 501)).toBeNull();
        expect(noteToFrequency("Q", 4)).toBeNull();
        expect(noteToFrequency("C", 11)).toBeNull();
        expect(noteToFrequency("C", 4, { transposeSemitones: 13 })).toBeNull();
        expect(frequencyToNote(440, { transposeSemitones: -13 })).toBeNull();
        expect(parseNoteName("Db")).toBe(1);
        expect(parseNoteName("H")).toBe(11);
        expect(parseNoteName(null as never)).toBeNull();
        expect(noteToMidi("C", -2)).toBeNull();
    });
    it("formats all requested notation systems and transposes", () => {
        expect(formatNoteName(1, "solfege")).toBe("Do♯");
        expect(formatNoteName(1, "english-sharps")).toBe("C#");
        expect(formatNoteName(1, "english-flats")).toBe("Db");
        expect(formatNoteName(10, "northern-europe")).toBe("B♭");
        expect(formatNoteName(11, "northern-europe")).toBe("H");
        expect(
            frequencyToNote(440, { notationSystem: "solfege" })?.displayNote,
        ).toBe("La");
        expect(transposeNote("E", 2, -2)).toEqual({ note: "D", octave: 2 });
        expect(transposeNote("B", 3, 1)).toEqual({ note: "C", octave: 4 });
        expect(transposeNote("A", 4, 13)).toBeNull();
        expect(formatNoteName(12 as never)).toBe("");
    });
    it("computes cents and applies temperament while keeping A4 reference stable", () => {
        expect(centsBetween(440 * 2 ** (10 / 1200), 440)).toBeCloseTo(10);
        expect(centsBetween(0, 440)).toBeNull();
        expect(
            noteToFrequency("A", 4, {
                referencePitch: 440,
                temperament: TEMPERAMENTS.just!,
            }),
        ).toBeCloseTo(440);
        expect(
            noteToFrequency("C", 4, { temperament: TEMPERAMENTS.just! }),
        ).not.toBeCloseTo(noteToFrequency("C", 4)!, 4);
    });
});

describe("temperaments", () => {
    it("provides equal and historical tuning systems", () => {
        expect(Object.keys(TEMPERAMENTS)).toEqual(
            expect.arrayContaining([
                "equal",
                "just",
                "pythagorean",
                "meantone",
                "werckmeister",
                "kirnberger",
                "vallotti",
                "young",
            ]),
        );
        expect(TEMPERAMENTS.equal?.offsetsCents).toEqual(Array(12).fill(0));
    });
    it("validates and round-trips custom temperament JSON", () => {
        const custom = createTemperament({
            id: "my-tuning",
            name: "My tuning",
            offsetsCents: Array.from({ length: 12 }, (_, i) => i / 10),
        });
        expect(custom).not.toBeNull();
        expect(importTemperament(exportTemperament(custom!))).toEqual(custom);
        expect(importTemperament("not json")).toBeNull();
        expect(
            importTemperament(
                JSON.stringify({ version: 2, temperament: custom }),
            ),
        ).toBeNull();
        expect(
            importTemperament(
                JSON.stringify({
                    version: 1,
                    temperament: { ...custom, offsetsCents: [1] },
                }),
            ),
        ).toBeNull();
        expect(importTemperament(" ".repeat(20_001))).toBeNull();
        expect(
            createTemperament({
                id: "bad id",
                name: "Bad",
                offsetsCents: Array(12).fill(0),
            }),
        ).toBeNull();
        expect(
            createTemperament({
                id: "bad",
                name: "",
                offsetsCents: Array(12).fill(0),
            }),
        ).toBeNull();
        expect(
            createTemperament({
                id: "bad",
                name: "Bad",
                offsetsCents: Array(12).fill(101),
            }),
        ).toBeNull();
        expect(
            createTemperament({
                id: "bad",
                name: "Bad",
                offsetsCents: Array(12).fill(0),
                description: "x".repeat(501),
            }),
        ).toBeNull();
        expect(() =>
            exportTemperament({ id: "bad", name: "", offsetsCents: [] }),
        ).toThrow(TypeError);
    });
});

describe("instrument catalog", () => {
    it("includes all requested instruments and alternate guitar/bass tunings", () => {
        expect(INSTRUMENT_IDS).toEqual([
            "guitar",
            "bass",
            "violin",
            "viola",
            "cello",
            "ukulele",
            "banjo",
            "mandolin",
            "piano",
            "chromatic",
        ]);
        expect(INSTRUMENT_PRESETS.guitar.tunings.map(({ id }) => id)).toEqual([
            "standard",
            "drop-d",
            "half-step-down",
            "open-g",
            "open-d",
            "dadgad",
        ]);
        expect(
            INSTRUMENT_PRESETS.bass.tunings.find(({ id }) => id === "5-string")
                ?.strings,
        ).toHaveLength(5);
        expect(INSTRUMENT_PRESETS.piano.tunings[0]?.strings).toHaveLength(88);
        expect(getInstrumentPreset("unknown").id).toBe("chromatic");
        expect(getInstrumentPreset("toString").id).toBe("chromatic");
        expect(getTuningPreset("guitar", "unknown").id).toBe("standard");
        expect(getTuningPreset("chromatic").strings).toHaveLength(0);
    });
    it("finds the closest string and validates malformed readings", () => {
        const standard = getTuningPreset("guitar");
        expect(
            findClosestString(noteToFrequency("A", 2)!, standard)?.string.label,
        ).toBe("A");
        expect(
            findClosestInstrumentString(
                noteToFrequency("D", 2)!,
                "guitar",
                "drop-d",
            )?.string.note,
        ).toBe("D");
        expect(
            findClosestString(1, { id: "none", name: "none", strings: [] }),
        ).toBeNull();
        expect(findClosestString(0, standard)).toBeNull();
        expect(findClosestString(440, standard, 501)).toBeNull();
    });
});

describe("metronome scheduler", () => {
    it("schedules subdivisions on the audio clock and accents the downbeat", () => {
        const scheduler = new MetronomeScheduler({
            bpm: 120,
            beatsPerBar: 4,
            subdivision: 2,
            lookaheadSeconds: 0.2,
        });
        scheduler.start(10);
        const ticks: {
            time: number;
            beatIndex: number;
            subdivisionIndex: number;
            accent: boolean;
        }[] = [];
        expect(scheduler.pump(10, (tick) => ticks.push(tick))).toBe(1);
        expect(ticks[0]).toMatchObject({
            time: 10,
            beatIndex: 0,
            subdivisionIndex: 0,
            accent: true,
        });
        expect(scheduler.pump(10.1, (tick) => ticks.push(tick))).toBe(1);
        expect(ticks[1]).toMatchObject({
            time: 10.25,
            beatIndex: 0,
            subdivisionIndex: 1,
            accent: false,
        });
        expect(scheduler.pump(10.31, (tick) => ticks.push(tick))).toBe(1);
        expect(ticks[2]).toMatchObject({
            time: 10.5,
            beatIndex: 1,
            subdivisionIndex: 0,
            accent: false,
        });
        scheduler.stop();
        expect(scheduler.isRunning).toBe(false);
        expect(scheduler.pump(11, () => undefined)).toBe(0);
    });
    it("supports custom accents, updates, and validates tempo/meter", () => {
        const config = {
            bpm: 90,
            beatsPerBar: 3,
            subdivision: 1 as const,
            accents: [false, true, false],
        };
        expect(validateMetronomeConfig(config)).toBe(true);
        expect(validateMetronomeConfig(null as never)).toBe(false);
        expect(validateMetronomeConfig({ ...config, bpm: 301 })).toBe(false);
        expect(validateMetronomeConfig({ ...config, beatsPerBar: 17 })).toBe(
            false,
        );
        expect(
            validateMetronomeConfig({ ...config, subdivision: 5 as never }),
        ).toBe(false);
        expect(validateMetronomeConfig({ ...config, accents: [true] })).toBe(
            false,
        );
        expect(() => new MetronomeScheduler({ ...config, bpm: 0 })).toThrow(
            RangeError,
        );
        const scheduler = new MetronomeScheduler(config);
        expect(() => scheduler.start(-1)).toThrow(RangeError);
        scheduler.start(0);
        const ticks: { accent: boolean }[] = [];
        scheduler.pump(0, (tick) => ticks.push(tick));
        expect(ticks[0]?.accent).toBe(false);
        scheduler.update({ ...config, bpm: 100 });
        expect(() => scheduler.pump(-1, () => undefined)).toThrow(RangeError);
        scheduler.start(0);
        const recovered: number[] = [];
        scheduler.pump(100, (tick) => recovered.push(tick.time));
        expect(recovered.length).toBeLessThanOrEqual(1);
        scheduler.pump(100.11, (tick) => recovered.push(tick.time));
        expect(recovered[0]).toBeGreaterThanOrEqual(100);
    });
    it("calculates tap tempo, resets after pauses and rejects invalid taps", () => {
        const tapper = new TapTempo();
        expect(tapper.tap(1)).toBeNull();
        expect(tapper.tap(1.5)).toBeCloseTo(120);
        expect(tapper.tap(2)).toBeCloseTo(120);
        expect(tapper.tap(5)).toBeNull();
        expect(tapper.tap(5.5)).toBeCloseTo(120);
        expect(tapper.tap(Number.NaN)).toBeNull();
        expect(() => new TapTempo(0)).toThrow(RangeError);
        tapper.reset();
        expect(tapper.tap(0)).toBeNull();
    });
});

describe("adaptive gate and AGC", () => {
    it("opens and closes with hysteresis and learns the noise floor", () => {
        const gate = new AdaptiveNoiseGate();
        expect(gate.process(0.005).open).toBe(false);
        expect(gate.process(0.04).open).toBe(true);
        expect(gate.process(0.015).open).toBe(true);
        expect(gate.process(0.005).open).toBe(false);
        expect(gate.process(0.01).noiseFloor).toBeGreaterThan(0.001);
        gate.reset();
        expect(gate.isOpen).toBe(false);
    });
    it("applies bounded automatic gain control and rejects invalid inputs", () => {
        const gate = new AdaptiveNoiseGate({
            targetRms: 0.1,
            maxGain: 3,
            minGain: 0.5,
        });
        const frame = gate.process(0.02);
        expect(frame.gain).toBeGreaterThan(1);
        expect(frame.gain).toBeLessThanOrEqual(3);
        expect(frame.gatedRms).toBeGreaterThan(0);
        expect(() => gate.process(-1)).toThrow(RangeError);
        expect(
            () => new AdaptiveNoiseGate({ openingRms: 0, maxGain: 1 }),
        ).toThrow(RangeError);
        expect(
            () => new AdaptiveNoiseGate({ openingRatio: Number.NaN }),
        ).toThrow(RangeError);
    });
});

it("exports the twelve pitch classes", () =>
    expect(NOTE_NAMES).toHaveLength(12));
