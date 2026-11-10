import { beforeEach, describe, expect, it, vi } from "vitest";

const { memory } = vi.hoisted(() => ({
    memory: new Map<string, unknown>(),
}));

vi.mock("idb-keyval", () => ({
    get: async (key: string) => memory.get(key),
    set: async (key: string, value: unknown) => {
        memory.set(key, value);
    },
    del: async (key: string) => {
        memory.delete(key);
    },
}));

import {
    DEFAULT_TUNER_PREFERENCES,
    clearTunerPreferences,
    loadPreferences,
    savePreferences,
    sanitizePreferences,
} from "../src/store/preferences";

describe("tuner preferences", () => {
    beforeEach(() => memory.clear());

    it("defaults to a two-cent threshold and an accessible palette", () => {
        expect(DEFAULT_TUNER_PREFERENCES.thresholdCents).toBe(2);
        expect(DEFAULT_TUNER_PREFERENCES.inTuneColor).toBe("#009E73");
        expect(sanitizePreferences({ thresholdCents: 80 }).thresholdCents).toBe(
            2,
        );
        expect(
            sanitizePreferences({ strobeOvertones: 9 }).strobeOvertones,
        ).toBe(1);
    });

    it("round-trips preferences through idb-keyval and drops a stale note lock", async () => {
        await savePreferences({
            ...DEFAULT_TUNER_PREFERENCES,
            referencePitch: 442,
            language: "es",
            noteLocked: true,
            thresholdCents: 3,
        });
        const loaded = await loadPreferences();
        expect(loaded.referencePitch).toBe(442);
        expect(loaded.language).toBe("es");
        expect(loaded.thresholdCents).toBe(3);
        expect(loaded.noteLocked).toBe(false);
        await clearTunerPreferences();
        expect((await loadPreferences()).referencePitch).toBe(440);
    });
});
