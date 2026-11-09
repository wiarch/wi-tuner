export interface TemperamentDefinition {
    id: string;
    name: string;
    /** Pitch-class offsets from equal temperament, indexed C through B. */
    offsetsCents: readonly number[];
    description?: string;
}

const makeTemperament = (
    id: string,
    name: string,
    offsetsCents: number[],
    description?: string,
): TemperamentDefinition => ({
    id,
    name,
    offsetsCents: Object.freeze(offsetsCents),
    ...(description ? { description } : {}),
});

export const TEMPERAMENTS: Readonly<Record<string, TemperamentDefinition>> =
    Object.freeze({
        equal: makeTemperament("equal", "Equal temperament", Array(12).fill(0)),
        just: makeTemperament(
            "just",
            "5-limit just intonation (C major)",
            [
                0, 11.731, 3.91, 15.641, -13.686, -1.955, -9.776, 1.955, 13.686,
                -15.641, 17.596, -11.731,
            ],
        ),
        pythagorean: makeTemperament(
            "pythagorean",
            "Pythagorean",
            [
                0, 13.686, 3.91, 17.596, -13.686, -1.955, 11.731, 1.955, 15.641,
                -15.641, 13.686, -11.731,
            ],
        ),
        meantone: makeTemperament(
            "meantone",
            "Quarter-comma meantone",
            [
                0, -10.345, -3.421, -13.686, -6.842, 3.421, -6.842, -3.421,
                -13.686, -10.345, -3.421, -6.842,
            ],
        ),
        werckmeister: makeTemperament(
            "werckmeister",
            "Werckmeister III",
            [0, 0, 3.91, 1.955, -1.955, 1.955, -1.955, 1.955, 0, 3.91, 0, 0],
        ),
        kirnberger: makeTemperament(
            "kirnberger",
            "Kirnberger III",
            [0, -3.91, 3.91, 0, -3.91, 0, -3.91, 1.955, 0, -3.91, 0, -3.91],
        ),
        vallotti: makeTemperament(
            "vallotti",
            "Vallotti",
            [
                0, -5.865, 1.955, -3.91, -1.955, 1.955, -5.865, 0, -3.91,
                -1.955, -3.91, -1.955,
            ],
        ),
        young: makeTemperament(
            "young",
            "Young II",
            [
                0, -3.91, 1.955, -1.955, -3.91, 1.955, -3.91, 0, -1.955, -3.91,
                -1.955, -3.91,
            ],
        ),
    });

export function createTemperament(
    input: TemperamentDefinition,
): TemperamentDefinition | null {
    if (
        !input ||
        typeof input.id !== "string" ||
        !/^[a-z0-9][a-z0-9-]{0,47}$/i.test(input.id)
    )
        return null;
    if (
        typeof input.name !== "string" ||
        input.name.trim().length < 1 ||
        input.name.length > 100
    )
        return null;
    if (!Array.isArray(input.offsetsCents) || input.offsetsCents.length !== 12)
        return null;
    if (
        input.offsetsCents.some(
            (value) => !Number.isFinite(value) || Math.abs(value) > 100,
        )
    )
        return null;
    if (
        input.description !== undefined &&
        (typeof input.description !== "string" ||
            input.description.length > 500)
    )
        return null;
    return makeTemperament(
        input.id,
        input.name.trim(),
        [...input.offsetsCents],
        input.description,
    );
}

export function exportTemperament(temperament: TemperamentDefinition): string {
    const validated = createTemperament(temperament);
    if (!validated) throw new TypeError("Invalid temperament definition");
    return JSON.stringify({ version: 1, temperament: validated }, null, 2);
}

export function importTemperament(json: string): TemperamentDefinition | null {
    if (typeof json !== "string" || json.length > 20_000) return null;
    try {
        const parsed: unknown = JSON.parse(json);
        if (
            !parsed ||
            typeof parsed !== "object" ||
            !("version" in parsed) ||
            !("temperament" in parsed)
        )
            return null;
        if (
            parsed.version !== 1 ||
            !parsed.temperament ||
            typeof parsed.temperament !== "object"
        )
            return null;
        return createTemperament(parsed.temperament as TemperamentDefinition);
    } catch {
        return null;
    }
}
