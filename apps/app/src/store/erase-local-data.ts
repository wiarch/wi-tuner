import { Capacitor } from "@capacitor/core";

import { clearTunerPreferences } from "./preferences";

export const INDEXED_DB_NAME = "keyval-store";
export const LANGUAGE_STORAGE_KEY = "wi-tuner-language";

export interface EraseTargets {
    clearPreferences(): Promise<void>;
    deleteDatabase(name: string): Promise<void>;
    cacheNames(): Promise<readonly string[]>;
    deleteCache(name: string): Promise<void>;
    removeLanguage(): void;
    listTemperamentFiles(): Promise<readonly string[]>;
    deleteTemperamentFile(name: string): Promise<void>;
}

/** Removes every local store. Does not write defaults back. */
export async function eraseAllLocalData(targets: EraseTargets): Promise<void> {
    await targets.clearPreferences();
    await targets.deleteDatabase(INDEXED_DB_NAME);
    const caches = await targets.cacheNames();
    await Promise.all(caches.map((name) => targets.deleteCache(name)));
    const files = await targets.listTemperamentFiles();
    await Promise.all(
        files.map((name) => targets.deleteTemperamentFile(name)),
    );
    targets.removeLanguage();
}

function deleteIndexedDatabase(name: string): Promise<void> {
    if (typeof indexedDB === "undefined") return Promise.resolve();
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
    });
}

export function createBrowserEraseTargets(): EraseTargets {
    return {
        async clearPreferences() {
            await clearTunerPreferences();
            if (!Capacitor.isNativePlatform()) return;
            const { Preferences } = await import("@capacitor/preferences");
            await Preferences.clear();
        },
        deleteDatabase: deleteIndexedDatabase,
        async cacheNames() {
            if (typeof caches === "undefined") return [];
            return caches.keys();
        },
        async deleteCache(name) {
            if (typeof caches === "undefined") return;
            await caches.delete(name);
        },
        removeLanguage() {
            if (typeof localStorage === "undefined") return;
            localStorage.removeItem(LANGUAGE_STORAGE_KEY);
        },
        async listTemperamentFiles() {
            if (!Capacitor.isNativePlatform()) return [];
            const { Directory, Filesystem } = await import(
                "@capacitor/filesystem"
            );
            try {
                const listing = await Filesystem.readdir({
                    path: "",
                    directory: Directory.Cache,
                });
                return listing.files
                    .map((file) => file.name)
                    .filter((name) => name.endsWith(".json"));
            } catch {
                return [];
            }
        },
        async deleteTemperamentFile(name) {
            const { Directory, Filesystem } = await import(
                "@capacitor/filesystem"
            );
            await Filesystem.deleteFile({
                path: name,
                directory: Directory.Cache,
            });
        },
    };
}
