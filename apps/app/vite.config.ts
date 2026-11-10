import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
    css: { postcss: { plugins: [] } },
    plugins: [
        tailwindcss(),
        react(),
        VitePWA({
            registerType: "autoUpdate",
            injectRegister: "script",
            includeAssets: [
                "favicon.svg",
                "pwa-192.png",
                "pwa-512.png",
                "pwa-maskable-512.png",
                "apple-touch-icon.png",
                "audio-capture.worklet.js",
            ],
            manifest: {
                id: "/",
                name: "Wi-Tuner",
                short_name: "Wi-Tuner",
                description: "A private, local-first instrument tuner.",
                lang: "en",
                start_url: "/",
                scope: "/",
                display: "standalone",
                orientation: "portrait",
                background_color: "#f8fafc",
                theme_color: "#0f172a",
                icons: [
                    {
                        src: "pwa-192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "pwa-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "pwa-maskable-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: [
                    "**/*.{js,css,html,svg,png,ico,webmanifest,woff2}",
                ],
                navigateFallback: "index.html",
                navigateFallbackDenylist: [/^\/api\//],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
            },
        }),
    ],
});
