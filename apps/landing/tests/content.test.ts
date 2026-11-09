import { describe, expect, it } from "vitest";

import { landingCopy } from "../src/content";

describe("landing translations", () => {
    it("provides matching English and Spanish content", () => {
        expect(Object.keys(landingCopy.en)).toEqual(
            Object.keys(landingCopy.es),
        );
    });
});
