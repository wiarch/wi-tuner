import { describe, expect, it } from "vitest";

import { resources } from "../src/locales";

describe("supported app languages", () => {
    it("provides matching English and Spanish keys", () => {
        expect(Object.keys(resources.en.translation)).toEqual(
            Object.keys(resources.es.translation),
        );
    });
});
