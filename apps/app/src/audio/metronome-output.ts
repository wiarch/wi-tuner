import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { KeepAwake } from "@capacitor-community/keep-awake";
import type { MetronomeTick } from "@wi-tuner/dsp-core";

import type { MetronomeSound } from "./metronome-engine";

type AudioContextConstructor = new () => AudioContext;

function audioContextConstructor(): AudioContextConstructor | null {
    if (typeof window === "undefined") return null;
    const candidates = window as typeof window & {
        webkitAudioContext?: AudioContextConstructor;
    };
    return candidates.AudioContext ?? candidates.webkitAudioContext ?? null;
}

function pulseHaptic(accent: boolean): void {
    if (!Capacitor.isNativePlatform()) return;
    void Haptics.impact({
        style: accent ? ImpactStyle.Medium : ImpactStyle.Light,
    }).catch(() => undefined);
}

interface WakeSentinel {
    release(): Promise<void>;
}

/**
 * Schedules a short synthesized click on the metronome's own AudioContext.
 * The tuner keeps a separate context, so neither suspends the other.
 */
export function scheduleMetronomeClick(
    context: AudioContext,
    sound: MetronomeSound,
    tick: MetronomeTick,
): void {
    const time = tick.time;
    const accent = tick.accent;
    const primary = tick.subdivisionIndex === 0;
    const frequencies =
        sound === "cowbell"
            ? accent
                ? [587, 845]
                : [523, 740]
            : [
                  sound === "wood"
                      ? accent
                          ? 220
                          : 160
                      : sound === "beep"
                        ? accent
                            ? 988
                            : 784
                        : accent
                          ? 1568
                          : primary
                            ? 1175
                            : 880,
              ];
    const duration = accent ? 0.09 : primary ? 0.05 : 0.03;
    const peak = accent ? 0.2 : primary ? 0.1 : 0.05;
    const master = context.createGain();
    master.gain.setValueAtTime(peak, time);
    master.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    master.connect(context.destination);
    for (const frequency of frequencies) {
        const oscillator = context.createOscillator();
        oscillator.type = sound === "beep" ? "square" : "sine";
        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.connect(master);
        oscillator.start(time);
        oscillator.stop(time + duration + 0.02);
    }
}

export class WebMetronomeOutput {
    private context: AudioContext | null = null;
    private wake: WakeSentinel | null = null;
    private awake = false;
    private readonly onVisible = () => {
        if (this.awake && document.visibilityState === "visible")
            void this.acquireWake();
    };
    sound: MetronomeSound = "click";

    constructor(private readonly onPulse: (tick: MetronomeTick) => void) {}

    audioNow(): number {
        return this.context?.currentTime ?? 0;
    }

    /** Call from the start gesture so the context may leave the suspended state. */
    open(): void {
        const AudioContextClass = audioContextConstructor();
        if (!AudioContextClass) return;
        if (!this.context || this.context.state === "closed")
            this.context = new AudioContextClass();
        void this.context.resume().catch(() => undefined);
    }

    play(tick: MetronomeTick): void {
        if (!this.context) return;
        scheduleMetronomeClick(this.context, this.sound, tick);
    }

    pulse(tick: MetronomeTick): void {
        if (tick.subdivisionIndex === 0) pulseHaptic(tick.accent);
        this.onPulse(tick);
    }

    setAwake(active: boolean): void {
        this.awake = active;
        if (typeof document === "undefined") return;
        if (active) {
            document.addEventListener("visibilitychange", this.onVisible);
            void this.acquireWake();
            return;
        }
        document.removeEventListener("visibilitychange", this.onVisible);
        const wake = this.wake;
        this.wake = null;
        void wake?.release().catch(() => undefined);
        if (Capacitor.isNativePlatform())
            void KeepAwake.allowSleep().catch(() => undefined);
    }

    dispose(): void {
        this.setAwake(false);
        const context = this.context;
        this.context = null;
        if (context && context.state !== "closed")
            void context.close().catch(() => undefined);
    }

    private async acquireWake(): Promise<void> {
        if (Capacitor.isNativePlatform()) {
            try {
                await KeepAwake.keepAwake();
            } catch {
                /* The web build has no native keep-awake bridge. */
            }
            return;
        }
        const lock = navigator.wakeLock;
        if (!lock) return;
        try {
            this.wake = await lock.request("screen");
        } catch {
            this.wake = null;
        }
    }
}
