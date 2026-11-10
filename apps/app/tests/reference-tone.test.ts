import { describe, expect, it } from "vitest";

import { referencePartialFrequencies } from "../src/audio/reference-tone";

describe("reference tone", () => {
    it("adds audible harmonics above a low bass fundamental", () => {
        const bassE = 41.2034;
        const partials = referencePartialFrequencies(bassE);
        expect(partials.length).toBeGreaterThan(4);
        expect(partials[0]).toBeCloseTo(bassE);
        expect(partials.some((partial) => partial > 300)).toBe(true);
        expect(partials.every((partial) => partial <= 12_000)).toBe(true);
    });
});
