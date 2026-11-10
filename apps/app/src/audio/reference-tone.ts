const HARMONICS = 12;
const MAX_HARMONIC_HZ = 12_000;

/** Partials used by the reference tone. Upper partials keep low notes audible. */
export function referencePartialFrequencies(frequency: number): number[] {
    if (!Number.isFinite(frequency) || frequency <= 0) return [];
    const partials: number[] = [];
    for (let harmonic = 1; harmonic <= HARMONICS; harmonic++) {
        const partial = frequency * harmonic;
        if (partial > MAX_HARMONIC_HZ) break;
        partials.push(partial);
    }
    return partials;
}

type AudioContextConstructor = new () => AudioContext;

function audioContextConstructor(): AudioContextConstructor | null {
    if (typeof window === "undefined") return null;
    const candidates = window as typeof window & {
        webkitAudioContext?: AudioContextConstructor;
    };
    return candidates.AudioContext ?? candidates.webkitAudioContext ?? null;
}

/**
 * Plays a short additive reference tone. The caller invokes this from a user gesture.
 *
 * Twelve decaying harmonics keep the pitch audible on phone speakers even for
 * low notes such as a bass E1, where the fundamental alone is nearly silent.
 */
export function playReferenceTone(frequency: number): () => void {
    if (!Number.isFinite(frequency) || frequency <= 0) return () => undefined;
    const AudioContextClass = audioContextConstructor();
    if (!AudioContextClass) return () => undefined;

    let context: AudioContext;
    try {
        context = new AudioContextClass();
    } catch {
        return () => undefined;
    }

    const master = context.createGain();
    const now = context.currentTime;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
    master.gain.setTargetAtTime(0.0001, now + 2.2, 0.08);
    master.connect(context.destination);

    const oscillators: OscillatorNode[] = [];
    for (const harmonicFrequency of referencePartialFrequencies(frequency)) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = harmonicFrequency;
        const harmonic = Math.max(1, Math.round(harmonicFrequency / frequency));
        // A gentle roll-off preserves the fundamental while giving low notes
        // enough upper energy to survive small device speakers.
        gain.gain.value = 1 / harmonic ** 1.25;
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(now);
        oscillator.stop(now + 2.8);
        oscillators.push(oscillator);
    }
    void context.resume().catch(() => undefined);

    let stopped = false;
    return () => {
        if (stopped) return;
        stopped = true;
        for (const oscillator of oscillators) {
            try {
                oscillator.stop();
            } catch {
                /* already stopped */
            }
        }
        master.disconnect();
        if (context.state !== "closed")
            void context.close().catch(() => undefined);
    };
}
