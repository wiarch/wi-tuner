import {
    AudioInputError,
    type AudioInputCallbacks,
    type AudioInputOptions,
    type AudioInputProvider,
    type AudioInputSession,
} from "./engine";
import { AUDIO_FRAME_DURATION_MS, AUDIO_HOP_DURATION_MS } from "./engine";

const PROCESSOR_NAME = "wi-tuner-pitch-capture";
const WORKLET_URL = "/audio-capture.worklet.js";

function browserError(error: unknown): AudioInputError {
    if (error instanceof AudioInputError) return error;
    const name =
        error && typeof error === "object" && "name" in error
            ? String(error.name)
            : "";
    if (name === "NotAllowedError" || name === "SecurityError")
        return new AudioInputError(
            "permission-denied",
            "Allow microphone access in browser settings and retry.",
        );
    if (
        name === "NotFoundError" ||
        name === "DevicesNotFoundError" ||
        name === "OverconstrainedError"
    )
        return new AudioInputError(
            "no-microphone",
            "Connect or enable a microphone, then retry.",
        );
    if (name === "NotReadableError" || name === "AbortError")
        return new AudioInputError(
            "device-lost",
            "The microphone is busy or disconnected. Close other audio apps and retry.",
        );
    if (name === "NotSupportedError")
        return new AudioInputError(
            "unsupported",
            "AudioWorklet could not load. Use a supported browser over HTTPS and retry.",
        );
    return new AudioInputError(
        "unknown",
        "The microphone could not start. Check browser audio settings and retry.",
    );
}

export class BrowserAudioInputProvider implements AudioInputProvider {
    async start(
        options: AudioInputOptions,
        callbacks: AudioInputCallbacks,
    ): Promise<AudioInputSession> {
        if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices?.getUserMedia ||
            typeof AudioContext === "undefined" ||
            typeof AudioWorkletNode === "undefined"
        )
            throw new AudioInputError(
                "unsupported",
                "Use a recent browser that supports microphone capture and AudioWorklet over HTTPS.",
            );

        let stream: MediaStream | null = null;
        let context: AudioContext | null = null;
        let source: MediaStreamAudioSourceNode | null = null;
        let worklet: AudioWorkletNode | null = null;
        let mute: GainNode | null = null;
        let intentionallySuspended = false;
        const onContextStateChange = () => {
            const state = context?.state as string | undefined;
            if (
                !intentionallySuspended &&
                (state === "suspended" || state === "interrupted")
            )
                callbacks.onInterruption();
        };
        const onTrackEnded = () => callbacks.onDeviceLost();

        try {
            const audio: MediaTrackConstraints = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: { ideal: options.sampleRate },
            };
            if (options.deviceId) audio.deviceId = { exact: options.deviceId };
            stream = await navigator.mediaDevices.getUserMedia({
                audio,
                video: false,
            });
            context = new AudioContext({ sampleRate: options.sampleRate });
            if (!context.audioWorklet)
                throw new AudioInputError(
                    "unsupported",
                    "This browser does not support AudioWorklet. Update the browser and retry.",
                );
            await context.audioWorklet.addModule(WORKLET_URL);
            source = context.createMediaStreamSource(stream);
            worklet = new AudioWorkletNode(context, PROCESSOR_NAME, {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1],
                processorOptions: {
                    targetSampleRate: options.sampleRate,
                    frameDurationMs: AUDIO_FRAME_DURATION_MS,
                    hopDurationMs: AUDIO_HOP_DURATION_MS,
                },
            });
            mute = context.createGain();
            mute.gain.value = 0;
            worklet.port.onmessage = (event: MessageEvent) => {
                const data = event.data as {
                    samples?: Float32Array;
                    sampleRate?: number;
                    timestamp?: number;
                };
                if (
                    data.samples instanceof Float32Array &&
                    Number.isFinite(data.sampleRate) &&
                    Number.isFinite(data.timestamp)
                )
                    callbacks.onFrame({
                        samples: data.samples,
                        sampleRate: data.sampleRate!,
                        timestamp: data.timestamp!,
                    });
            };
            source.connect(worklet);
            worklet.connect(mute);
            mute.connect(context.destination);
            context.addEventListener("statechange", onContextStateChange);
            for (const track of stream.getAudioTracks())
                track.addEventListener("ended", onTrackEnded);
            await context.resume();

            const audioContext = context;
            const mediaStream = stream;
            const audioSource = source;
            const audioWorklet = worklet;
            const mutedOutput = mute;
            let stopped = false;
            const sampleRate =
                audioContext.sampleRate /
                Math.max(
                    1,
                    Math.ceil(audioContext.sampleRate / options.sampleRate),
                );
            if (sampleRate < 8_000 || sampleRate > 48_000)
                throw new AudioInputError(
                    "unsupported",
                    "The browser cannot provide a processing rate between 8 and 48 kHz. Select another rate and retry.",
                );
            return {
                sampleRate,
                suspend: async () => {
                    intentionallySuspended = true;
                    await audioContext.suspend();
                },
                resume: async () => {
                    intentionallySuspended = false;
                    await audioContext.resume();
                },
                stop: async () => {
                    if (stopped) return;
                    stopped = true;
                    audioContext.removeEventListener(
                        "statechange",
                        onContextStateChange,
                    );
                    for (const track of mediaStream.getAudioTracks()) {
                        track.removeEventListener("ended", onTrackEnded);
                        track.stop();
                    }
                    audioWorklet.port.onmessage = null;
                    audioSource.disconnect();
                    audioWorklet.disconnect();
                    mutedOutput.disconnect();
                    if (audioContext.state !== "closed")
                        await audioContext.close();
                },
            };
        } catch (error) {
            context?.removeEventListener("statechange", onContextStateChange);
            for (const track of stream?.getAudioTracks() ?? []) {
                track.removeEventListener("ended", onTrackEnded);
                track.stop();
            }
            source?.disconnect();
            worklet?.disconnect();
            mute?.disconnect();
            if (context && context.state !== "closed")
                await context.close().catch(() => undefined);
            throw browserError(error);
        }
    }
}
