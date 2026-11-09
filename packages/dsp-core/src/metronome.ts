export type Subdivision = 1 | 2 | 3 | 4 | 6 | 8;
export interface MetronomeConfig {
    bpm: number;
    beatsPerBar: number;
    subdivision: Subdivision;
    accents?: readonly boolean[];
    lookaheadSeconds?: number;
}
export interface MetronomeTick {
    time: number;
    beatIndex: number;
    subdivisionIndex: number;
    barIndex: number;
    accent: boolean;
}
export type ScheduleTick = (tick: MetronomeTick) => void;

export function validateMetronomeConfig(config: MetronomeConfig): boolean {
    if (!config || typeof config !== "object") return false;
    return (
        Number.isFinite(config.bpm) &&
        config.bpm >= 30 &&
        config.bpm <= 300 &&
        Number.isInteger(config.beatsPerBar) &&
        config.beatsPerBar >= 1 &&
        config.beatsPerBar <= 16 &&
        [1, 2, 3, 4, 6, 8].includes(config.subdivision) &&
        (config.lookaheadSeconds === undefined ||
            (Number.isFinite(config.lookaheadSeconds) &&
                config.lookaheadSeconds > 0 &&
                config.lookaheadSeconds <= 1)) &&
        (config.accents === undefined ||
            config.accents.length === config.beatsPerBar)
    );
}

/** Audio-clock scheduler. The host polls pump() from its own render/timer loop. */
export class MetronomeScheduler {
    private config: MetronomeConfig;
    private nextTime = 0;
    private step = 0;
    private running = false;
    private absoluteBeat = 0;

    constructor(config: MetronomeConfig) {
        if (!validateMetronomeConfig(config))
            throw new RangeError("Invalid metronome configuration");
        this.config = { ...config };
    }

    start(startAtSeconds: number): void {
        if (!Number.isFinite(startAtSeconds) || startAtSeconds < 0)
            throw new RangeError(
                "Start time must be a non-negative audio-clock time",
            );
        this.nextTime = startAtSeconds;
        this.step = 0;
        this.absoluteBeat = 0;
        this.running = true;
    }

    stop(): void {
        this.running = false;
    }
    get isRunning(): boolean {
        return this.running;
    }

    update(config: MetronomeConfig): void {
        if (!validateMetronomeConfig(config))
            throw new RangeError("Invalid metronome configuration");
        this.config = { ...config };
    }

    /** Schedule all events before now + lookahead; no wall-clock timer is created here. */
    pump(nowSeconds: number, schedule: ScheduleTick): number {
        if (!this.running) return 0;
        if (!Number.isFinite(nowSeconds) || nowSeconds < 0)
            throw new RangeError(
                "Current time must be a non-negative audio-clock time",
            );
        const lookahead = this.config.lookaheadSeconds ?? 0.1;
        const interval = 60 / this.config.bpm / this.config.subdivision;
        const beatsInBar = this.config.beatsPerBar;
        if (this.nextTime < nowSeconds) {
            const missedSteps = Math.ceil(
                (nowSeconds - this.nextTime) / interval,
            );
            const previousBeat = Math.floor(
                this.step / this.config.subdivision,
            );
            this.step += missedSteps;
            this.absoluteBeat +=
                Math.floor(this.step / this.config.subdivision) - previousBeat;
            this.nextTime += missedSteps * interval;
        }
        let scheduled = 0;
        while (this.nextTime < nowSeconds + lookahead) {
            const subdivisionIndex = this.step % this.config.subdivision;
            const beatIndex =
                Math.floor(this.step / this.config.subdivision) % beatsInBar;
            const barIndex = Math.floor(this.absoluteBeat / beatsInBar);
            const accents = this.config.accents;
            const accent =
                subdivisionIndex === 0 &&
                (accents?.[beatIndex] ?? beatIndex === 0);
            schedule({
                time: this.nextTime,
                beatIndex,
                subdivisionIndex,
                barIndex,
                accent,
            });
            this.nextTime += interval;
            this.step++;
            if (subdivisionIndex === this.config.subdivision - 1)
                this.absoluteBeat++;
            scheduled++;
        }
        return scheduled;
    }
}

export class TapTempo {
    private taps: number[] = [];
    constructor(
        private readonly maxIntervals = 5,
        private readonly idleResetSeconds = 2,
    ) {
        if (
            !Number.isInteger(maxIntervals) ||
            maxIntervals < 1 ||
            maxIntervals > 32 ||
            !Number.isFinite(idleResetSeconds) ||
            idleResetSeconds <= 0
        ) {
            throw new RangeError("Invalid tap tempo configuration");
        }
    }

    tap(timeSeconds: number): number | null {
        if (!Number.isFinite(timeSeconds) || timeSeconds < 0) return null;
        const previous = this.taps.at(-1);
        if (
            previous !== undefined &&
            timeSeconds - previous > this.idleResetSeconds
        )
            this.taps = [];
        if (this.taps.length > 0) {
            const interval = timeSeconds - (this.taps.at(-1) ?? timeSeconds);
            if (interval < 60 / 300 || interval > 60 / 30) {
                this.taps = [timeSeconds];
                return null;
            }
        }
        this.taps.push(timeSeconds);
        if (this.taps.length > this.maxIntervals + 1) this.taps.shift();
        if (this.taps.length < 2) return null;
        const intervals = this.taps
            .slice(1)
            .map((tap, index) => tap - (this.taps[index] ?? tap))
            .sort((a, b) => a - b);
        const middle = Math.floor(intervals.length / 2);
        const median =
            intervals.length % 2
                ? intervals[middle]
                : ((intervals[middle - 1] ?? 0) + (intervals[middle] ?? 0)) / 2;
        const bpm = 60 / (median ?? 0);
        return Number.isFinite(bpm) && bpm >= 30 && bpm <= 300 ? bpm : null;
    }

    reset(): void {
        this.taps = [];
    }
}
