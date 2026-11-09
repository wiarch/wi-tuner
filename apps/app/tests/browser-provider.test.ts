import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrowserAudioInputProvider } from "../src/audio/browser-provider";
import type { AudioInputCallbacks } from "../src/audio/engine";

class MockTrack extends EventTarget {
    stop = vi.fn();
}

class MockSource {
    connect = vi.fn();
    disconnect = vi.fn();
}

class MockGain extends MockSource {
    gain = { value: 1 };
}

class MockAudioContext extends EventTarget {
    static latest: MockAudioContext;
    readonly sampleRate = 48_000;
    readonly state: AudioContextState = "running";
    readonly destination = {} as AudioDestinationNode;
    readonly audioWorklet = { addModule: vi.fn(async () => undefined) };
    readonly resume = vi.fn(async () => undefined);
    readonly suspend = vi.fn(async () => undefined);
    readonly close = vi.fn(async () => undefined);

    constructor(options?: AudioContextOptions) {
        super();
        MockAudioContext.latest = this;
        expect(options?.sampleRate).toBe(48_000);
    }

    createMediaStreamSource() {
        return new MockSource() as unknown as MediaStreamAudioSourceNode;
    }

    createGain() {
        return new MockGain() as unknown as GainNode;
    }
}

class MockWorkletNode {
    static latest: MockWorkletNode;
    readonly port: MessagePort = {
        onmessage: null,
    } as unknown as MessagePort;
    readonly connect = vi.fn();
    readonly disconnect = vi.fn();

    constructor(
        _context: AudioContext,
        processorName: string,
        options: AudioWorkletNodeOptions,
    ) {
        MockWorkletNode.latest = this;
        expect(processorName).toBe("wi-tuner-pitch-capture");
        expect(options.processorOptions).toMatchObject({
            targetSampleRate: 48_000,
            frameDurationMs: 40,
            hopDurationMs: 20,
        });
    }
}

describe("BrowserAudioInputProvider", () => {
    let track: MockTrack;
    let getUserMedia: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        track = new MockTrack();
        const stream = {
            getAudioTracks: () => [track],
        } as unknown as MediaStream;
        getUserMedia = vi.fn(async () => stream);
        vi.stubGlobal("navigator", {
            mediaDevices: { getUserMedia },
        });
        vi.stubGlobal("AudioContext", MockAudioContext);
        vi.stubGlobal("AudioWorkletNode", MockWorkletNode);
    });

    afterEach(() => vi.unstubAllGlobals());

    it("disables browser AGC/cleanup, loads the worklet, and forwards frames", async () => {
        const callbacks: AudioInputCallbacks = {
            onFrame: vi.fn(),
            onInterruption: vi.fn(),
            onDeviceLost: vi.fn(),
        };
        const session = await new BrowserAudioInputProvider().start(
            { sampleRate: 48_000, deviceId: "mic-1" },
            callbacks,
        );

        expect(getUserMedia).toHaveBeenCalledWith({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: { ideal: 48_000 },
                deviceId: { exact: "mic-1" },
            },
            video: false,
        });
        expect(
            MockAudioContext.latest.audioWorklet.addModule,
        ).toHaveBeenCalledWith("/audio-capture.worklet.js");
        expect(session.sampleRate).toBe(48_000);
        const samples = new Float32Array(1_920);
        MockWorkletNode.latest.port.onmessage?.({
            data: { samples, sampleRate: 48_000, timestamp: 0.04 },
        } as MessageEvent);
        expect(callbacks.onFrame).toHaveBeenCalledWith({
            samples,
            sampleRate: 48_000,
            timestamp: 0.04,
        });

        await session.suspend();
        await session.resume();
        await session.stop();
        expect(MockAudioContext.latest.suspend).toHaveBeenCalledOnce();
        expect(MockAudioContext.latest.resume).toHaveBeenCalledTimes(2);
        expect(track.stop).toHaveBeenCalledOnce();
        expect(MockAudioContext.latest.close).toHaveBeenCalledOnce();
    });

    it("translates permission and missing-device failures into actionable errors", async () => {
        getUserMedia.mockRejectedValueOnce(
            new DOMException("denied", "NotAllowedError"),
        );
        await expect(
            new BrowserAudioInputProvider().start(
                { sampleRate: 48_000 },
                {
                    onFrame: vi.fn(),
                    onInterruption: vi.fn(),
                    onDeviceLost: vi.fn(),
                },
            ),
        ).rejects.toMatchObject({ code: "permission-denied" });

        getUserMedia.mockRejectedValueOnce(
            new DOMException("missing", "NotFoundError"),
        );
        await expect(
            new BrowserAudioInputProvider().start(
                { sampleRate: 48_000 },
                {
                    onFrame: vi.fn(),
                    onInterruption: vi.fn(),
                    onDeviceLost: vi.fn(),
                },
            ),
        ).rejects.toMatchObject({ code: "no-microphone" });
    });
});
