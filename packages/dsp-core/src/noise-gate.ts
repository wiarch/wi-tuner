export interface NoiseGateOptions {
    openingRms?: number;
    openingRatio?: number;
    closingRatio?: number;
    noiseFloorSmoothing?: number;
    targetRms?: number;
    maxGain?: number;
    minGain?: number;
    agcSmoothing?: number;
}
export interface GateFrame {
    open: boolean;
    rms: number;
    noiseFloor: number;
    threshold: number;
    gain: number;
    gatedRms: number;
}

/** Adaptive hysteresis gate plus bounded RMS AGC. Inputs are pre-AGC RMS values. */
export class AdaptiveNoiseGate {
    private open = false;
    private noiseFloor: number;
    private gain: number;
    private readonly openingRms: number;
    private readonly openingRatio: number;
    private readonly closingRatio: number;
    private readonly noiseSmoothing: number;
    private readonly targetRms: number;
    private readonly maxGain: number;
    private readonly minGain: number;
    private readonly agcSmoothing: number;

    constructor(options: NoiseGateOptions = {}) {
        this.openingRms = options.openingRms ?? 0.012;
        this.openingRatio = options.openingRatio ?? 3;
        this.closingRatio = options.closingRatio ?? 1.7;
        this.noiseSmoothing = options.noiseFloorSmoothing ?? 0.08;
        this.targetRms = options.targetRms ?? 0.12;
        this.maxGain = options.maxGain ?? 8;
        this.minGain = options.minGain ?? 0.25;
        this.agcSmoothing = options.agcSmoothing ?? 0.15;
        const unitValues = [this.noiseSmoothing, this.agcSmoothing];
        const positiveValues = [
            this.openingRms,
            this.openingRatio,
            this.closingRatio,
            this.targetRms,
            this.minGain,
            this.maxGain,
        ];
        if (
            positiveValues.some(
                (value) => !Number.isFinite(value) || value <= 0,
            ) ||
            this.openingRatio <= 1 ||
            this.closingRatio <= 1 ||
            this.closingRatio >= this.openingRatio ||
            unitValues.some(
                (value) => !Number.isFinite(value) || value <= 0 || value > 1,
            ) ||
            this.maxGain < this.minGain
        ) {
            throw new RangeError("Invalid noise gate configuration");
        }
        this.noiseFloor = this.openingRms / this.openingRatio;
        this.gain = 1;
    }

    process(rms: number): GateFrame {
        if (!Number.isFinite(rms) || rms < 0)
            throw new RangeError("RMS must be a non-negative finite value");
        const openingThreshold = Math.max(
            this.openingRms,
            this.noiseFloor * this.openingRatio,
        );
        const closingThreshold = Math.max(
            this.openingRms * 0.5,
            this.noiseFloor * this.closingRatio,
        );
        if (this.open ? rms < closingThreshold : rms >= openingThreshold)
            this.open = !this.open;

        if (!this.open)
            this.noiseFloor +=
                (Math.max(rms, 1e-6) - this.noiseFloor) * this.noiseSmoothing;
        if (rms > 1e-6) {
            const desiredGain = Math.max(
                this.minGain,
                Math.min(this.maxGain, this.targetRms / rms),
            );
            const smoothing =
                desiredGain < this.gain
                    ? Math.min(0.8, this.agcSmoothing * 2)
                    : this.agcSmoothing;
            this.gain += (desiredGain - this.gain) * smoothing;
        }
        return {
            open: this.open,
            rms,
            noiseFloor: this.noiseFloor,
            threshold: this.open ? closingThreshold : openingThreshold,
            gain: this.gain,
            gatedRms: this.open ? Math.min(1, rms * this.gain) : 0,
        };
    }

    reset(): void {
        this.open = false;
        this.noiseFloor = this.openingRms / this.openingRatio;
        this.gain = 1;
    }

    get isOpen(): boolean {
        return this.open;
    }
    get currentGain(): number {
        return this.gain;
    }
}
