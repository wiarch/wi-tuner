import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
    site: "https://wi-tuner.app",
    trailingSlash: "always",
    i18n: {
        defaultLocale: "es",
        locales: ["es", "en"],
        routing: {
            prefixDefaultLocale: false,
        },
    },
    integrations: [
        sitemap({
            i18n: {
                defaultLocale: "es",
                locales: { es: "es", en: "en" },
            },
        }),
    ],
    vite: {
        plugins: [tailwindcss()],
        css: { postcss: { plugins: [] } },
    },
});
