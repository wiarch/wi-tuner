import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
    StrobeDisplay,
    TunerMeter,
    TunerPalette,
    TunerReadout,
    VerticalSensitivitySlider,
    advanceStrobePhase,
    strobeBeatHz,
} from "../src";

const COLORS = {
    sharp: "#0072B2",
    flat: "#E69F00",
    inTune: "#009E73",
};

describe("tuner UI components", () => {
    it("renders a continuous, accessible cents meter and marks in-tune", () => {
        const markup = renderToStaticMarkup(
            createElement(TunerMeter, {
                cents: 0.2,
                thresholdCents: 2,
                colors: COLORS,
                label: "Pitch deviation",
            }),
        );
        expect(markup).toContain('role="meter"');
        expect(markup).toContain('aria-valuenow="0.2"');
        expect(markup).toContain(COLORS.inTune);
        expect(markup).toContain('width="10"');
    });

    it("uses the sharp and flat colors outside the threshold without a dead zone", () => {
        const sharp = renderToStaticMarkup(
            createElement(TunerMeter, {
                cents: 12.5,
                thresholdCents: 2,
                colors: COLORS,
                label: "Pitch deviation",
            }),
        );
        const flat = renderToStaticMarkup(
            createElement(TunerMeter, {
                cents: -3,
                thresholdCents: 2,
                colors: COLORS,
                label: "Pitch deviation",
            }),
        );
        expect(sharp).toContain(COLORS.sharp);
        expect(sharp).toContain('aria-valuenow="12.5"');
        expect(flat).toContain(COLORS.flat);
        expect(flat).toContain('aria-valuenow="-3"');
    });

    it("renders an accessible strobe and a keyboard-operable vertical slider", () => {
        const strobe = renderToStaticMarkup(
            createElement(StrobeDisplay, {
                cents: 3,
                frequencyHz: 440,
                overtones: 4,
                color: COLORS.sharp,
                label: "Strobe, four overtones",
            }),
        );
        const sensitivity = renderToStaticMarkup(
            createElement(VerticalSensitivitySlider, {
                value: 0.6,
                label: "Sensitivity",
                lowLabel: "Low",
                highLabel: "High",
                onChange: () => undefined,
            }),
        );
        expect(strobe).toContain('aria-label="Strobe, four overtones"');
        expect(sensitivity).toContain('type="range"');
        expect(sensitivity).toContain('aria-orientation="vertical"');
        expect(sensitivity).toContain('aria-valuenow="60"');
        expect(sensitivity).not.toContain('disabled=""');
    });

    it("disables the manual sensitivity slider while automatic mode is active", () => {
        const markup = renderToStaticMarkup(
            createElement(VerticalSensitivitySlider, {
                value: 0.5,
                label: "Sensitivity",
                lowLabel: "Low",
                highLabel: "High",
                disabled: true,
                onChange: () => undefined,
            }),
        );
        expect(markup).toContain('disabled=""');
    });

    it("keeps the needle moving inside the in-tune threshold", () => {
        const labels = {
            note: "Note",
            octave: "Octave",
            frequency: "Frequency",
            deviation: "Deviation",
        };
        const near = renderToStaticMarkup(
            createElement(TunerMeter, {
                cents: 0.4,
                thresholdCents: 2,
                colors: COLORS,
                label: "Pitch deviation",
            }),
        );
        const closer = renderToStaticMarkup(
            createElement(TunerMeter, {
                cents: 1.6,
                thresholdCents: 2,
                colors: COLORS,
                label: "Pitch deviation",
            }),
        );
        expect(near).toContain('aria-valuenow="0.4"');
        expect(closer).toContain('aria-valuenow="1.6"');
        expect(near).toContain(COLORS.inTune);
        expect(closer).toContain(COLORS.inTune);
        const readout = renderToStaticMarkup(
            createElement(TunerReadout, {
                note: "A",
                octave: 4,
                frequencyHz: 440.5,
                cents: 1.6,
                inTune: true,
                labels,
            }),
        );
        expect(readout).toContain("Note");
        expect(readout).toContain("Octave");
        expect(readout).toContain("Frequency");
        expect(readout).toContain("Deviation");
        expect(readout).toContain("A4");
        expect(readout).toContain("440.50 Hz");
        expect(readout).toContain("+1.6");
        expect(readout).toContain('data-in-tune="true"');
    });

    it("stops the strobe at zero cents and offers a colorblind-safe palette", () => {
        expect(strobeBeatHz(440, 0)).toBe(0);
        expect(advanceStrobePhase(0.25, 0, 1 / 60)).toBeCloseTo(0.25);
        expect(strobeBeatHz(440, 2)).toBeGreaterThan(0.4);
        expect(strobeBeatHz(440, -2)).toBeLessThan(-0.4);
        const palette = renderToStaticMarkup(
            createElement(TunerPalette, {
                groupLabel: "Color palette",
                value: COLORS,
                onChange: () => undefined,
                options: [
                    {
                        id: "okabe-ito",
                        label: "Blue, orange and green",
                        colors: COLORS,
                    },
                ],
            }),
        );
        expect(palette).toContain('type="radio"');
        expect(palette).toContain("Blue, orange and green");
        expect(palette).toContain("checked");
    });
});
