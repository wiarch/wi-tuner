import assert from "node:assert/strict";
import test from "node:test";

import {
    bannedMarkers,
    unexpectedHosts,
} from "../../scripts/check-external-hosts.mjs";

test("allows first-party and store hosts only", () => {
    const bunny = ["fonts", "bunny.net"].join(".");
    const tag = ["google", "tagmanager"].join("");
    const adId = ["ID", "FA"].join("");
    const product = ["@amplitude", "/analytics"].join("");
    assert.deepEqual(
        unexpectedHosts(
            "see https://wi-tuner.app/privacidad/ and https://play.google.com/store",
        ),
        [],
    );
    assert.deepEqual(unexpectedHosts(`https://${bunny}/css`), [bunny]);
    const sdk = ["@amplitude", "/"].join("");
    assert.deepEqual(bannedMarkers(`load ${tag} and ${adId} ${product}`), [
        tag,
        sdk,
        adId,
    ]);
});
