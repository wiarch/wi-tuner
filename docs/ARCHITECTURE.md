# Wi-Tuner — Arquitectura

## Monorepo

- `apps/app`: React 19, Vite, TypeScript, PWA, i18next, Zustand, idb-keyval y Capacitor (`com.wituner.app`).
- `apps/landing`: Astro, Tailwind CSS, español en `/` e inglés en `/en/`.
- `packages/dsp-core`: detección de tono, temperamentos, notación y el scheduler del metrónomo. TypeScript puro, sin UI ni audio.
- `packages/ui`: componentes React compartidos, Tailwind CSS v4 y Radix UI.
- Turborepo orquesta build, test, lint y typecheck. pnpm administra los workspaces.

## Afinador y metrónomo

La app pide el micrófono con `echoCancellation`, `noiseSuppression` y `autoGainControl` en falso. Un AudioWorklet entrega ventanas en memoria al motor YIN. El metrónomo usa otro `AudioContext` y el scheduler de `dsp-core`. Nada de ese audio se graba ni se envía.

Las preferencias viven en IndexedDB en la web y en Capacitor Preferences en el dispositivo. «Borrar todos mis datos» vacía esos almacenes, la caché y los temperamentos personalizados, después de una confirmación.

## Empaquetado

`vite-plugin-pwa` genera el service worker. Capacitor publica `android/` e `ios/` desde `apps/app/dist`. La landing no pide el micrófono. Cómo compilar y firmar está en `docs/RELEASE.md`. La privacidad está en `docs/PRIVACY.md`.

## Aplicación heredada

Laravel, Blade y sus módulos de canciones, contactos y planes siguen en la raíz. No forman parte del producto nuevo. No cargan fuentes ni scripts de terceros. Su extracción queda para una migración aparte, con inventario y rollback.
