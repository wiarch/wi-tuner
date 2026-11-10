import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import {
    INSTRUMENT_IDS,
    INSTRUMENT_PRESETS,
    TEMPERAMENTS,
    createTemperament,
    exportTemperament,
    importTemperament,
    noteToFrequency,
    type InstrumentId,
    type TemperamentDefinition,
} from "@wi-tuner/dsp-core";
import {
    Button,
    StrobeDisplay,
    TunerMeter,
    TunerPalette,
    TunerReadout,
    VerticalSensitivitySlider,
} from "@wi-tuner/ui";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { temperamentExchange } from "./files/temperament-device";
import { SupportOffer } from "./support-offer";
import { privacyPolicyUrl } from "./support";
import {
    createBrowserEraseTargets,
    eraseAllLocalData,
} from "./store/erase-local-data";
import { BrowserAudioLifecycleSource } from "./audio/browser-lifecycle";
import { BrowserAudioInputProvider } from "./audio/browser-provider";
import { AudioEngine, type AudioEngineSnapshot } from "./audio/engine";
import { playReferenceTone } from "./audio/reference-tone";
import {
    DEFAULT_TUNER_PREFERENCES,
    TUNER_PALETTES,
    loadPreferences,
    usePreferencesStore,
    type LanguagePreference,
} from "./store/preferences";
import { MetronomeSection } from "./tuner/metronome-panel";
import { OnboardingDialog } from "./tuner/onboarding";
import { deriveTunerReading, writtenNoteLabel } from "./tuner/reading";

const INITIAL_AUDIO_SNAPSHOT: AudioEngineSnapshot = {
    state: "idle",
    error: null,
    frame: null,
    sampleRate: null,
};
const AUDIO_STATE_KEYS = {
    idle: "audioIdle",
    "requesting-permission": "audioRequesting",
    active: "audioActive",
    suspended: "audioSuspended",
    recovering: "audioRecovering",
    error: "audioError",
} as const;
const AUDIO_ERROR_KEYS = {
    "permission-denied": "audioPermissionDenied",
    "no-microphone": "audioNoMicrophone",
    unsupported: "audioUnsupported",
    "device-lost": "audioDeviceLost",
    interrupted: "audioInterrupted",
    unknown: "audioUnknown",
} as const;

function systemLanguage(): "en" | "es" {
    return navigator.languages?.some((language) =>
        language.toLowerCase().startsWith("es"),
    ) || navigator.language.toLowerCase().startsWith("es")
        ? "es"
        : "en";
}

export function App() {
    const { i18n, t } = useTranslation();
    const engineRef = useRef<AudioEngine | null>(null);
    const toneStopRef = useRef<(() => void) | null>(null);
    const [lockedSoundingMidi, setLockedSoundingMidi] = useState<number | null>(
        null,
    );
    const preferences = usePreferencesStore();
    const [audio, setAudio] = useState(INITIAL_AUDIO_SNAPSHOT);
    const [sampleRate, setSampleRate] = useState(48_000);
    const [showSettings, setShowSettings] = useState(false);
    const [confirmErase, setConfirmErase] = useState(false);
    const [onboardingPage, setOnboardingPage] = useState<0 | 1 | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [temperamentJson, setTemperamentJson] = useState("");
    const [temperamentMessage, setTemperamentMessage] = useState<{
        kind: "ok" | "error";
        text: string;
    } | null>(null);
    const [, setToneStop] = useState<(() => void) | null>(null);
    const onboardingDialogRef = useRef<HTMLElement>(null);
    const onboardingOpen = onboardingPage !== null;

    useEffect(() => {
        let mounted = true;
        void loadPreferences().then((loaded) => {
            if (!mounted) return;
            preferences.replacePreferences(loaded);
            if (loaded.language === "system") {
                window.localStorage.removeItem("wi-tuner-language");
                void i18n.changeLanguage(systemLanguage());
            } else void i18n.changeLanguage(loaded.language);
            setHydrated(true);
        });
        const engine = new AudioEngine(new BrowserAudioInputProvider());
        engineRef.current = engine;
        const unsubscribe = engine.subscribe(setAudio);
        const disconnectLifecycle = engine.connectLifecycle(
            new BrowserAudioLifecycleSource(),
        );
        return () => {
            mounted = false;
            unsubscribe();
            disconnectLifecycle();
            if (engineRef.current === engine) engineRef.current = null;
            toneStopRef.current?.();
            void engine.dispose();
        };
        // The engine is intentionally created once; cleanup stops the active reference tone.
    }, []);

    useEffect(() => {
        engineRef.current?.configureDetection({
            sensitivity: preferences.sensitivity,
            autoSensitivity: preferences.autoSensitivity,
            algorithmMode: preferences.algorithmMode,
            filterLocked: preferences.filterLocked,
        });
    }, [
        preferences.sensitivity,
        preferences.autoSensitivity,
        preferences.algorithmMode,
        preferences.filterLocked,
    ]);

    useEffect(() => {
        const root = document.documentElement;
        const dark =
            preferences.theme === "dark" ||
            (preferences.theme === "system" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);
        root.classList.toggle("dark", dark);
        root.style.colorScheme = dark ? "dark" : "light";
    }, [preferences.theme]);

    useEffect(() => {
        if (!onboardingOpen) return;
        const dialog = onboardingDialogRef.current;
        if (!dialog) return;
        const previousFocus =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const focusable = () =>
            Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((element) => !element.hasAttribute("disabled"));
        focusable()[0]?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setOnboardingPage(null);
                return;
            }
            if (event.key !== "Tab") return;
            const elements = focusable();
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            previousFocus?.focus();
        };
    }, [onboardingOpen]);

    useEffect(() => {
        if (!onboardingOpen) return;
        const dialog = onboardingDialogRef.current;
        const buttons = dialog?.querySelectorAll<HTMLButtonElement>("button");
        const primary = buttons?.[buttons.length - 1];
        primary?.focus();
    }, [onboardingOpen, onboardingPage]);

    const frame = audio.frame;
    const rawHz = frame?.estimate?.frequency ?? null;
    const options = useMemo(() => {
        const temperament =
            preferences.customTemperaments.find(
                (item) => item.id === preferences.temperamentId,
            ) ??
            TEMPERAMENTS[preferences.temperamentId] ??
            TEMPERAMENTS.equal!;
        return {
            referencePitch: preferences.referencePitch,
            transposeSemitones: preferences.transposeSemitones,
            notationSystem: preferences.notationSystem,
            temperament,
        };
    }, [
        preferences.referencePitch,
        preferences.transposeSemitones,
        preferences.notationSystem,
        preferences.temperamentId,
        preferences.customTemperaments,
    ]);
    const reading = deriveTunerReading({
        frequencyHz: rawHz,
        instrument: preferences.instrument,
        tuningId: preferences.tuningId,
        noteLocked: preferences.noteLocked,
        lockedSoundingMidi,
        thresholdCents: preferences.thresholdCents,
        options,
    });
    useEffect(() => {
        if (!preferences.noteLocked) {
            setLockedSoundingMidi(null);
            return;
        }
        if (lockedSoundingMidi === null && reading.soundingMidi !== null)
            setLockedSoundingMidi(reading.soundingMidi);
    }, [preferences.noteLocked, lockedSoundingMidi, reading.soundingMidi]);
    const cents = reading.cents;
    const tuneState = reading.tuneState;
    const inTune = tuneState === "inTune";
    const centsLabel =
        cents === null ? "" : `${cents > 0 ? "+" : ""}${cents.toFixed(1)} ¢`;
    const instrument = INSTRUMENT_PRESETS[preferences.instrument];
    const tuning =
        instrument.tunings.find((item) => item.id === preferences.tuningId) ??
        instrument.tunings[0];
    const openString = tuning?.strings[0];
    const referenceTarget =
        reading.targetHz ??
        (openString
            ? noteToFrequency(openString.note, openString.octave, {
                  ...options,
                  transposeSemitones: 0,
              })
            : preferences.referencePitch);
    const referenceLabel =
        reading.displayNote !== null && reading.octave !== null
            ? `${reading.displayNote}${reading.octave}`
            : openString
              ? (writtenNoteLabel(
                    openString.note,
                    openString.octave,
                    options,
                ) ?? "A4")
              : "A4";
    const isStarting =
        audio.state === "requesting-permission" || audio.state === "recovering";

    const startMicrophone = () => {
        if (!preferences.onboardingCompleted) {
            setOnboardingPage(0);
            return;
        }
        void engineRef.current?.start({ sampleRate });
    };
    const toggleMicrophone = () => {
        const engine = engineRef.current;
        if (!engine) return;
        if (audio.state === "active") void engine.stop();
        else if (audio.state === "error" || audio.state === "suspended")
            void engine.retry({ sampleRate });
        else startMicrophone();
    };
    const playTube = () => {
        toneStopRef.current?.();
        const stop = playReferenceTone(
            referenceTarget ?? preferences.referencePitch,
        );
        toneStopRef.current = stop;
        setToneStop(() => stop);
        window.setTimeout(() => {
            stop();
            if (toneStopRef.current === stop) {
                toneStopRef.current = null;
                setToneStop(null);
            }
        }, 2_800);
    };
    const changeLanguage = (language: typeof preferences.language) => {
        preferences.updatePreferences({ language });
        if (language === "system")
            window.localStorage.removeItem("wi-tuner-language");
        void i18n.changeLanguage(
            language === "system" ? systemLanguage() : language,
        );
    };
    const updateCustomTemperament = (json: string) => {
        const imported = importTemperament(json);
        if (!imported) return false;
        const custom = [
            ...preferences.customTemperaments.filter(
                (item) => item.id !== imported.id,
            ),
            imported,
        ];
        preferences.updatePreferences({
            customTemperaments: custom,
            temperamentId: imported.id,
        });
        setTemperamentJson(exportTemperament(imported));
        return true;
    };
    const importTemperamentJson = () => {
        const saved = updateCustomTemperament(temperamentJson);
        setTemperamentMessage({
            kind: saved ? "ok" : "error",
            text: saved ? t("temperamentSaved") : t("temperamentInvalid"),
        });
    };
    const createCustomTemperament = () => {
        const definition = createTemperament({
            id: `custom-${Date.now().toString(36)}`,
            name: t("newTemperamentName"),
            offsetsCents: Array(12).fill(0),
        });
        if (!definition) return;
        setTemperamentJson(exportTemperament(definition));
        setTemperamentMessage({
            kind: "ok",
            text: t("temperamentTemplateReady"),
        });
    };
    const selectTemperament = (temperamentId: string) => {
        preferences.updatePreferences({ temperamentId });
        const custom = preferences.customTemperaments.find(
            (item) => item.id === temperamentId,
        );
        if (custom) {
            setTemperamentJson(exportTemperament(custom));
            setTemperamentMessage(null);
        }
    };
    const deleteCustomTemperament = () => {
        const selected = preferences.customTemperaments.find(
            (item) => item.id === preferences.temperamentId,
        );
        if (!selected) return;
        preferences.updatePreferences({
            customTemperaments: preferences.customTemperaments.filter(
                (item) => item.id !== selected.id,
            ),
            temperamentId: "equal",
        });
        setTemperamentJson("");
        setTemperamentMessage({ kind: "ok", text: t("temperamentDeleted") });
    };
    const resetPalette = () =>
        preferences.updatePreferences({
            sharpColor: DEFAULT_TUNER_PREFERENCES.sharpColor,
            flatColor: DEFAULT_TUNER_PREFERENCES.flatColor,
            inTuneColor: DEFAULT_TUNER_PREFERENCES.inTuneColor,
        });
    const selectedCustomTemperament = preferences.customTemperaments.find(
        (item) => item.id === preferences.temperamentId,
    );
    const tunerCardStyle = {
        "--tune-color": preferences.inTuneColor,
    } as CSSProperties;

    return (
        <main className="app-shell mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <a className="text-xl font-bold tracking-tight" href="/">
                    Wi-Tuner
                </a>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="language-select">
                        {t("language")}
                    </label>
                    <select
                        id="language-select"
                        className="control"
                        value={preferences.language}
                        onChange={(event) =>
                            changeLanguage(
                                event.currentTarget
                                    .value as typeof preferences.language,
                            )
                        }
                    >
                        <option value="system">{t("systemLanguage")}</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                    </select>
                    <Button
                        onClick={() => setShowSettings((value) => !value)}
                        aria-expanded={showSettings}
                    >
                        {showSettings ? t("closeSettings") : t("settings")}
                    </Button>
                </div>
            </header>

            <section
                className={`tuner-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8${
                    inTune ? " is-in-tune" : ""
                }`}
                style={tunerCardStyle}
                data-tune-state={tuneState}
                aria-label={t("tunerTitle")}
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-sky-800">
                            {t("tunerTitle")}
                        </p>
                        <h1 className="mt-1 text-2xl font-bold">
                            {t("subtitle")}
                        </h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <label className="sr-only" htmlFor="instrument">
                            {t("instrument")}
                        </label>
                        <select
                            id="instrument"
                            className="control"
                            value={preferences.instrument}
                            onChange={(e) =>
                                preferences.setInstrument(
                                    e.currentTarget.value as InstrumentId,
                                )
                            }
                        >
                            {INSTRUMENT_IDS.map((id) => (
                                <option key={id} value={id}>
                                    {t(`instrument_${id}`)}
                                </option>
                            ))}
                        </select>
                        {tuning && (
                            <>
                                <label className="sr-only" htmlFor="tuning">
                                    {t("tuning")}
                                </label>
                                <select
                                    id="tuning"
                                    className="control"
                                    value={tuning.id}
                                    onChange={(e) =>
                                        preferences.updatePreferences({
                                            tuningId: e.currentTarget.value,
                                        })
                                    }
                                >
                                    {instrument.tunings.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                    </div>
                </div>

                <TunerReadout
                    className="mt-5"
                    note={reading.displayNote}
                    octave={reading.octave}
                    frequencyHz={reading.frequencyHz}
                    cents={reading.cents}
                    inTune={inTune}
                    labels={{
                        note: t("note"),
                        octave: t("octave"),
                        frequency: t("frequency"),
                        deviation: t("deviation"),
                    }}
                />
                <TunerMeter
                    cents={cents}
                    thresholdCents={preferences.thresholdCents}
                    colors={{
                        sharp: preferences.sharpColor,
                        flat: preferences.flatColor,
                        inTune: preferences.inTuneColor,
                    }}
                    label={t("deviationMeter")}
                />
                <p className="sr-only" role="status" aria-live="polite">
                    {tuneState === "idle" ? t("playNote") : t(tuneState)}
                </p>
                <p
                    className={`tune-status mx-auto mt-2 flex w-fit items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold${
                        inTune ? " is-in-tune" : ""
                    }`}
                >
                    <span aria-hidden="true">
                        {tuneState === "inTune"
                            ? "✓"
                            : tuneState === "sharp"
                              ? "↑"
                              : tuneState === "flat"
                                ? "↓"
                                : "♪"}
                    </span>
                    {tuneState === "inTune"
                        ? t("inTune")
                        : tuneState === "idle"
                          ? t("playNote")
                          : `${t(tuneState)} · ${centsLabel}`}
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">{t("strobe")}</h2>
                            <span className="text-xs text-slate-500">
                                {t("strobe60")}
                            </span>
                        </div>
                        <StrobeDisplay
                            cents={cents}
                            frequencyHz={reading.frequencyHz}
                            overtones={preferences.strobeOvertones}
                            color={
                                tuneState === "inTune"
                                    ? preferences.inTuneColor
                                    : tuneState === "flat"
                                      ? preferences.flatColor
                                      : tuneState === "sharp"
                                        ? preferences.sharpColor
                                        : "#334155"
                            }
                            label={t("strobeDescription")}
                        />
                        <fieldset className="mt-2">
                            <legend className="text-sm">
                                {t("overtones")}
                            </legend>
                            <div className="mt-1 flex gap-2">
                                {[1, 2, 3, 4].map((count) => (
                                    <label
                                        key={count}
                                        className={`overtone-option${
                                            preferences.strobeOvertones ===
                                            count
                                                ? " is-selected"
                                                : ""
                                        }`}
                                    >
                                        <input
                                            className="sr-only"
                                            type="radio"
                                            name="strobe-overtones"
                                            value={count}
                                            checked={
                                                preferences.strobeOvertones ===
                                                count
                                            }
                                            onChange={() =>
                                                preferences.updatePreferences({
                                                    strobeOvertones: count,
                                                })
                                            }
                                        />
                                        <span aria-hidden="true">{count}</span>
                                        <span className="sr-only">
                                            {t("overtonesCount", { count })}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </div>
                    <div className="sensitivity-panel">
                        <VerticalSensitivitySlider
                            value={preferences.sensitivity}
                            label={t("sensitivity")}
                            lowLabel={t("low")}
                            highLabel={t("high")}
                            disabled={preferences.autoSensitivity}
                            onChange={(sensitivity) =>
                                preferences.updatePreferences({ sensitivity })
                            }
                        />
                        <label className="mt-2 flex max-w-24 items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={preferences.autoSensitivity}
                                onChange={(e) =>
                                    preferences.updatePreferences({
                                        autoSensitivity:
                                            e.currentTarget.checked,
                                    })
                                }
                            />
                            {t("automatic")}
                        </label>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={preferences.noteLocked}
                            onChange={(e) => {
                                const noteLocked = e.currentTarget.checked;
                                setLockedSoundingMidi(
                                    noteLocked ? reading.soundingMidi : null,
                                );
                                preferences.updatePreferences({ noteLocked });
                            }}
                        />
                        {t("lockNote")}
                    </label>
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={preferences.filterLocked}
                            onChange={(e) =>
                                preferences.updatePreferences({
                                    filterLocked: e.currentTarget.checked,
                                })
                            }
                        />
                        {t("lockFilter")}
                    </label>
                    {!preferences.noteLocked && reading.closest && (
                        <p className="text-sm">
                            {t("closestString", {
                                string: reading.closest.string.label,
                                cents: `${reading.closest.cents > 0 ? "+" : ""}${reading.closest.cents.toFixed(1)}`,
                            })}
                        </p>
                    )}
                    <Button onClick={playTube}>
                        {t("playReference", { note: referenceLabel })}
                    </Button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
                    <Button onClick={toggleMicrophone} disabled={isStarting}>
                        {audio.state === "active"
                            ? t("stopMicrophone")
                            : audio.state === "error" ||
                                audio.state === "suspended"
                              ? t("retry")
                              : t("startMicrophone")}
                    </Button>
                    <label className="flex items-center gap-2 text-sm">
                        <span>{t("sampleRate")}</span>
                        <select
                            className="control"
                            disabled={audio.state === "active" || isStarting}
                            value={sampleRate}
                            onChange={(e) =>
                                setSampleRate(Number(e.currentTarget.value))
                            }
                        >
                            {[8000, 16000, 24000, 32000, 44100, 48000].map(
                                (rate) => (
                                    <option key={rate} value={rate}>
                                        {rate / 1000} kHz
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                    <span aria-live="polite" className="text-sm">
                        {t(AUDIO_STATE_KEYS[audio.state])}
                    </span>
                    {audio.error && (
                        <p
                            role="alert"
                            className="w-full text-sm text-rose-800"
                        >
                            {t(AUDIO_ERROR_KEYS[audio.error])}
                        </p>
                    )}
                    <p className="w-full text-xs text-slate-500">
                        {t("audioPrivacy")}
                        {frame
                            ? ` · ${t("latency", { value: frame.latencyMs.toFixed(1) })}`
                            : ""}
                    </p>
                </div>
            </section>

            <MetronomeSection />

            {showSettings && (
                <SettingsPanel
                    t={t}
                    preferences={preferences}
                    json={temperamentJson}
                    setJson={setTemperamentJson}
                    message={temperamentMessage}
                    language={preferences.language}
                    onLanguageChange={changeLanguage}
                    onImport={importTemperamentJson}
                    onCreate={createCustomTemperament}
                    onDelete={deleteCustomTemperament}
                    onTemperamentChange={selectTemperament}
                    canDeleteTemperament={Boolean(selectedCustomTemperament)}
                    onResetPalette={resetPalette}
                    onJsonFile={async (file) => {
                        try {
                            setTemperamentJson(
                                await temperamentExchange.importDocument(file),
                            );
                        } catch {
                            setTemperamentMessage({
                                kind: "error",
                                text: t("temperamentInvalid"),
                            });
                        }
                    }}
                    onExport={() => {
                        const temperament =
                            preferences.customTemperaments.find(
                                (item) => item.id === preferences.temperamentId,
                            ) ??
                            TEMPERAMENTS[preferences.temperamentId] ??
                            TEMPERAMENTS.equal!;
                        const json = exportTemperament(temperament);
                        setTemperamentJson(json);
                        void temperamentExchange
                            .exportDocument(`${temperament.id}.json`, json)
                            .catch(() => {
                                setTemperamentMessage({
                                    kind: "error",
                                    text: t("temperamentInvalid"),
                                });
                            });
                    }}
                    onClear={() => setConfirmErase(true)}
                />
            )}

            {confirmErase && (
                <div className="modal-backdrop">
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="erase-title"
                        aria-describedby="erase-description"
                        className="modal-card"
                    >
                        <h2 id="erase-title" className="text-xl font-bold">
                            {t("clearDataTitle")}
                        </h2>
                        <p id="erase-description" className="my-4">
                            {t("clearDataBody")}
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setConfirmErase(false)}>
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={() => {
                                    void (async () => {
                                        await i18n.changeLanguage(
                                            systemLanguage(),
                                        );
                                        await eraseAllLocalData(
                                            createBrowserEraseTargets(),
                                        );
                                        preferences.replacePreferences(
                                            DEFAULT_TUNER_PREFERENCES,
                                        );
                                        setTemperamentJson("");
                                        setConfirmErase(false);
                                    })();
                                }}
                            >
                                {t("clearDataConfirmAction")}
                            </Button>
                        </div>
                    </section>
                </div>
            )}

            {onboardingPage !== null && (
                <div className="modal-backdrop">
                    <OnboardingDialog
                        page={onboardingPage}
                        dialogRef={onboardingDialogRef}
                        title={
                            onboardingPage === 0
                                ? t("onboardingTitle")
                                : t("privacyTitle")
                        }
                        description={t(
                            onboardingPage === 0
                                ? "onboardingBody"
                                : "privacyBody",
                        )}
                        cancelLabel={t("cancel")}
                        nextLabel={t("next")}
                        continueLabel={t("continueMicrophone")}
                        onCancel={() => setOnboardingPage(null)}
                        onNext={() => setOnboardingPage(1)}
                        onContinue={() => {
                            preferences.updatePreferences({
                                onboardingCompleted: true,
                            });
                            setOnboardingPage(null);
                            void engineRef.current?.start({ sampleRate });
                        }}
                    />
                </div>
            )}
            <footer className="text-center text-xs text-slate-500">
                Wi-Tuner ·{" "}
                {hydrated ? t("localStorage") : t("loadingPreferences")}
            </footer>
        </main>
    );
}

function SettingsPanel({
    t,
    preferences,
    json,
    setJson,
    message,
    language,
    onLanguageChange,
    onImport,
    onCreate,
    onDelete,
    onTemperamentChange,
    canDeleteTemperament,
    onResetPalette,
    onExport,
    onJsonFile,
    onClear,
}: {
    t: TFunction;
    preferences: ReturnType<typeof usePreferencesStore.getState>;
    json: string;
    setJson(value: string): void;
    message: { kind: "ok" | "error"; text: string } | null;
    language: LanguagePreference;
    onLanguageChange(language: LanguagePreference): void;
    onImport(): void;
    onCreate(): void;
    onDelete(): void;
    onTemperamentChange(temperamentId: string): void;
    canDeleteTemperament: boolean;
    onResetPalette(): void;
    onExport(): void;
    onJsonFile(file: File): Promise<void>;
    onClear(): void;
}) {
    const availableTemperaments: TemperamentDefinition[] = [
        ...Object.values(TEMPERAMENTS),
        ...preferences.customTemperaments,
    ];
    return (
        <section
            className="settings-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
            aria-labelledby="settings-title"
        >
            <h2 id="settings-title" className="text-xl font-bold">
                {t("settings")}
            </h2>
            <div className="settings-grid mt-4">
                <Field label={t("referencePitch")}>
                    <input
                        className="control"
                        type="number"
                        min="392"
                        max="500"
                        step="0.1"
                        value={preferences.referencePitch}
                        onChange={(e) =>
                            preferences.setReferencePitch(
                                Number(e.currentTarget.value),
                            )
                        }
                    />
                </Field>
                <Field label={t("transpose")}>
                    <input
                        className="control"
                        type="number"
                        min="-12"
                        max="12"
                        value={preferences.transposeSemitones}
                        onChange={(e) =>
                            preferences.updatePreferences({
                                transposeSemitones: Number(
                                    e.currentTarget.value,
                                ),
                            })
                        }
                    />
                </Field>
                <Field label={t("notation")}>
                    <select
                        className="control"
                        value={preferences.notationSystem}
                        onChange={(e) =>
                            preferences.updatePreferences({
                                notationSystem: e.currentTarget
                                    .value as typeof preferences.notationSystem,
                            })
                        }
                    >
                        <option value="solfege">{t("notation_solfege")}</option>
                        <option value="english">{t("notation_english")}</option>
                        <option value="english-sharps">
                            {t("notation_sharps")}
                        </option>
                        <option value="english-flats">
                            {t("notation_flats")}
                        </option>
                        <option value="northern-europe">
                            {t("notation_northern")}
                        </option>
                    </select>
                </Field>
                <Field label={t("language")}>
                    <select
                        className="control"
                        value={language}
                        onChange={(e) =>
                            onLanguageChange(
                                e.currentTarget.value as LanguagePreference,
                            )
                        }
                    >
                        <option value="system">{t("systemLanguage")}</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                    </select>
                </Field>
                <Field label={t("temperament")}>
                    <select
                        className="control"
                        value={preferences.temperamentId}
                        onChange={(e) =>
                            onTemperamentChange(e.currentTarget.value)
                        }
                    >
                        {availableTemperaments.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={t("threshold")}>
                    <input
                        className="control"
                        type="number"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={preferences.thresholdCents}
                        onChange={(e) =>
                            preferences.updatePreferences({
                                thresholdCents: Number(e.currentTarget.value),
                            })
                        }
                    />
                </Field>
                <Field label={t("algorithm")}>
                    <select
                        className="control"
                        value={preferences.algorithmMode}
                        onChange={(e) =>
                            preferences.updatePreferences({
                                algorithmMode: e.currentTarget
                                    .value as typeof preferences.algorithmMode,
                            })
                        }
                    >
                        <option value="fast">{t("fast")}</option>
                        <option value="balanced">{t("balanced")}</option>
                        <option value="precise">{t("precise")}</option>
                    </select>
                </Field>
                <Field label={t("sensitivityMode")}>
                    <select
                        className="control"
                        value={preferences.autoSensitivity ? "auto" : "manual"}
                        onChange={(e) =>
                            preferences.updatePreferences({
                                autoSensitivity:
                                    e.currentTarget.value === "auto",
                            })
                        }
                    >
                        <option value="auto">{t("automatic")}</option>
                        <option value="manual">{t("manual")}</option>
                    </select>
                </Field>
                <Field label={t("theme")}>
                    <select
                        className="control"
                        value={preferences.theme}
                        onChange={(e) =>
                            preferences.updatePreferences({
                                theme: e.currentTarget
                                    .value as typeof preferences.theme,
                            })
                        }
                    >
                        <option value="system">{t("system")}</option>
                        <option value="light">{t("light")}</option>
                        <option value="dark">{t("dark")}</option>
                    </select>
                </Field>
                <div className="sm:col-span-2">
                    <TunerPalette
                        groupLabel={t("palette")}
                        value={{
                            sharp: preferences.sharpColor,
                            flat: preferences.flatColor,
                            inTune: preferences.inTuneColor,
                        }}
                        options={TUNER_PALETTES.map((palette) => ({
                            id: palette.id,
                            label:
                                palette.id === "okabe-ito"
                                    ? t("paletteOkabe")
                                    : palette.id === "ibm"
                                      ? t("paletteIbm")
                                      : t("paletteTol"),
                            colors: {
                                sharp: palette.sharpColor,
                                flat: palette.flatColor,
                                inTune: palette.inTuneColor,
                            },
                        }))}
                        onChange={(colors) =>
                            preferences.updatePreferences({
                                sharpColor: colors.sharp,
                                flatColor: colors.flat,
                                inTuneColor: colors.inTune,
                            })
                        }
                    />
                </div>
                <ColorField
                    label={t("sharpColor")}
                    value={preferences.sharpColor}
                    onChange={(sharpColor) =>
                        preferences.updatePreferences({ sharpColor })
                    }
                />
                <ColorField
                    label={t("flatColor")}
                    value={preferences.flatColor}
                    onChange={(flatColor) =>
                        preferences.updatePreferences({ flatColor })
                    }
                />
                <ColorField
                    label={t("inTuneColor")}
                    value={preferences.inTuneColor}
                    onChange={(inTuneColor) =>
                        preferences.updatePreferences({ inTuneColor })
                    }
                />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="max-w-xl text-xs text-slate-500">
                    {t("paletteHelp")}
                </p>
                <Button onClick={onResetPalette}>{t("resetPalette")}</Button>
            </div>
            <div className="mt-5">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={preferences.autoSensitivity}
                        onChange={(e) =>
                            preferences.updatePreferences({
                                autoSensitivity: e.currentTarget.checked,
                            })
                        }
                    />
                    {t("automaticSensitivity")}
                </label>
                <p className="mt-1 text-xs text-slate-500">
                    {t("sensitivityModeHelp")}
                </p>
            </div>
            <section className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="font-semibold">{t("customTemperaments")}</h3>
                <p
                    id="temperament-help"
                    className="my-2 text-sm text-slate-600"
                >
                    {t("customTemperamentsHelp")}
                </p>
                <label className="sr-only" htmlFor="temperament-json">
                    {t("temperamentJson")}
                </label>
                <textarea
                    id="temperament-json"
                    className="control min-h-36 w-full font-mono text-xs"
                    value={json}
                    aria-describedby="temperament-help temperament-status"
                    onChange={(e) => setJson(e.currentTarget.value)}
                    placeholder={t("temperamentPlaceholder")}
                />
                {message && (
                    <p
                        id="temperament-status"
                        role="status"
                        className={`mt-2 text-sm font-semibold ${
                            message.kind === "ok"
                                ? "text-emerald-800"
                                : "text-rose-800"
                        }`}
                    >
                        {message.text}
                    </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                    <Button onClick={onCreate}>{t("createTemperament")}</Button>
                    <Button onClick={onImport}>{t("importTemperament")}</Button>
                    <Button onClick={onExport}>{t("exportTemperament")}</Button>
                    {canDeleteTemperament && (
                        <Button onClick={onDelete}>
                            {t("deleteTemperament")}
                        </Button>
                    )}
                    <label className="control cursor-pointer">
                        {t("chooseJson")}
                        <input
                            className="sr-only"
                            type="file"
                            accept="application/json,.json"
                            onChange={(e) => {
                                const file = e.currentTarget.files?.[0];
                                e.currentTarget.value = "";
                                if (file) void onJsonFile(file);
                            }}
                        />
                    </label>
                </div>
            </section>
            <div className="mt-6 border-t border-slate-200 pt-4">
                    <p className="mt-4 text-sm">{t("privacySummary")}</p>
                    <p className="mt-2">
                        <a
                            className="underline"
                            href={privacyPolicyUrl(language)}
                        >
                            {t("privacyPolicy")}
                        </a>
                    </p>
                    <SupportOffer />
                    <Button onClick={onClear}>{t("clearData")}</Button>
            </div>
        </section>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="field">
            <span>{label}</span>
            {children}
        </label>
    );
}
function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange(value: string): void;
}) {
    return (
        <Field label={label}>
            <input
                aria-label={label}
                className="control h-10 w-full p-1"
                type="color"
                value={value}
                onChange={(e) => onChange(e.currentTarget.value)}
            />
        </Field>
    );
}
