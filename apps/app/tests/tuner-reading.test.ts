import { describe, expect, it } from "vitest";

import { deriveTunerReading, writtenNoteLabel } from "../src/tuner/reading";

const EQUAL_C4 = 440 * 2 ** ((60 - 69) / 12);
const E2 = 440 * 2 ** ((40 - 69) / 12);
const D2 = 440 * 2 ** ((38 - 69) / 12);

describe("tuner reading", () => {
    it("shows note, octave, frequency and continuous cents", () => {
        const reading = deriveTunerReading({
            frequencyHz: 440.5,
            instrument: "chromatic",
            tuningId: "default",
            noteLocked: false,
            lockedSoundingMidi: null,
            thresholdCents: 2,
            options: { referencePitch: 440, notationSystem: "english" },
        });
        expect(reading.displayNote).toBe("A");
        expect(reading.octave).toBe(4);
        expect(reading.frequencyHz).toBe(440.5);
        expect(reading.cents).toBeGreaterThan(1);
        expect(reading.cents).toBeLessThan(2);
        expect(reading.tuneState).toBe("inTune");
        expect(
            deriveTunerReading({
                frequencyHz: 443,
                instrument: "chromatic",
                tuningId: "default",
                noteLocked: false,
                lockedSoundingMidi: null,
                thresholdCents: 2,
                options: { referencePitch: 440 },
            }).tuneState,
        ).toBe("sharp");
    });

    it("transposes the written note without moving the sounding target", () => {
        const reading = deriveTunerReading({
            frequencyHz: 440,
            instrument: "chromatic",
            tuningId: "default",
            noteLocked: false,
            lockedSoundingMidi: null,
            thresholdCents: 2,
            options: {
                referencePitch: 440,
                transposeSemitones: 2,
                notationSystem: "solfege",
            },
        });
        expect(reading.displayNote).toBe("Si");
        expect(reading.octave).toBe(4);
        expect(reading.cents).toBeCloseTo(0, 5);
        expect(reading.tuneState).toBe("inTune");
        expect(writtenNoteLabel("A", 4, { transposeSemitones: 2 })).toBe("B4");
    });

    it("targets the nearest string of the selected tuning", () => {
        const standard = deriveTunerReading({
            frequencyHz: E2,
            instrument: "guitar",
            tuningId: "standard",
            noteLocked: false,
            lockedSoundingMidi: null,
            thresholdCents: 2,
            options: { referencePitch: 440 },
        });
        expect(standard.displayNote).toBe("E");
        expect(standard.octave).toBe(2);
        expect(standard.closest?.string.note).toBe("E");
        expect(standard.tuneState).toBe("inTune");

        const dropD = deriveTunerReading({
            frequencyHz: D2,
            instrument: "guitar",
            tuningId: "drop-d",
            noteLocked: false,
            lockedSoundingMidi: null,
            thresholdCents: 2,
            options: { referencePitch: 440 },
        });
        expect(dropD.displayNote).toBe("D");
        expect(dropD.octave).toBe(2);
        expect(dropD.closest?.string.label).toBe("D");
    });

    it("holds the locked sounding note while the pitch moves", () => {
        const reading = deriveTunerReading({
            frequencyHz: 110,
            instrument: "guitar",
            tuningId: "standard",
            noteLocked: true,
            lockedSoundingMidi: 40,
            thresholdCents: 2,
            options: { referencePitch: 440 },
        });
        expect(reading.displayNote).toBe("E");
        expect(reading.octave).toBe(2);
        expect(reading.cents).toBeGreaterThan(400);
        expect(reading.tuneState).toBe("sharp");
    });

    it("applies temperament to the sounding target", () => {
        const reading = deriveTunerReading({
            frequencyHz: EQUAL_C4,
            instrument: "chromatic",
            tuningId: "default",
            noteLocked: false,
            lockedSoundingMidi: null,
            thresholdCents: 2,
            options: {
                referencePitch: 440,
                temperament: {
                    offsetsCents: [15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                },
            },
        });
        expect(reading.displayNote).toBe("C");
        expect(reading.cents).toBeCloseTo(-15, 4);
        expect(reading.tuneState).toBe("flat");
    });
});
