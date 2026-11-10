import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_ROOTS = ["apps", "packages", "resources/views", "resources/js", "tests"];
const SKIP_DIRS = new Set([
    "node_modules",
    "dist",
    "android",
    "ios",
    ".astro",
    "coverage",
    "build",
]);
const TEXT_EXT = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".astro",
    ".css",
    ".html",
    ".vue",
    ".php",
    ".json",
    ".xml",
    ".svg",
    ".gradle",
    ".plist",
    ".md",
]);

export const ALLOWED_HOSTS = new Set([
    "wi-tuner.app",
    "app.wi-tuner.app",
    "play.google.com",
    "apps.apple.com",
    "schema.org",
    "www.w3.org",
    "localhost",
    "127.0.0.1",
]);

const BANNED = [
    "firebase",
    "admob",
    "google-analytics",
    "googletagmanager",
    "gtag(",
    "sentry",
    "@amplitude/",
    "amplitude.com",
    "mixpanel",
    "posthog",
    "segment.com",
    "facebook.net",
    "doubleclick",
    "advertisingId",
    "advertising_id",
    "IDFA",
    "AAID",
];

const URL_PATTERN = /https?:\/\/([^/\s"'`<>,)$]+)/gi;
const OLD_BRAND = new RegExp(["wi", "tone"].join("-"), "i");

export function unexpectedHosts(text) {
    const found = new Set();
    for (const match of text.matchAll(URL_PATTERN)) {
        const host = match[1].replace(/:\d+$/, "").toLowerCase();
        if (!ALLOWED_HOSTS.has(host)) found.add(host);
    }
    return [...found];
}

export function bannedMarkers(text) {
    const lower = text.toLowerCase();
    return BANNED.filter((marker) => lower.includes(marker.toLowerCase()));
}

function filesUnder(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = path.join(dir, entry);
        const info = statSync(full);
        if (info.isDirectory()) filesUnder(full, out);
        else if (TEXT_EXT.has(path.extname(entry))) out.push(full);
    }
    return out;
}

export function scanProductTree(root = ROOT) {
    const violations = [];
    for (const relative of SCAN_ROOTS) {
        const dir = path.join(root, relative);
        for (const file of filesUnder(dir)) {
            const text = readFileSync(file, "utf8");
            const hosts = unexpectedHosts(text);
            const markers = bannedMarkers(text);
            const oldName = OLD_BRAND.test(text);
            if (hosts.length || markers.length || oldName) {
                violations.push({
                    file: path.relative(root, file),
                    hosts,
                    markers,
                    oldName,
                });
            }
        }
    }
    for (const relative of ["docs", "README.md", "AGENTS.md"]) {
        const full = path.join(root, relative);
        const info = statSync(full);
        const files = info.isDirectory() ? filesUnder(full) : [full];
        for (const file of files) {
            if (!OLD_BRAND.test(readFileSync(file, "utf8"))) continue;
            violations.push({
                file: path.relative(root, file),
                hosts: [],
                markers: [],
                oldName: true,
            });
        }
    }
    return violations;
}

function main() {
    const violations = scanProductTree();
    if (violations.length === 0) {
        console.log("external host audit: ok");
        return;
    }
    for (const item of violations) {
        console.error(
            `${item.file}: hosts=${item.hosts.join(",") || "-"} markers=${item.markers.join(",") || "-"} oldName=${item.oldName}`,
        );
    }
    process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
