import { describe, expect, it } from "vitest";

import { landing, localizedPath, softwareApplicationLd } from "../src/content";

function shape(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(shape);
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [
                    key,
                    shape((value as Record<string, unknown>)[key]),
                ]),
        );
    }
    return typeof value;
}

describe("landing translations", () => {
    it("keeps the same structure in Spanish and English", () => {
        expect(shape(landing.en)).toEqual(shape(landing.es));
        expect(landing.es.features).toHaveLength(6);
        expect(landing.es.steps).toHaveLength(3);
        expect(landing.es.faq.length).toBeGreaterThanOrEqual(4);
        expect(landing.es.instruments).toHaveLength(
            landing.en.instruments.length,
        );
    });

    it("states the privacy promise in Spanish", () => {
        expect(landing.es.privacyBanner).toBe(
            "0 anuncios · 0 rastreadores · tu audio nunca sale de tu dispositivo",
        );
    });

    it("builds locale paths and SoftwareApplication data", () => {
        expect(localizedPath("/", "en")).toBe("/en/");
        expect(localizedPath("/privacidad", "en")).toBe("/en/privacidad/");
        expect(localizedPath("/en/contacto/", "es")).toBe("/contacto/");
        const data = softwareApplicationLd(landing.es, "https://wi-tuner.app/");
        expect(data["@type"]).toBe("SoftwareApplication");
        expect(data.name).toBe("Wi-Tuner");
        expect(data).not.toHaveProperty("aggregateRating");
    });
});
