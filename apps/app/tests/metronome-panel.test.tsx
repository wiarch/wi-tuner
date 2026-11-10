import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import i18n from "../src/i18n";
import { MetronomePanel } from "../src/tuner/metronome-panel";

describe("metronome panel", () => {
    beforeAll(async () => {
        await i18n.changeLanguage("en");
    });

    it("renders tempo, meter, accents, sounds and the beat indicator", () => {
        const markup = renderToStaticMarkup(
            createElement(MetronomePanel, {
                bpm: 120,
                beats: 4,
                subdivision: 1,
                accents: [true, false, false, false],
                sound: "click",
                running: false,
                beatIndex: null,
                pulse: 0,
                onBpm: () => undefined,
                onBeats: () => undefined,
                onSubdivision: () => undefined,
                onAccent: () => undefined,
                onSound: () => undefined,
                onToggle: () => undefined,
                onTap: () => undefined,
            }),
        );
        expect(markup).toContain('min="30"');
        expect(markup).toContain('max="300"');
        expect(markup).toContain('value="120"');
        expect(markup).toContain("Beat 1");
        expect(markup).toContain("Beat 4");
        expect(markup).toContain("Cowbell");
        expect(markup).toContain('aria-pressed="false"');
        expect(markup).toContain('data-running="false"');
        expect(markup).toContain("Start metronome");
    });
});
