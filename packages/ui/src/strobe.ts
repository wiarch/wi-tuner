/** Beat frequency between a measured pitch and the target implied by `cents`. */
export function strobeBeatHz(frequencyHz: number, cents: number): number {
    if (
        !Number.isFinite(frequencyHz) ||
        frequencyHz <= 0 ||
        !Number.isFinite(cents)
    )
        return 0;
    return frequencyHz * (1 - 2 ** (-cents / 1200));
}

/** Advance a strobe cycle by the beat. A zero beat leaves the pattern still. */
export function advanceStrobePhase(
    phase: number,
    beatHz: number,
    seconds: number,
): number {
    const step =
        Number.isFinite(phase) &&
        Number.isFinite(beatHz) &&
        Number.isFinite(seconds)
            ? beatHz * seconds
            : 0;
    return (phase + step + 10_000) % 1;
}
