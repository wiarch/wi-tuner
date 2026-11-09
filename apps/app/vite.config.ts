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
            includeAssets: ["favicon.svg"],
            manifest: {
                name: "Wi-Tuner",
                short_name: "Wi-Tuner",
                description: "A private, local-first instrument tuner.",
                start_url: "/",
                scope: "/",
                display: "standalone",
                background_color: "#f8fafc",
                theme_color: "#0f172a",
                icons: [
                    {
                        src: "/favicon.svg",
                        sizes: "any",
                        type: "image/svg+xml",
                        purpose: "any",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
            },
        }),
    ],
});
