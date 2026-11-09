import { del, get, set } from "idb-keyval";
import { create } from "zustand";

const STORAGE_KEY = "wi-tuner-preferences";

export interface TunerPreferences {
    instrument: "guitar" | "bass";
    referencePitch: number;
}

const defaults: TunerPreferences = {
    instrument: "guitar",
    referencePitch: 440,
};

interface PreferencesState extends TunerPreferences {
    setInstrument: (instrument: TunerPreferences["instrument"]) => void;
    setReferencePitch: (referencePitch: number) => void;
}

export const usePreferencesStore = create<PreferencesState>((setState) => ({
    ...defaults,
    setInstrument: (instrument) => setState({ instrument }),
    setReferencePitch: (referencePitch) => setState({ referencePitch }),
}));

export async function loadPreferences(): Promise<TunerPreferences> {
    return (await get<TunerPreferences>(STORAGE_KEY)) ?? defaults;
}

export async function savePreferences(
    preferences: TunerPreferences,
): Promise<void> {
    await set(STORAGE_KEY, preferences);
}

export async function clearTunerPreferences(): Promise<void> {
    await del(STORAGE_KEY);
}
