import { describe, expect, it } from "vitest";

import {
    INDEXED_DB_NAME,
    LANGUAGE_STORAGE_KEY,
    eraseAllLocalData,
    type EraseTargets,
} from "../src/store/erase-local-data";
import { SUPPORT_PURCHASE_ENABLED } from "../src/support";

describe("erase all local data", () => {
    it("leaves preferences, IndexedDB, caches, language and custom temperaments empty", async () => {
        const left = {
            preferences: ["wi-tuner-preferences"],
            databases: [INDEXED_DB_NAME, "unrelated"],
            caches: ["wi-tuner-precache", "workbox-runtime"],
            language: "es",
            files: ["young.json", "equal.json", "notes.txt"],
        };
        const targets: EraseTargets = {
            async clearPreferences() {
                left.preferences = [];
            },
            async deleteDatabase(name) {
                left.databases = left.databases.filter((item) => item !== name);
            },
            async cacheNames() {
                return left.caches;
            },
            async deleteCache(name) {
                left.caches = left.caches.filter((item) => item !== name);
            },
            removeLanguage() {
                left.language = "";
            },
            async listTemperamentFiles() {
                return left.files.filter((name) => name.endsWith(".json"));
            },
            async deleteTemperamentFile(name) {
                left.files = left.files.filter((item) => item !== name);
            },
        };

        await eraseAllLocalData(targets);

        expect(left.preferences).toEqual([]);
        expect(left.databases).toEqual(["unrelated"]);
        expect(left.caches).toEqual([]);
        expect(left.language).toBe("");
        expect(left.files).toEqual(["notes.txt"]);
        expect(LANGUAGE_STORAGE_KEY).toBe("wi-tuner-language");
    });
});

describe("support purchase flag", () => {
    it("stays disabled", () => {
        expect(SUPPORT_PURCHASE_ENABLED).toBe(false);
    });
});
