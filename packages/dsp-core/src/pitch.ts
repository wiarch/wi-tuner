export const MIN_PITCH_HZ = 25;
export const MAX_PITCH_HZ = 4_500;

export interface PitchEstimate {
    frequency: number;
    clarity: number;
    rms: number;
}

export interface PitchOptions {
    minFrequency?: number;
    maxFrequency?: number;
    /** RMS floor used to reject silence and extremely low-level input. */
    silenceThreshold?: number;
    /** Minimum YIN clarity (1 - normalized difference) accepted as a pitch. */
    minimumClarity?: number;
}

/** YIN difference function with CMND thresholding and parabolic lag refinement. */
export function detectPitch(
    buffer: ArrayLike<number>,
    sampleRate: number,
    options: PitchOptions = {},
): PitchEstimate | null {
    const minFrequency = options.minFrequency ?? MIN_PITCH_HZ;
    const maxFrequency = options.maxFrequency ?? MAX_PITCH_HZ;
    const silenceThreshold = options.silenceThreshold ?? 0.004;
    const minimumClarity = options.minimumClarity ?? 0.78;
    if (
        !buffer ||
        buffer.length < 128 ||
        !Number.isFinite(sampleRate) ||
        sampleRate <= 0
    )
        return null;
    if (
        !Number.isFinite(minFrequency) ||
        minFrequency < MIN_PITCH_HZ ||
        !Number.isFinite(maxFrequency) ||
        maxFrequency > MAX_PITCH_HZ ||
        minFrequency >= maxFrequency
    )
        return null;
    if (
        !Number.isFinite(silenceThreshold) ||
        silenceThreshold < 0 ||
        !Number.isFinite(minimumClarity) ||
        minimumClarity < 0 ||
        minimumClarity > 1
    )
        return null;

    // Keep the decimated sample rate above Nyquist for the requested top frequency.
    const decimation = Math.max(1, Math.floor(sampleRate / (maxFrequency * 8)));
    const sampleCount = Math.floor(buffer.length / decimation);
    if (sampleCount < 64) return null;
    const samples = new Float64Array(sampleCount);
    let mean = 0;
    for (let i = 0; i < sampleCount; i++) {
        const value = Number(buffer[i * decimation]);
        if (!Number.isFinite(value)) return null;
        samples[i] = value;
        mean += value;
    }
    mean /= sampleCount;
    let energy = 0;
    for (let i = 0; i < sampleCount; i++) {
        const centered = (samples[i] ?? 0) - mean;
        samples[i] = centered;
        energy += centered * centered;
    }
    const rms = Math.sqrt(energy / sampleCount);
    if (rms < silenceThreshold) return null;

    const effectiveRate = sampleRate / decimation;
    if (maxFrequency >= effectiveRate / 2) return null;
    const minLag = Math.max(2, Math.floor(effectiveRate / maxFrequency));
    const maxLag = Math.min(
        Math.ceil(effectiveRate / minFrequency),
        Math.floor(sampleCount / 2),
    );
    if (maxLag <= minLag) return null;

    const difference = new Float64Array(maxLag + 1);
    for (let lag = 1; lag <= maxLag; lag++) {
        let sum = 0;
        const overlap = sampleCount - lag;
        for (let i = 0; i < overlap; i++) {
            const delta = (samples[i] ?? 0) - (samples[i + lag] ?? 0);
            sum += delta * delta;
        }
        difference[lag] = sum / overlap;
    }

    const cmnd = new Float64Array(maxLag + 1);
    let runningSum = 0;
    for (let lag = 1; lag <= maxLag; lag++) {
        runningSum += difference[lag] ?? 0;
        cmnd[lag] =
            runningSum === 0
                ? 1
                : ((difference[lag] ?? 0) * (lag - minLag + 1)) / runningSum;
    }

    let selectedLag = -1;
    const threshold = 0.12;
    for (let lag = minLag; lag <= maxLag; lag++) {
        if ((cmnd[lag] ?? 1) < threshold) {
            while (lag < maxLag && (cmnd[lag + 1] ?? 1) < (cmnd[lag] ?? 1))
                lag++;
            selectedLag = lag;
            break;
        }
    }
    if (selectedLag < 0) {
        let lowest = Infinity;
        for (let lag = minLag; lag <= maxLag; lag++) {
            if ((cmnd[lag] ?? 1) < lowest) {
                lowest = cmnd[lag] ?? 1;
                selectedLag = lag;
            }
        }
    }
    const clarity = 1 - (cmnd[selectedLag] ?? 1);
    if (selectedLag < 0 || clarity < minimumClarity) return null;

    // The YIN threshold selects the period; parabolic interpolation on the
    // local difference valley has less bias than interpolating the cumulative curve.
    const left = difference[selectedLag - 1] ?? difference[selectedLag] ?? 0;
    const center = difference[selectedLag] ?? 0;
    const right = difference[selectedLag + 1] ?? difference[selectedLag] ?? 0;
    const denominator = left - 2 * center + right;
    const shift =
        Math.abs(denominator) < 1e-12
            ? 0
            : (0.5 * (left - right)) / denominator;
    const refinedLag = selectedLag + Math.max(-1, Math.min(1, shift));
    const frequency = effectiveRate / refinedLag;
    if (!Number.isFinite(frequency)) return null;
    const boundaryTolerance = 0.005;
    if (
        frequency < minFrequency * (1 - boundaryTolerance) ||
        frequency > maxFrequency * (1 + boundaryTolerance)
    )
        return null;
    const boundedFrequency = Math.max(
        minFrequency,
        Math.min(maxFrequency, frequency),
    );
    return {
        frequency: boundedFrequency,
        clarity: Math.max(0, Math.min(1, clarity)),
        rms,
    };
}
