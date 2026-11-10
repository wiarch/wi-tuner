import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    AUDIO_FRAME_DURATION_MS,
    AUDIO_HOP_DURATION_MS,
    AUDIO_UI_UPDATE_RATE_HZ,
    AUDIO_WATCHDOG_TIMEOUT_MS,
    AudioEngine,
    AudioInputError,
    isValidAudioInputOptions,
    type AudioEngineClock,
    type AudioEngineSnapshot,
    type AudioInputCallbacks,
    type AudioInputOptions,
    type AudioInputProvider,
    type AudioInputSession,
    type AudioLifecycleHandlers,
    type AudioLifecycleSource,
} from "../src/audio/engine";

class FakeClock implements AudioEngineClock {
    time = 0;
    private nextId = 1;
    private timers = new Map<
        number,
        { callback: () => void; interval: number; nextTime: number }
    >();

    now = () => this.time;

    setInterval = (callback: () => void, intervalMs: number) => {
        const id = this.nextId++;
        this.timers.set(id, {
            callback,
            interval: intervalMs,
            nextTime: this.time + intervalMs,
        });
        return id as unknown as ReturnType<typeof setInterval>;
    };

    clearInterval = (timerId: ReturnType<typeof setInterval>) => {
        this.timers.delete(timerId as unknown as number);
    };

    async advance(milliseconds: number): Promise<void> {
        const end = this.time + milliseconds;
        while (true) {
            const next = [...this.timers.entries()]
                .filter(([, timer]) => timer.nextTime <= end)
                .sort((a, b) => a[1].nextTime - b[1].nextTime)[0];
            if (!next) break;
            const [id, timer] = next;
            this.time = timer.nextTime;
            timer.callback();
            const current = this.timers.get(id);
            if (current) current.nextTime += current.interval;
            await flushMicrotasks();
        }
        this.time = end;
        await flushMicrotasks();
    }
}

class FakeSession implements AudioInputSession {
    sampleRate = 48_000;
    stop = vi.fn(async () => undefined);
    suspend = vi.fn(async () => undefined);
    resume = vi.fn(async () => undefined);
}

class FakeProvider implements AudioInputProvider {
    starts: { options: AudioInputOptions; callbacks: AudioInputCallbacks }[] =
        [];
    sessions: FakeSession[] = [];
    failures: unknown[] = [];
    gates: Promise<FakeSession>[] = [];

    async start(options: AudioInputOptions, callbacks: AudioInputCallbacks) {
        this.starts.push({ options, callbacks });
        const failure = this.failures.shift();
        if (failure) throw failure;
        const gate = this.gates.shift();
        if (gate) return gate;
        const session = new FakeSession();
        this.sessions.push(session);
        return session;
    }
}

class FakeLifecycle implements AudioLifecycleSource {
    handlers: AudioLifecycleHandlers | null = null;
    subscribe = vi.fn((handlers: AudioLifecycleHandlers) => {
        this.handlers = handlers;
        return () => {
            this.handlers = null;
        };
    });

    visibility(state: "visible" | "hidden") {
        this.handlers?.onVisibilityChange(state);
    }
    deviceChange() {
        this.handlers?.onDeviceChange();
    }
    permission(state: "granted" | "denied" | "prompt") {
        this.handlers?.onPermissionChange(state);
    }
}

const OPTIONS: AudioInputOptions = { sampleRate: 48_000 };

async function flushMicrotasks() {
    for (let i = 0; i < 8; i++) await Promise.resolve();
}

function setup() {
    const clock = new FakeClock();
    const provider = new FakeProvider();
    const lifecycle = new FakeLifecycle();
    const engine = new AudioEngine(provider, clock);
    const states: AudioEngineSnapshot["state"][] = [];
    engine.subscribe((snapshot) => states.push(snapshot.state));
    engine.connectLifecycle(lifecycle);
    return { clock, provider, lifecycle, engine, states };
}

describe("AudioEngine state transitions", () => {
    it("transitions idle → permission request → active and publishes incoming worklet frames", async () => {
        const { engine, provider, states } = setup();
        expect(engine.getSnapshot().state).toBe("idle");
        await engine.start(OPTIONS);
        expect(states).toEqual(["requesting-permission", "active"]);
        provider.starts[0]!.callbacks.onFrame({
            samples: new Float32Array(1_920),
            sampleRate: 48_000,
            timestamp: 0.04,
        });
        expect(engine.getSnapshot().frame).toMatchObject({
            sampleRate: 48_000,
            timestamp: 0.04,
            captureWindowMs: (1_920 / 48_000) * 1_000,
            analysisDurationMs: 0,
            latencyMs: (1_920 / 48_000) * 1_000,
            estimate: null,
            note: null,
        });
        await engine.stop();
        expect(engine.getSnapshot().state).toBe("idle");
        expect(provider.sessions[0]?.stop).toHaveBeenCalledOnce();
        await engine.dispose();
    });

    it("maps denied permission and missing-device errors to actionable states", async () => {
        const denied = setup();
        denied.provider.failures.push(
            new DOMException("permission", "NotAllowedError"),
        );
        await denied.engine.start(OPTIONS);
        expect(denied.engine.getSnapshot()).toMatchObject({
            state: "error",
            error: "permission-denied",
        });
        await denied.engine.retry();
        expect(denied.engine.getSnapshot().state).toBe("active");
        await denied.engine.dispose();

        const missing = setup();
        missing.provider.failures.push(
            new DOMException("no microphone", "NotFoundError"),
        );
        await missing.engine.start(OPTIONS);
        expect(missing.engine.getSnapshot().error).toBe("no-microphone");
        await missing.engine.retry({ sampleRate: 16_000 });
        expect(missing.provider.starts[1]?.options.sampleRate).toBe(16_000);
        await missing.engine.dispose();
    });

    it("allows a retry while a stale permission request is still resolving", async () => {
        const { engine, provider, lifecycle } = setup();
        const staleSession = new FakeSession();
        let releaseStale!: (session: FakeSession) => void;
        provider.gates.push(
            new Promise((resolve) => {
                releaseStale = resolve;
            }),
        );
        const firstRequest = engine.start(OPTIONS);
        await flushMicrotasks();
        lifecycle.permission("denied");
        await flushMicrotasks();
        expect(engine.getSnapshot().error).toBe("permission-denied");

        await engine.retry();
        expect(provider.starts).toHaveLength(2);
        expect(engine.getSnapshot().state).toBe("active");
        releaseStale(staleSession);
        await firstRequest;
        expect(staleSession.stop).toHaveBeenCalledOnce();
        await engine.dispose();
    });

    it("validates internal sample rates and device identifiers", async () => {
        expect(isValidAudioInputOptions({ sampleRate: 8_000 })).toBe(true);
        expect(isValidAudioInputOptions({ sampleRate: 48_000 })).toBe(true);
        expect(isValidAudioInputOptions({ sampleRate: 7_999 })).toBe(false);
        expect(isValidAudioInputOptions({ sampleRate: 48_001 })).toBe(false);
        expect(isValidAudioInputOptions({ sampleRate: Number.NaN })).toBe(
            false,
        );
        expect(
            isValidAudioInputOptions({
                sampleRate: 48_000,
                deviceId: 1 as never,
            }),
        ).toBe(false);
        const { engine } = setup();
        await engine.start({ sampleRate: 96_000 });
        expect(engine.getSnapshot()).toMatchObject({
            state: "error",
            error: "unknown",
        });
        await engine.dispose();
    });

    it("keeps the worklet window under 50 ms and update cadence above 30 Hz", () => {
        expect(AUDIO_FRAME_DURATION_MS).toBeLessThan(50);
        expect(AUDIO_HOP_DURATION_MS).toBeLessThan(1_000 / 30);
        expect(AUDIO_UI_UPDATE_RATE_HZ).toBeGreaterThanOrEqual(30);
    });
});

describe("AudioEngine automatic recovery", () => {
    beforeEach(() => vi.clearAllMocks());

    it("restarts after more than one second without AudioWorklet frames", async () => {
        const { engine, provider, clock, states } = setup();
        await engine.start(OPTIONS);
        provider.starts[0]!.callbacks.onFrame({
            samples: new Float32Array(512),
            sampleRate: 48_000,
            timestamp: 0,
        });
        await clock.advance(AUDIO_WATCHDOG_TIMEOUT_MS);
        expect(provider.starts).toHaveLength(1);
        await clock.advance(201);
        expect(provider.starts).toHaveLength(2);
        expect(states).toContain("recovering");
        expect(engine.getSnapshot().state).toBe("active");
        expect(provider.sessions[0]?.stop).toHaveBeenCalledOnce();
        await engine.dispose();
    });

    it("suspends in background and recovers on foreground", async () => {
        const { engine, lifecycle, provider, states } = setup();
        await engine.start(OPTIONS);
        lifecycle.visibility("hidden");
        await flushMicrotasks();
        expect(engine.getSnapshot().state).toBe("suspended");
        expect(provider.sessions[0]?.suspend).toHaveBeenCalledOnce();
        lifecycle.visibility("visible");
        await flushMicrotasks();
        expect(provider.starts).toHaveLength(2);
        expect(engine.getSnapshot().state).toBe("active");
        expect(states).toContain("recovering");
        await engine.dispose();
    });

    it.each(["device-change", "incoming-call", "ios-interruption"] as const)(
        "recovers after %s",
        async (scenario) => {
            const { engine, lifecycle, provider } = setup();
            await engine.start(OPTIONS);
            if (scenario === "device-change") lifecycle.deviceChange();
            else provider.starts[0]!.callbacks.onInterruption();
            await flushMicrotasks();
            expect(provider.starts).toHaveLength(2);
            expect(engine.getSnapshot().state).toBe("active");
            await engine.dispose();
        },
    );

    it("recovers after a track ends and permission is restored", async () => {
        const { engine, lifecycle, provider } = setup();
        await engine.start(OPTIONS);
        provider.starts[0]!.callbacks.onDeviceLost();
        await flushMicrotasks();
        expect(provider.starts).toHaveLength(2);

        lifecycle.permission("denied");
        await flushMicrotasks();
        expect(engine.getSnapshot()).toMatchObject({
            state: "error",
            error: "permission-denied",
        });
        lifecycle.permission("granted");
        await flushMicrotasks();
        expect(provider.starts).toHaveLength(3);
        expect(engine.getSnapshot().state).toBe("active");
        await engine.dispose();
    });

    it("surfaces an error if automatic recovery cannot reopen the device", async () => {
        const { engine, lifecycle, provider } = setup();
        await engine.start(OPTIONS);
        provider.failures.push(new AudioInputError("device-lost", "unplugged"));
        lifecycle.deviceChange();
        await flushMicrotasks();
        expect(engine.getSnapshot()).toMatchObject({
            state: "error",
            error: "device-lost",
        });
        await engine.dispose();
    });
});

function sine(frequency: number, length = 8_192): Float32Array {
    const sampleRate = 48_000;
    return Float32Array.from({ length }, (_, index) =>
        Math.sin((2 * Math.PI * frequency * index) / sampleRate),
    );
}

describe("AudioEngine filter lock", () => {
    it("keeps the detector on the held pitch and rejects a distant harmonic", async () => {
        const { engine, provider } = setup();
        engine.configureDetection({
            filterLocked: false,
            autoSensitivity: false,
            sensitivity: 0.8,
            algorithmMode: "balanced",
        });
        await engine.start(OPTIONS);
        const send = (frequency: number) =>
            provider.starts[0]!.callbacks.onFrame({
                samples: sine(frequency),
                sampleRate: 48_000,
                timestamp: frequency,
            });
        send(440);
        expect(engine.getSnapshot().frame?.estimate?.frequency).toBeCloseTo(
            440,
            0,
        );
        engine.configureDetection({ filterLocked: true });
        send(440);
        send(440);
        expect(engine.getSnapshot().frame?.estimate?.frequency).toBeCloseTo(
            440,
            0,
        );
        send(880);
        expect(engine.getSnapshot().frame?.estimate).toBeNull();
        send(445);
        const held = engine.getSnapshot().frame?.estimate?.frequency ?? 0;
        expect(held).toBeGreaterThan(430);
        expect(held).toBeLessThan(460);
        await engine.dispose();
    });
});
