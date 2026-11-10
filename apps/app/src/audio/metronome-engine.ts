import {
    MetronomeScheduler,
    TapTempo,
    validateMetronomeConfig,
    type MetronomeConfig,
    type MetronomeTick,
    type Subdivision,
} from "@wi-tuner/dsp-core";

export const METRONOME_SOUNDS = ["click", "wood", "beep", "cowbell"] as const;
export type MetronomeSound = (typeof METRONOME_SOUNDS)[number];
export const METRONOME_SUBDIVISIONS = [1, 2, 3, 4, 6, 8] as const;

const LOOKAHEAD_SECONDS = 0.1;
const POLL_MS = 25;

export interface MetronomeSettings {
    bpm: number;
    beatsPerBar: number;
    subdivision: Subdivision;
    accents: boolean[];
}

export interface MetronomeClock {
    audioNow(): number;
    setInterval(callback: () => void, intervalMs: number): unknown;
    clearInterval(id: unknown): void;
}

export interface MetronomeOutput {
    play(tick: MetronomeTick): void;
    pulse(tick: MetronomeTick): void;
    setAwake(active: boolean): void;
}

export function resizeAccents(
    beats: number,
    accents: readonly boolean[] = [],
): boolean[] {
    const count = Math.max(1, Math.min(16, Math.trunc(beats)));
    return Array.from(
        { length: count },
        (_, index) => accents[index] ?? index === 0,
    );
}

function toConfig(settings: MetronomeSettings): MetronomeConfig {
    return {
        bpm: settings.bpm,
        beatsPerBar: settings.beatsPerBar,
        subdivision: settings.subdivision,
        accents: settings.accents,
        lookaheadSeconds: LOOKAHEAD_SECONDS,
    };
}

/**
 * Polls the DSP scheduler against an audio clock. Click times are the
 * scheduler's audio-clock times, so a jittery poll does not move the grid.
 */
export class MetronomeConductor {
    private readonly scheduler: MetronomeScheduler;
    private readonly tapTempo = new TapTempo();
    private timer: unknown = null;
    private upcoming: MetronomeTick[] = [];
    private running = false;

    constructor(
        private readonly clock: MetronomeClock,
        private readonly output: MetronomeOutput,
        settings: MetronomeSettings,
    ) {
        this.scheduler = new MetronomeScheduler(toConfig(settings));
    }

    get isRunning(): boolean {
        return this.running;
    }

    start(): void {
        if (this.running) return;
        const now = this.clock.audioNow();
        this.scheduler.start(Math.max(0, now));
        this.running = true;
        this.output.setAwake(true);
        this.timer = this.clock.setInterval(() => this.pump(), POLL_MS);
        this.pump();
    }

    stop(): void {
        this.running = false;
        if (this.timer !== null) this.clock.clearInterval(this.timer);
        this.timer = null;
        this.scheduler.stop();
        this.upcoming = [];
        this.output.setAwake(false);
    }

    update(settings: MetronomeSettings): void {
        const config = toConfig(settings);
        if (!validateMetronomeConfig(config)) return;
        this.scheduler.update(config);
    }

    tap(timeSeconds: number): number | null {
        const bpm = this.tapTempo.tap(timeSeconds);
        return bpm === null ? null : Math.round(bpm * 10) / 10;
    }

    private pump(): void {
        if (!this.running) return;
        const now = this.clock.audioNow();
        this.scheduler.pump(now, (tick) => {
            this.output.play(tick);
            this.upcoming.push(tick);
        });
        while (this.upcoming[0] && this.upcoming[0].time <= now + 0.001) {
            const tick = this.upcoming.shift();
            if (tick) this.output.pulse(tick);
        }
    }
}
