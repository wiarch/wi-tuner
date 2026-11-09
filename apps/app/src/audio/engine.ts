import {
    detectPitch,
    frequencyToNote,
    MAX_PITCH_HZ,
    MIN_PITCH_HZ,
    type NoteReading,
    type PitchEstimate,
} from "@wi-tuner/dsp-core";

export type AudioEngineState =
    | "idle"
    | "requesting-permission"
    | "active"
    | "suspended"
    | "error"
    | "recovering";

export type AudioErrorCode =
    | "permission-denied"
    | "no-microphone"
    | "unsupported"
    | "device-lost"
    | "interrupted"
    | "unknown";

export class AudioInputError extends Error {
    constructor(
        readonly code: AudioErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "AudioInputError";
    }
}

export interface AudioInputOptions {
    /** Desired processing rate; the provider chooses a supported decimation. */
    sampleRate: number;
    deviceId?: string;
}

export interface AudioInputFrame {
    samples: Float32Array;
    sampleRate: number;
    timestamp: number;
}

export interface AudioInputCallbacks {
    onFrame(frame: AudioInputFrame): void;
    onInterruption(): void;
    onDeviceLost(): void;
}

export interface AudioInputSession {
    readonly sampleRate: number;
    suspend(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
}

/** Browser or native implementations may provide the microphone stream. */
export interface AudioInputProvider {
    start(
        options: AudioInputOptions,
        callbacks: AudioInputCallbacks,
    ): Promise<AudioInputSession>;
}

export interface AudioEngineFrame {
    estimate: PitchEstimate | null;
    note: NoteReading | null;
    sampleRate: number;
    timestamp: number;
    captureWindowMs: number;
    analysisDurationMs: number;
    latencyMs: number;
}

export interface AudioEngineSnapshot {
    state: AudioEngineState;
    error: AudioErrorCode | null;
    frame: AudioEngineFrame | null;
    sampleRate: number | null;
}

export interface AudioLifecycleHandlers {
    onVisibilityChange(state: "visible" | "hidden"): void;
    onDeviceChange(): void;
    onPermissionChange(state: "granted" | "denied" | "prompt"): void;
}

export interface AudioLifecycleSource {
    subscribe(handlers: AudioLifecycleHandlers): () => void;
}

export interface AudioEngineClock {
    now(): number;
    setInterval(
        callback: () => void,
        intervalMs: number,
    ): ReturnType<typeof setInterval>;
    clearInterval(id: ReturnType<typeof setInterval>): void;
}

const DEFAULT_CLOCK: AudioEngineClock = {
    now: () => performance.now(),
    setInterval: (callback, intervalMs) =>
        globalThis.setInterval(callback, intervalMs),
    clearInterval: (id) => globalThis.clearInterval(id),
};

export const MIN_INTERNAL_SAMPLE_RATE = 8_000;
export const MAX_INTERNAL_SAMPLE_RATE = 48_000;
export const AUDIO_WATCHDOG_TIMEOUT_MS = 1_000;
const WATCHDOG_INTERVAL_MS = 200;
export const AUDIO_FRAME_DURATION_MS = 40;
export const AUDIO_HOP_DURATION_MS = 20;
export const AUDIO_UI_UPDATE_RATE_HZ = 1_000 / AUDIO_HOP_DURATION_MS;

export function isValidAudioInputOptions(options: AudioInputOptions): boolean {
    return (
        Number.isFinite(options.sampleRate) &&
        options.sampleRate >= MIN_INTERNAL_SAMPLE_RATE &&
        options.sampleRate <= MAX_INTERNAL_SAMPLE_RATE &&
        (options.deviceId === undefined || typeof options.deviceId === "string")
    );
}

function mapInputError(error: unknown): AudioErrorCode {
    if (error instanceof AudioInputError) return error.code;
    const name =
        error && typeof error === "object" && "name" in error
            ? String(error.name)
            : "";
    if (name === "NotAllowedError" || name === "SecurityError")
        return "permission-denied";
    if (
        name === "NotFoundError" ||
        name === "DevicesNotFoundError" ||
        name === "OverconstrainedError"
    )
        return "no-microphone";
    if (name === "NotReadableError" || name === "AbortError")
        return "device-lost";
    if (name === "NotSupportedError") return "unsupported";
    return "unknown";
}

export class AudioEngine {
    private snapshot: AudioEngineSnapshot = {
        state: "idle",
        error: null,
        frame: null,
        sampleRate: null,
    };
    private session: AudioInputSession | null = null;
    private listeners = new Set<(snapshot: AudioEngineSnapshot) => void>();
    private operation: { generation: number; promise: Promise<void> } | null =
        null;
    private watchdog: ReturnType<typeof setInterval> | null = null;
    private unsubscribeLifecycle: (() => void) | null = null;
    private lastFrameAt = 0;
    private generation = 0;
    private lastOptions: AudioInputOptions | null = null;
    private disposed = false;
    private isVisible = true;

    constructor(
        private readonly provider: AudioInputProvider,
        private readonly clock: AudioEngineClock = DEFAULT_CLOCK,
    ) {}

    getSnapshot = (): AudioEngineSnapshot => this.snapshot;

    subscribe = (
        listener: (snapshot: AudioEngineSnapshot) => void,
    ): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    connectLifecycle(source: AudioLifecycleSource): () => void {
        this.unsubscribeLifecycle?.();
        const unsubscribe = source.subscribe({
            onVisibilityChange: (state) => {
                this.isVisible = state === "visible";
                if (state === "hidden") void this.suspend();
                else if (this.snapshot.state === "suspended")
                    void this.recover("interrupted");
            },
            onDeviceChange: () => {
                if (this.snapshot.state === "active")
                    void this.recover("device-lost");
            },
            onPermissionChange: (state) => void this.permissionChanged(state),
        });
        this.unsubscribeLifecycle = unsubscribe;
        return () => {
            unsubscribe();
            if (this.unsubscribeLifecycle === unsubscribe)
                this.unsubscribeLifecycle = null;
        };
    }

    async start(options: AudioInputOptions): Promise<void> {
        if (!isValidAudioInputOptions(options)) {
            this.generation++;
            this.clearWatchdog();
            const session = this.session;
            this.session = null;
            await session?.stop().catch(() => undefined);
            this.transition("error", "unknown");
            return;
        }
        this.lastOptions = { ...options };
        if (this.snapshot.state === "active") return;
        await this.open(this.snapshot.state !== "idle");
    }

    async retry(options?: AudioInputOptions): Promise<void> {
        if (options) {
            if (!isValidAudioInputOptions(options)) {
                this.transition("error", "unknown");
                return;
            }
            this.lastOptions = { ...options };
        }
        if (!this.lastOptions || this.disposed) return;
        await this.open(true);
    }

    async stop(): Promise<void> {
        this.generation++;
        this.clearWatchdog();
        const session = this.session;
        this.session = null;
        try {
            await session?.stop();
        } finally {
            this.transition("idle", null, null, null);
        }
    }

    async suspend(): Promise<void> {
        if (this.snapshot.state !== "active" || !this.session) return;
        this.clearWatchdog();
        this.transition("suspended", null);
        try {
            await this.session.suspend();
        } catch {
            await this.recover("interrupted");
        }
    }

    async permissionChanged(
        state: "granted" | "denied" | "prompt",
    ): Promise<void> {
        if (state === "denied" && this.snapshot.state !== "idle") {
            this.generation++;
            this.clearWatchdog();
            const session = this.session;
            this.session = null;
            await session?.stop().catch(() => undefined);
            this.transition("error", "permission-denied");
        } else if (
            state === "granted" &&
            this.snapshot.error === "permission-denied" &&
            this.lastOptions
        ) {
            await this.recover("permission-denied");
        }
    }

    async dispose(): Promise<void> {
        this.disposed = true;
        this.unsubscribeLifecycle?.();
        this.unsubscribeLifecycle = null;
        await this.stop();
        this.listeners.clear();
    }

    private async recover(reason: AudioErrorCode): Promise<void> {
        if (this.disposed || !this.lastOptions) return;
        if (this.snapshot.state === "recovering")
            return this.operation?.promise;
        this.transition("recovering", reason);
        await this.open(true);
    }

    private async open(recovering: boolean): Promise<void> {
        if (this.operation?.generation === this.generation)
            return this.operation.promise;
        if (this.disposed || !this.lastOptions) return;
        const options = this.lastOptions;
        const generation = ++this.generation;
        this.clearWatchdog();
        const oldSession = this.session;
        this.session = null;

        const promise = (async () => {
            if (recovering) this.transition("recovering", null);
            else this.transition("requesting-permission", null, null, null);
            try {
                await oldSession?.stop().catch(() => undefined);
                const session = await this.provider.start(options, {
                    onFrame: (frame) => {
                        if (
                            generation !== this.generation ||
                            this.snapshot.state !== "active"
                        )
                            return;
                        this.receiveFrame(frame);
                    },
                    onInterruption: () => {
                        if (this.snapshot.state === "active")
                            void this.recover("interrupted");
                    },
                    onDeviceLost: () => {
                        if (this.snapshot.state === "active")
                            void this.recover("device-lost");
                    },
                });
                if (generation !== this.generation || this.disposed) {
                    await session.stop();
                    return;
                }
                this.session = session;
                this.lastFrameAt = this.clock.now();
                if (!this.isVisible) {
                    this.transition(
                        "suspended",
                        null,
                        null,
                        session.sampleRate,
                    );
                    await session.suspend();
                    return;
                }
                this.transition("active", null, null, session.sampleRate);
                this.startWatchdog(generation);
            } catch (error) {
                if (generation !== this.generation) return;
                this.transition("error", mapInputError(error));
            } finally {
                if (this.operation?.generation === generation)
                    this.operation = null;
            }
        })();
        this.operation = { generation, promise };
        return promise;
    }

    private receiveFrame(frame: AudioInputFrame): void {
        this.lastFrameAt = this.clock.now();
        const processingStartedAt = this.clock.now();
        const estimate = detectPitch(frame.samples, frame.sampleRate, {
            maxFrequency: Math.min(MAX_PITCH_HZ, frame.sampleRate * 0.48),
            minFrequency: MIN_PITCH_HZ,
        });
        const note =
            estimate === null ? null : frequencyToNote(estimate.frequency);
        const analysisDurationMs = Math.max(
            0,
            this.clock.now() - processingStartedAt,
        );
        const captureWindowMs =
            (frame.samples.length / frame.sampleRate) * 1_000;
        this.update({
            ...this.snapshot,
            frame: {
                estimate,
                note,
                sampleRate: frame.sampleRate,
                timestamp: frame.timestamp,
                captureWindowMs,
                analysisDurationMs,
                latencyMs: captureWindowMs + analysisDurationMs,
            },
        });
    }

    private startWatchdog(generation: number): void {
        this.watchdog = this.clock.setInterval(() => {
            if (
                generation === this.generation &&
                this.snapshot.state === "active" &&
                this.clock.now() - this.lastFrameAt > AUDIO_WATCHDOG_TIMEOUT_MS
            )
                void this.recover("device-lost");
        }, WATCHDOG_INTERVAL_MS);
    }

    private clearWatchdog(): void {
        if (this.watchdog === null) return;
        this.clock.clearInterval(this.watchdog);
        this.watchdog = null;
    }

    private transition(
        state: AudioEngineState,
        error: AudioErrorCode | null,
        frame: AudioEngineFrame | null = this.snapshot.frame,
        sampleRate: number | null = this.snapshot.sampleRate,
    ): void {
        this.update({ state, error, frame, sampleRate });
    }

    private update(snapshot: AudioEngineSnapshot): void {
        this.snapshot = snapshot;
        for (const listener of this.listeners) listener(snapshot);
    }
}
