import { describe, expect, it } from "vitest";

import {
    centsBetween,
    detectPitch,
    frequencyToNote,
    getTuningPreset,
    noteToFrequency,
} from "../src";

describe("musical frequency helpers", () => {
    it("maps the A4 reference to A4", () => {
        expect(frequencyToNote(440)).toMatchObject({
            note: "A",
            octave: 4,
            cents: 0,
        });
    });

    it("supports alternate reference pitch and tunings", () => {
        expect(frequencyToNote(442, 442)?.note).toBe("A");
        expect(noteToFrequency("A", 4, 442)).toBeCloseTo(442);
        expect(
            getTuningPreset("guitar", "drop-d").strings.map(
                (string) => string.note + string.octave,
            ),
        ).toEqual(["D2", "A2", "D3", "G3", "B3", "E4"]);
    });

    it("rejects invalid inputs and silence", () => {
        expect(frequencyToNote(0)).toBeNull();
        expect(noteToFrequency("H", 4)).toBeNull();
        expect(centsBetween(-1, 440)).toBeNull();
        expect(detectPitch(new Float32Array(1024), 48_000)).toBeNull();
    });

    it("calculates a cents offset", () => {
        expect(centsBetween(440 * 2 ** (10 / 1200), 440)).toBeCloseTo(10);
    });
});
