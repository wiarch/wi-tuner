import { useEffect, useRef, useState } from "react";
import type { Subdivision } from "@wi-tuner/dsp-core";
import { Button } from "@wi-tuner/ui";
import { useTranslation } from "react-i18next";

import { WebMetronomeOutput } from "../audio/metronome-output";
import {
    METRONOME_SOUNDS,
    METRONOME_SUBDIVISIONS,
    MetronomeConductor,
    resizeAccents,
    type MetronomeSettings,
    type MetronomeSound,
} from "../audio/metronome-engine";
import { usePreferencesStore } from "../store/preferences";

export function MetronomePanel({
    bpm,
    beats,
    subdivision,
    accents,
    sound,
    running,
    beatIndex,
    pulse,
    onBpm,
    onBeats,
    onSubdivision,
    onAccent,
    onSound,
    onToggle,
    onTap,
}: {
    bpm: number;
    beats: number;
    subdivision: Subdivision;
    accents: readonly boolean[];
    sound: MetronomeSound;
    running: boolean;
    beatIndex: number | null;
    pulse: number;
    onBpm(bpm: number): void;
    onBeats(beats: number): void;
    onSubdivision(subdivision: Subdivision): void;
    onAccent(index: number, accent: boolean): void;
    onSound(sound: MetronomeSound): void;
    onToggle(): void;
    onTap(): void;
}) {
    const { t } = useTranslation();
    return (
        <section
            className="metronome-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
            aria-labelledby="metronome-title"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="metronome-title" className="text-xl font-bold">
                    {t("metronome")}
                </h2>
                <Button onClick={onToggle} aria-pressed={running}>
                    {running ? t("metronomeStop") : t("metronomeStart")}
                </Button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{t("metronomeHint")}</p>
            <div
                className="metro-lamps mt-4"
                role="group"
                aria-label={t("pulse")}
                data-running={running ? "true" : "false"}
            >
                {accents.map((accent, index) => {
                    const current = running && beatIndex === index;
                    return (
                        <span
                            key={`${index}-${current ? pulse : "idle"}`}
                            className={`metro-lamp${accent ? " is-accent" : ""}${current ? " is-current" : ""}`}
                            aria-current={current ? "true" : undefined}
                            aria-label={t("accentBeat", { beat: index + 1 })}
                        />
                    );
                })}
            </div>
            <div className="settings-grid mt-4">
                <label className="field">
                    <span>{t("bpm")}</span>
                    <input
                        className="control"
                        type="number"
                        min={30}
                        max={300}
                        step={1}
                        value={bpm}
                        onChange={(event) =>
                            onBpm(Number(event.currentTarget.value))
                        }
                    />
                </label>
                <label className="field">
                    <span>{t("beats")}</span>
                    <input
                        className="control"
                        type="number"
                        min={1}
                        max={16}
                        step={1}
                        value={beats}
                        onChange={(event) =>
                            onBeats(Number(event.currentTarget.value))
                        }
                    />
                </label>
                <label className="field">
                    <span>{t("subdivision")}</span>
                    <select
                        className="control"
                        value={subdivision}
                        onChange={(event) =>
                            onSubdivision(
                                Number(
                                    event.currentTarget.value,
                                ) as Subdivision,
                            )
                        }
                    >
                        {METRONOME_SUBDIVISIONS.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>{t("metronomeSound")}</span>
                    <select
                        className="control"
                        value={sound}
                        onChange={(event) =>
                            onSound(event.currentTarget.value as MetronomeSound)
                        }
                    >
                        {METRONOME_SOUNDS.map((value) => (
                            <option key={value} value={value}>
                                {t(`sound_${value}`)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <fieldset className="mt-4">
                <legend className="text-sm font-semibold">
                    {t("accents")}
                </legend>
                <div className="mt-2 flex flex-wrap gap-3">
                    {accents.map((accent, index) => (
                        <label
                            key={index}
                            className="inline-flex items-center gap-2"
                        >
                            <input
                                type="checkbox"
                                checked={accent}
                                onChange={(event) =>
                                    onAccent(index, event.currentTarget.checked)
                                }
                            />
                            {t("accentBeat", { beat: index + 1 })}
                        </label>
                    ))}
                </div>
            </fieldset>
            <div className="mt-4">
                <Button onClick={onTap}>{t("tapTempo")}</Button>
            </div>
        </section>
    );
}

function settingsFromPreferences(): MetronomeSettings {
    const preferences = usePreferencesStore.getState();
    return {
        bpm: preferences.metronomeBpm,
        beatsPerBar: preferences.metronomeBeats,
        subdivision: preferences.metronomeSubdivision,
        accents: preferences.metronomeAccents,
    };
}

export function MetronomeSection() {
    const preferences = usePreferencesStore();
    const outputRef = useRef<WebMetronomeOutput | null>(null);
    const conductorRef = useRef<MetronomeConductor | null>(null);
    const [running, setRunning] = useState(false);
    const [beatIndex, setBeatIndex] = useState<number | null>(null);
    const [pulse, setPulse] = useState(0);

    useEffect(() => {
        const output = new WebMetronomeOutput((tick) => {
            if (tick.subdivisionIndex !== 0) return;
            setBeatIndex(tick.beatIndex);
            setPulse((value) => value + 1);
        });
        output.sound = usePreferencesStore.getState().metronomeSound;
        const conductor = new MetronomeConductor(
            {
                audioNow: () => output.audioNow(),
                setInterval: (callback, intervalMs) =>
                    window.setInterval(callback, intervalMs),
                clearInterval: (id) => window.clearInterval(id as number),
            },
            output,
            settingsFromPreferences(),
        );
        outputRef.current = output;
        conductorRef.current = conductor;
        return () => {
            conductor.stop();
            output.dispose();
            if (outputRef.current === output) outputRef.current = null;
            if (conductorRef.current === conductor) conductorRef.current = null;
        };
    }, []);

    useEffect(() => {
        const output = outputRef.current;
        if (output) output.sound = preferences.metronomeSound;
        conductorRef.current?.update({
            bpm: preferences.metronomeBpm,
            beatsPerBar: preferences.metronomeBeats,
            subdivision: preferences.metronomeSubdivision,
            accents: preferences.metronomeAccents,
        });
    }, [
        preferences.metronomeBpm,
        preferences.metronomeBeats,
        preferences.metronomeSubdivision,
        preferences.metronomeAccents,
        preferences.metronomeSound,
    ]);

    const setAccents = (accents: boolean[]) =>
        preferences.updatePreferences({ metronomeAccents: accents });

    return (
        <MetronomePanel
            bpm={preferences.metronomeBpm}
            beats={preferences.metronomeBeats}
            subdivision={preferences.metronomeSubdivision}
            accents={preferences.metronomeAccents}
            sound={preferences.metronomeSound}
            running={running}
            beatIndex={beatIndex}
            pulse={pulse}
            onBpm={(bpm) =>
                preferences.updatePreferences({ metronomeBpm: bpm })
            }
            onBeats={(beats) =>
                preferences.updatePreferences({
                    metronomeBeats: beats,
                    metronomeAccents: resizeAccents(
                        beats,
                        preferences.metronomeAccents,
                    ),
                })
            }
            onSubdivision={(metronomeSubdivision) =>
                preferences.updatePreferences({ metronomeSubdivision })
            }
            onAccent={(index, accent) => {
                const accents = preferences.metronomeAccents.slice();
                accents[index] = accent;
                setAccents(accents);
            }}
            onSound={(metronomeSound) =>
                preferences.updatePreferences({ metronomeSound })
            }
            onToggle={() => {
                const conductor = conductorRef.current;
                const output = outputRef.current;
                if (!conductor || !output) return;
                if (conductor.isRunning) {
                    conductor.stop();
                    setRunning(false);
                    setBeatIndex(null);
                    return;
                }
                output.open();
                conductor.start();
                setRunning(true);
            }}
            onTap={() => {
                const output = outputRef.current;
                const bpm = conductorRef.current?.tap(output?.audioNow() ?? 0);
                if (bpm !== null && bpm !== undefined)
                    preferences.updatePreferences({ metronomeBpm: bpm });
            }}
        />
    );
}
