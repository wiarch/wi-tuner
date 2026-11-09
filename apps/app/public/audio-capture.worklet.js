class WiTunerPitchCaptureProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const requestedRate =
            options.processorOptions?.targetSampleRate ?? sampleRate;
        const frameDurationMs = options.processorOptions?.frameDurationMs ?? 40;
        const hopDurationMs = options.processorOptions?.hopDurationMs ?? 20;
        this.decimation = Math.max(1, Math.ceil(sampleRate / requestedRate));
        this.outputRate = sampleRate / this.decimation;
        this.frameSize = Math.max(
            128,
            Math.round((this.outputRate * frameDurationMs) / 1_000),
        );
        this.hopSize = Math.max(
            128,
            Math.round((this.outputRate * hopDurationMs) / 1_000),
        );
        this.ring = new Float32Array(this.frameSize);
        this.writeIndex = 0;
        this.filled = 0;
        this.untilNextFrame = 0;
        this.decimationTotal = 0;
        this.decimationCount = 0;
    }

    process(inputs) {
        const channel = inputs[0]?.[0];
        if (!channel) return true;

        for (let index = 0; index < channel.length; index++) {
            this.decimationTotal += channel[index];
            this.decimationCount++;
            if (this.decimationCount < this.decimation) continue;

            const value = this.decimationTotal / this.decimationCount;
            this.decimationTotal = 0;
            this.decimationCount = 0;
            this.ring[this.writeIndex] = value;
            this.writeIndex = (this.writeIndex + 1) % this.frameSize;
            this.filled = Math.min(this.frameSize, this.filled + 1);
            this.untilNextFrame++;

            if (
                this.filled === this.frameSize &&
                (this.untilNextFrame >= this.hopSize ||
                    this.untilNextFrame === this.frameSize)
            ) {
                const samples = new Float32Array(this.frameSize);
                for (let i = 0; i < this.frameSize; i++)
                    samples[i] =
                        this.ring[(this.writeIndex + i) % this.frameSize];
                this.port.postMessage(
                    {
                        samples,
                        sampleRate: this.outputRate,
                        timestamp: (currentFrame + channel.length) / sampleRate,
                    },
                    [samples.buffer],
                );
                this.untilNextFrame = 0;
            }
        }
        return true;
    }
}

registerProcessor("wi-tuner-pitch-capture", WiTunerPitchCaptureProcessor);
