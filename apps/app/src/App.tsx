import { useEffect, useRef, useState } from "react";
import { frequencyToNote } from "@wi-tuner/dsp-core";
import { Button } from "@wi-tuner/ui";
import { useTranslation } from "react-i18next";
import { BrowserAudioLifecycleSource } from "./audio/browser-lifecycle";
import { BrowserAudioInputProvider } from "./audio/browser-provider";
import { AudioEngine, type AudioEngineSnapshot } from "./audio/engine";

const reference = frequencyToNote(440);
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

export function App() {
    const { i18n, t } = useTranslation();
    const engineRef = useRef<AudioEngine | null>(null);
    const [audio, setAudio] = useState(INITIAL_AUDIO_SNAPSHOT);
    const [sampleRate, setSampleRate] = useState(48_000);

    useEffect(() => {
        const engine = new AudioEngine(new BrowserAudioInputProvider());
        engineRef.current = engine;
        const unsubscribe = engine.subscribe(setAudio);
        const disconnectLifecycle = engine.connectLifecycle(
            new BrowserAudioLifecycleSource(),
        );
        return () => {
            unsubscribe();
            disconnectLifecycle();
            if (engineRef.current === engine) engineRef.current = null;
            void engine.dispose();
        };
    }, []);

    const isStarting =
        audio.state === "requesting-permission" || audio.state === "recovering";
    const toggleMicrophone = () => {
        const engine = engineRef.current;
        if (!engine) return;
        if (audio.state === "active") void engine.stop();
        else if (audio.state === "error" || audio.state === "suspended")
            void engine.retry({ sampleRate });
        else void engine.start({ sampleRate });
    };

    return (
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-10 text-slate-900">
            <header className="flex items-center justify-between gap-4">
                <a className="text-xl font-bold tracking-tight" href="/">
                    Wi-Tuner
                </a>
                <label className="flex items-center gap-2 text-sm">
                    <span>{t("language")}</span>
                    <select
                        aria-label={t("language")}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2"
                        onChange={(event) => {
                            void i18n.changeLanguage(event.currentTarget.value);
                        }}
                        value={i18n.resolvedLanguage?.slice(0, 2) ?? "en"}
                    >
                        <option value="en">{t("english")}</option>
                        <option value="es">{t("spanish")}</option>
                    </select>
                </label>
            </header>

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-800">
                    {t("phase")}
                </p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">
                    {t("title")}
                </h1>
                <p className="mt-2 text-lg text-slate-600">{t("subtitle")}</p>
                <p className="mt-6 max-w-xl text-slate-700">
                    {t("phaseDescription")}
                </p>
                <p className="mt-8 rounded-xl bg-slate-50 p-4 text-sm">
                    {t("reference")}: <strong>A4 · 440 Hz</strong>
                    {reference ? ` · ${reference.note}${reference.octave}` : ""}
                </p>

                <section
                    aria-labelledby="microphone-heading"
                    className="mt-8 rounded-2xl border border-slate-200 p-5"
                >
                    <h2
                        id="microphone-heading"
                        className="text-lg font-semibold"
                    >
                        {t("microphone")}
                    </h2>
                    <label className="mt-4 flex flex-col gap-2 text-sm font-medium sm:flex-row sm:items-center sm:justify-between">
                        <span>{t("sampleRate")}</span>
                        <select
                            aria-label={t("sampleRate")}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2"
                            disabled={audio.state === "active" || isStarting}
                            onChange={(event) =>
                                setSampleRate(Number(event.currentTarget.value))
                            }
                            value={sampleRate}
                        >
                            <option value={8_000}>8 kHz</option>
                            <option value={16_000}>16 kHz</option>
                            <option value={24_000}>24 kHz</option>
                            <option value={32_000}>32 kHz</option>
                            <option value={44_100}>44.1 kHz</option>
                            <option value={48_000}>48 kHz</option>
                        </select>
                    </label>
                    <p
                        aria-live="polite"
                        className="mt-4 text-sm text-slate-700"
                    >
                        {t(AUDIO_STATE_KEYS[audio.state])}
                    </p>
                    {audio.error && (
                        <p role="alert" className="mt-2 text-sm text-rose-800">
                            {t(AUDIO_ERROR_KEYS[audio.error])}
                        </p>
                    )}
                    {audio.state === "active" && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-600">
                                {t("detectedPitch")}
                            </p>
                            {audio.frame?.note ? (
                                <p className="mt-1 text-3xl font-bold tabular-nums">
                                    {audio.frame.note.displayNote}
                                    {audio.frame.note.octave}
                                    <span className="ml-2 text-base font-medium text-slate-600">
                                        {audio.frame.note.cents > 0 ? "+" : ""}
                                        {audio.frame.note.cents} cents
                                    </span>
                                </p>
                            ) : (
                                <p className="mt-1 text-lg font-medium">
                                    {t("noPitch")}
                                </p>
                            )}
                            {audio.frame && (
                                <p className="mt-2 text-xs text-slate-500">
                                    {audio.frame.sampleRate.toLocaleString()} Hz
                                    ·{" "}
                                    {t("latency", {
                                        value: audio.frame.latencyMs.toFixed(1),
                                    })}
                                </p>
                            )}
                        </div>
                    )}
                    <Button
                        className="mt-5 w-full sm:w-auto"
                        disabled={isStarting}
                        onClick={toggleMicrophone}
                        type="button"
                    >
                        {audio.state === "active"
                            ? t("stopMicrophone")
                            : audio.state === "error" ||
                                audio.state === "suspended"
                              ? t("retry")
                              : t("startMicrophone")}
                    </Button>
                    <p className="mt-3 text-xs text-slate-500">
                        {t("audioPrivacy")}
                    </p>
                </section>

                <Button asChild className="mt-8">
                    <a href={import.meta.env.VITE_LANDING_URL ?? "/"}>
                        {t("openLanding")}
                    </a>
                </Button>
            </section>
        </main>
    );
}
