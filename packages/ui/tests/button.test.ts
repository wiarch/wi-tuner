import { describe, expect, it } from "vitest";

import { Button } from "../src";

describe("shared UI", () => {
    it("exports the shared button component", () => {
        expect(Button).toBeTypeOf("object");
        expect(Button.displayName).toBe("Button");
    });
});
