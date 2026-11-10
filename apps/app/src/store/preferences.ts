import {
    INSTRUMENT_PRESETS,
    TEMPERAMENTS,
    createTemperament,
    type InstrumentId,
    type NotationSystem,
    type Subdivision,
    type TemperamentDefinition,
} from "@wi-tuner/dsp-core";
import {
    METRONOME_SOUNDS,
    METRONOME_SUBDIVISIONS,
    resizeAccents,
    type MetronomeSound,
} from "../audio/metronome-engine";
import { Capacitor } from "@capacitor/core";
import { del, get, set } from "idb-keyval";
import { create } from "zustand";

const STORAGE_KEY = "wi-tuner-preferences";
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const NOTATION_SYSTEMS: readonly NotationSystem[] = [
    "solfege",
    "english",
    "english-sharps",
    "english-flats",
    "northern-europe",
];
const ALGORITHM_MODES: readonly AlgorithmMode[] = [
    "fast",
    "balanced",
    "precise",
];
const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];
const LANGUAGES: readonly LanguagePreference[] = ["system", "en", "es"];

export type ThemePreference = "system" | "light" | "dark";
export type LanguagePreference = "system" | "en" | "es";
export type AlgorithmMode = "fast" | "balanced" | "precise";

export interface TunerPreferences {
    instrument: InstrumentId;
    tuningId: string;
    referencePitch: number;
    transposeSemitones: number;
    notationSystem: NotationSystem;
    temperamentId: string;
    customTemperaments: TemperamentDefinition[];
    thresholdCents: number;
    sensitivity: number;
    autoSensitivity: boolean;
    algorithmMode: AlgorithmMode;
    noteLocked: boolean;
    filterLocked: boolean;
    strobeOvertones: number;
    sharpColor: string;
    flatColor: string;
    inTuneColor: string;
    theme: ThemePreference;
    language: LanguagePreference;
    onboardingCompleted: boolean;
    metronomeBpm: number;
    metronomeBeats: number;
    metronomeSubdivision: Subdivision;
    metronomeAccents: boolean[];
    metronomeSound: MetronomeSound;
}

export const TUNER_PALETTES = [
    {
        id: "okabe-ito",
        sharpColor: "#0072B2",
        flatColor: "#E69F00",
        inTuneColor: "#009E73",
    },
    {
        id: "ibm",
        sharpColor: "#648FFF",
        flatColor: "#FE6100",
        inTuneColor: "#785EF0",
    },
    {
        id: "tol-bright",
        sharpColor: "#4477AA",
        flatColor: "#CCBB44",
        inTuneColor: "#228833",
    },
] as const;

export const DEFAULT_TUNER_PREFERENCES: TunerPreferences = {
    instrument: "guitar",
    tuningId: "standard",
    referencePitch: 440,
    transposeSemitones: 0,
    notationSystem: "english",
    temperamentId: "equal",
    customTemperaments: [],
    thresholdCents: 2,
    sensitivity: 0.5,
    autoSensitivity: true,
    algorithmMode: "balanced",
    noteLocked: false,
    filterLocked: false,
    strobeOvertones: 1,
    sharpColor: TUNER_PALETTES[0].sharpColor,
    flatColor: TUNER_PALETTES[0].flatColor,
    inTuneColor: TUNER_PALETTES[0].inTuneColor,
    theme: "system",
    language: "system",
    onboardingCompleted: false,
    metronomeBpm: 120,
    metronomeBeats: 4,
    metronomeSubdivision: 1,
    metronomeAccents: [true, false, false, false],
    metronomeSound: "click",
};

export type TunerPreferencesPatch = Partial<TunerPreferences>;

interface PreferencesState extends TunerPreferences {
    updatePreferences(patch: TunerPreferencesPatch): void;
    replacePreferences(preferences: TunerPreferences): void;
    setInstrument(instrument: InstrumentId): void;
    setReferencePitch(referencePitch: number): void;
}

function persistable(state: TunerPreferences): TunerPreferences {
    return {
        instrument: state.instrument,
        tuningId: state.tuningId,
        referencePitch: state.referencePitch,
        transposeSemitones: state.transposeSemitones,
        notationSystem: state.notationSystem,
        temperamentId: state.temperamentId,
        customTemperaments: state.customTemperaments,
        thresholdCents: state.thresholdCents,
        sensitivity: state.sensitivity,
        autoSensitivity: state.autoSensitivity,
        algorithmMode: state.algorithmMode,
        noteLocked: state.noteLocked,
        filterLocked: state.filterLocked,
        strobeOvertones: state.strobeOvertones,
        sharpColor: state.sharpColor,
        flatColor: state.flatColor,
        inTuneColor: state.inTuneColor,
        theme: state.theme,
        language: state.language,
        onboardingCompleted: state.onboardingCompleted,
        metronomeBpm: state.metronomeBpm,
        metronomeBeats: state.metronomeBeats,
        metronomeSubdivision: state.metronomeSubdivision,
        metronomeAccents: state.metronomeAccents,
        metronomeSound: state.metronomeSound,
    };
}

export function sanitizePreferences(
    saved: Partial<TunerPreferences> | undefined,
): TunerPreferences {
    const candidate = { ...DEFAULT_TUNER_PREFERENCES, ...saved };
    const isInstrument = Object.hasOwn(
        INSTRUMENT_PRESETS,
        candidate.instrument,
    );
    const customTemperaments = Array.isArray(candidate.customTemperaments)
        ? candidate.customTemperaments
              .map((item) => createTemperament(item))
              .filter((item): item is TemperamentDefinition => item !== null)
        : [];
    const customTemperamentIds = new Set(
        customTemperaments.map((item) => item.id),
    );
    const instrument = isInstrument ? candidate.instrument : "guitar";
    return {
        ...DEFAULT_TUNER_PREFERENCES,
        ...candidate,
        instrument,
        tuningId: INSTRUMENT_PRESETS[instrument]?.tunings.some(
            (tuning) => tuning.id === candidate.tuningId,
        )
            ? candidate.tuningId
            : (INSTRUMENT_PRESETS[instrument]?.tunings[0]?.id ?? "standard"),
        referencePitch:
            Number.isFinite(candidate.referencePitch) &&
            candidate.referencePitch >= 392 &&
            candidate.referencePitch <= 500
                ? candidate.referencePitch
                : 440,
        transposeSemitones:
            Number.isInteger(candidate.transposeSemitones) &&
            candidate.transposeSemitones >= -12 &&
            candidate.transposeSemitones <= 12
                ? candidate.transposeSemitones
                : 0,
        notationSystem: NOTATION_SYSTEMS.includes(candidate.notationSystem)
            ? candidate.notationSystem
            : "english",
        temperamentId:
            typeof candidate.temperamentId === "string" &&
            (customTemperamentIds.has(candidate.temperamentId) ||
                Object.hasOwn(TEMPERAMENTS, candidate.temperamentId))
                ? candidate.temperamentId
                : "equal",
        thresholdCents:
            Number.isFinite(candidate.thresholdCents) &&
            candidate.thresholdCents >= 0.5 &&
            candidate.thresholdCents <= 20
                ? candidate.thresholdCents
                : 2,
        sensitivity:
            Number.isFinite(candidate.sensitivity) &&
            candidate.sensitivity >= 0 &&
            candidate.sensitivity <= 1
                ? candidate.sensitivity
                : 0.5,
        autoSensitivity:
            typeof candidate.autoSensitivity === "boolean"
                ? candidate.autoSensitivity
                : true,
        algorithmMode: ALGORITHM_MODES.includes(candidate.algorithmMode)
            ? candidate.algorithmMode
            : "balanced",
        noteLocked:
            typeof candidate.noteLocked === "boolean"
                ? candidate.noteLocked
                : false,
        filterLocked:
            typeof candidate.filterLocked === "boolean"
                ? candidate.filterLocked
                : false,
        strobeOvertones:
            Number.isInteger(candidate.strobeOvertones) &&
            candidate.strobeOvertones >= 1 &&
            candidate.strobeOvertones <= 4
                ? candidate.strobeOvertones
                : 1,
        sharpColor: COLOR_PATTERN.test(candidate.sharpColor)
            ? candidate.sharpColor
            : DEFAULT_TUNER_PREFERENCES.sharpColor,
        flatColor: COLOR_PATTERN.test(candidate.flatColor)
            ? candidate.flatColor
            : DEFAULT_TUNER_PREFERENCES.flatColor,
        inTuneColor: COLOR_PATTERN.test(candidate.inTuneColor)
            ? candidate.inTuneColor
            : DEFAULT_TUNER_PREFERENCES.inTuneColor,
        theme: THEMES.includes(candidate.theme) ? candidate.theme : "system",
        language: LANGUAGES.includes(candidate.language)
            ? candidate.language
            : "system",
        onboardingCompleted:
            typeof candidate.onboardingCompleted === "boolean"
                ? candidate.onboardingCompleted
                : false,
        metronomeBpm:
            Number.isFinite(candidate.metronomeBpm) &&
            candidate.metronomeBpm >= 30 &&
            candidate.metronomeBpm <= 300
                ? candidate.metronomeBpm
                : 120,
        metronomeBeats:
            Number.isInteger(candidate.metronomeBeats) &&
            candidate.metronomeBeats >= 1 &&
            candidate.metronomeBeats <= 16
                ? candidate.metronomeBeats
                : 4,
        metronomeSubdivision: METRONOME_SUBDIVISIONS.includes(
            candidate.metronomeSubdivision,
        )
            ? candidate.metronomeSubdivision
            : 1,
        metronomeAccents: resizeAccents(
            Number.isInteger(candidate.metronomeBeats) &&
                candidate.metronomeBeats >= 1 &&
                candidate.metronomeBeats <= 16
                ? candidate.metronomeBeats
                : 4,
            Array.isArray(candidate.metronomeAccents)
                ? candidate.metronomeAccents.filter(
                      (item): item is boolean => typeof item === "boolean",
                  )
                : [],
        ),
        metronomeSound: METRONOME_SOUNDS.includes(candidate.metronomeSound)
            ? candidate.metronomeSound
            : "click",
        customTemperaments,
    };
}

export const usePreferencesStore = create<PreferencesState>((setState) => ({
    ...DEFAULT_TUNER_PREFERENCES,
    updatePreferences: (patch) => {
        let nextPreferences = DEFAULT_TUNER_PREFERENCES;
        setState((state) => {
            nextPreferences = sanitizePreferences({ ...state, ...patch });
            return nextPreferences;
        });
        void savePreferences(nextPreferences).catch(() => undefined);
    },
    replacePreferences: (preferences) =>
        setState(sanitizePreferences(preferences)),
    setInstrument: (instrument) =>
        usePreferencesStore.getState().updatePreferences({
            instrument,
            tuningId:
                INSTRUMENT_PRESETS[instrument]?.tunings[0]?.id ?? "default",
        }),
    setReferencePitch: (referencePitch) =>
        usePreferencesStore.getState().updatePreferences({ referencePitch }),
}));

function usesNativePreferences(): boolean {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

async function readStoredPreferences(): Promise<
    Partial<TunerPreferences> | undefined
> {
    if (usesNativePreferences()) {
        const { Preferences } = await import("@capacitor/preferences");
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        return value
            ? (JSON.parse(value) as Partial<TunerPreferences>)
            : undefined;
    }
    return get<Partial<TunerPreferences>>(STORAGE_KEY);
}

export async function loadPreferences(): Promise<TunerPreferences> {
    try {
        const saved = await readStoredPreferences();
        // Note lock holds a pitch from the current session, so it never survives reload.
        return sanitizePreferences({ ...saved, noteLocked: false });
    } catch {
        return { ...DEFAULT_TUNER_PREFERENCES };
    }
}

export async function savePreferences(
    preferences: TunerPreferences,
): Promise<void> {
    const stored = persistable(preferences);
    if (usesNativePreferences()) {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.set({
            key: STORAGE_KEY,
            value: JSON.stringify(stored),
        });
        return;
    }
    await set(STORAGE_KEY, stored);
}

export async function clearTunerPreferences(): Promise<void> {
    try {
        if (usesNativePreferences()) {
            const { Preferences } = await import("@capacitor/preferences");
            await Preferences.remove({ key: STORAGE_KEY });
            return;
        }
        await del(STORAGE_KEY);
    } catch {
        /* Storage may be unavailable in private browsing; state still resets. */
    }
}
