Crea el archivo AGENTS.md en la raíz con el siguiente contenido exacto, y haz commit.

# Wi-Tuner: contexto permanente

Producto: afinador cromático (con estroboscópico real) y metrónomo. Se entrega como app móvil (Android + iOS), versión web (PWA) y landing. Nombre visible "Wi-Tuner", slug `wi-tuner`, scope npm `@wi-tuner/*`, bundle id `com.wituner.app`.

## Stack (obligatorio)
- Monorepo pnpm workspaces + Turborepo, TypeScript estricto.
- packages/dsp-core: motor DSP en TS puro (detección de tono, afinaciones, temperamentos, notación, scheduler del metrónomo). Sin dependencias de UI.
- packages/ui: React 19 + Tailwind v4 + Radix UI.
- apps/app: Vite + React + TS, PWA offline (vite-plugin-pwa), Zustand, i18next (es/en), idb-keyval. Capacitor para Android/iOS con el mismo código.
- apps/landing: Astro + Tailwind, es/en.
- Calidad: Vitest, Playwright, ESLint + Prettier, GitHub Actions.

## Reglas de producto
- Web y móvil deben comportarse exactamente igual (un solo código de funcionalidad).
- Cero anuncios, cero SDK publicitarios, cero IDs de dispositivo, cero analítica de terceros por defecto.
- El audio se procesa solo en memoria y en el dispositivo. Nunca se graba ni se transmite.
- Sin cuentas. Todo se guarda localmente. Debe existir "Borrar todos mis datos".
- Diseño y textos originales; no copiar marca, textos ni código de otras apps.
- Micrófono: echoCancellation, noiseSuppression y autoGainControl en false.
- Accesibilidad WCAG AA, modo claro/oscuro, responsive.

## Flujo de trabajo
- Trabaja de forma autónoma; ante la duda decide y anótalo en docs/DECISIONS.md.
- Un commit por fase con mensaje claro.
- Antes de dar una fase por terminada: lint, typecheck y tests en verde.
- Al final de cada fase entrega un resumen corto: qué hiciste, cómo probarlo y qué queda pendiente.