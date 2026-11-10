import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const csp =
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

describe("security headers", () => {
    it("publishes the same strict policy for Cloudflare Pages and Vercel", () => {
        const headers = readFileSync(
            new URL("../public/_headers", import.meta.url),
            "utf8",
        );
        const vercel = readFileSync(
            new URL("../vercel.json", import.meta.url),
            "utf8",
        );
        expect(headers).toContain(csp);
        expect(vercel).toContain(csp);
        expect(headers).not.toContain("unsafe-eval");
        expect(vercel).not.toContain("unsafe-eval");
        expect(headers).not.toContain("googleapis");
        expect(vercel).not.toContain("googleapis");
    });
});
