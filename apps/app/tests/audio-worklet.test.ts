import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(
    new URL("../public/audio-capture.worklet.js", import.meta.url),
    "utf8",
);
type ProcessorClass = new (options: unknown) => {
    process(inputs: Float32Array[][]): boolean;
};

function createProcessor(sourceRate: number, targetRate: number) {
    const frames: {
        samples: Float32Array;
        sampleRate: number;
        timestamp: number;
    }[] = [];
    let frameIndex = 0;
    const registered: { name: string; processor?: ProcessorClass } = {
        name: "",
    };
    class WorkletBase {
        port = {
            postMessage: (message: (typeof frames)[number]) => {
                frames.push(message);
            },
        };
    }

    const sandbox = {
        AudioWorkletProcessor: WorkletBase,
        sampleRate: sourceRate,
        currentFrame: 0,
        registerProcessor: (name: string, constructor: ProcessorClass) => {
            registered.name = name;
            registered.processor = constructor;
        },
    };
    runInNewContext(source, sandbox);
    const Processor = registered.processor;
    if (!Processor) throw new Error("Worklet did not register a processor");
    const worklet = new Processor({
        processorOptions: {
            targetSampleRate: targetRate,
            frameDurationMs: 40,
            hopDurationMs: 20,
        },
    });
    const processBlock = () => {
        sandbox.currentFrame = frameIndex * 128;
        worklet.process([[new Float32Array(128)]]);
        frameIndex++;
    };
    return {
        frames,
        processBlock,
        get registeredName() {
            return registered.name;
        },
    };
}

describe("AudioWorklet frame capture", () => {
    it("decimates 48 kHz input to the configured 24 kHz rate", () => {
        const processor = createProcessor(48_000, 24_000);
        expect(processor.registeredName).toBe("wi-tuner-pitch-capture");
        for (let i = 0; i < 15; i++) processor.processBlock();
        expect(processor.frames).toHaveLength(1);
        expect(processor.frames[0]?.sampleRate).toBe(24_000);
        expect(processor.frames[0]?.samples).toHaveLength(960);
        expect(processor.frames[0]?.timestamp).toBeCloseTo(40 / 1_000);
    });

    it("keeps the 8 kHz input window below 50 ms and updates faster than 30 Hz", () => {
        const processor = createProcessor(8_000, 8_000);
        for (let i = 0; i < 5; i++) processor.processBlock();
        expect(processor.frames.length).toBeGreaterThanOrEqual(2);
        expect(processor.frames[0]?.samples).toHaveLength(320);
        expect(processor.frames[0]?.timestamp).toBeCloseTo(48 / 1_000);
        const updateIntervals = processor.frames
            .slice(1)
            .map(
                (frame, index) =>
                    (frame.timestamp - processor.frames[index]!.timestamp) *
                    1_000,
            );
        expect(Math.max(...updateIntervals)).toBeLessThan(1_000 / 30);
    });
});
