import { beforeEach, describe, expect, it, vi } from "vitest";

const { memory } = vi.hoisted(() => ({
    memory: new Map<string, string>(),
}));

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: () => true },
}));

vi.mock("@capacitor/preferences", () => ({
    Preferences: {
        get: async ({ key }: { key: string }) => ({
            value: memory.get(key) ?? null,
        }),
        set: async ({ key, value }: { key: string; value: string }) => {
            memory.set(key, value);
        },
        remove: async ({ key }: { key: string }) => {
            memory.delete(key);
        },
    },
}));

vi.mock("idb-keyval", () => ({
    get: async () => {
        throw new Error("idb-keyval should stay unused on device");
    },
    set: async () => {
        throw new Error("idb-keyval should stay unused on device");
    },
    del: async () => {
        throw new Error("idb-keyval should stay unused on device");
    },
}));

import {
    DEFAULT_TUNER_PREFERENCES,
    clearTunerPreferences,
    loadPreferences,
    savePreferences,
} from "../src/store/preferences";

describe("native preference storage", () => {
    beforeEach(() => memory.clear());

    it("round-trips settings through Capacitor Preferences", async () => {
        await savePreferences({
            ...DEFAULT_TUNER_PREFERENCES,
            referencePitch: 443,
            noteLocked: true,
        });
        const stored = memory.get("wi-tuner-preferences");
        expect(stored).toContain("443");
        const loaded = await loadPreferences();
        expect(loaded.referencePitch).toBe(443);
        expect(loaded.noteLocked).toBe(false);
        await clearTunerPreferences();
        expect(memory.has("wi-tuner-preferences")).toBe(false);
    });
});
