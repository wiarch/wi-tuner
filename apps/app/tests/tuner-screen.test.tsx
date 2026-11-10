import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OnboardingDialog } from "../src/tuner/onboarding";
import { resources } from "../src/locales";

describe("tuner screen components", () => {
    it("explains the microphone in two pages and no more", () => {
        const shared = {
            cancelLabel: "Cancel",
            nextLabel: "Next",
            continueLabel: "Continue to microphone",
            onCancel: () => undefined,
            onNext: () => undefined,
            onContinue: () => undefined,
        };
        const first = renderToStaticMarkup(
            createElement(OnboardingDialog, {
                ...shared,
                page: 0,
                title: resources.en.translation.onboardingTitle,
                description: resources.en.translation.onboardingBody,
            }),
        );
        const second = renderToStaticMarkup(
            createElement(OnboardingDialog, {
                ...shared,
                page: 1,
                title: resources.es.translation.privacyTitle,
                description: resources.es.translation.privacyBody,
            }),
        );
        expect(first).toContain('role="dialog"');
        expect(first).toContain("microphone");
        expect(first).toContain("Next");
        expect(first).not.toContain("Continue to microphone");
        expect(second).toContain("micrófono");
        expect(second).not.toContain(">Next<");
        expect(second).toContain("Continue to microphone");
        expect(resources.en.translation.onboardingBody.toLowerCase()).toContain(
            "microphone",
        );
        expect(resources.es.translation.privacyBody.toLowerCase()).toContain(
            "no graba",
        );
    });
});
