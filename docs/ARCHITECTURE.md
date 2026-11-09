# Wi-Tuner — Arquitectura

## Estado de Fase 0

El repositorio empieza una transición gradual. La aplicación Laravel existente se conserva temporalmente para proteger sus rutas y datos; la nueva arquitectura vive en los workspaces y no depende del backend Laravel.

## Monorepo

- `apps/app`: React 19, Vite, TypeScript, PWA, i18next, Zustand, idb-keyval y Capacitor.
- `apps/landing`: Astro y Tailwind CSS.
- `packages/dsp-core`: cálculo musical y procesamiento DSP en TypeScript puro, sin dependencias de UI.
- `packages/ui`: componentes React compartidos con Tailwind CSS v4 y Radix UI.
- Turborepo orquesta build, test, lint y typecheck. pnpm administra dependencias y workspaces.

## Límites técnicos

El motor DSP no puede depender de React, DOM, APIs de audio ni almacenamiento. La app obtiene muestras del micrófono con consentimiento y pasa buffers en memoria al motor. Cualquier implementación de captura debe usar `echoCancellation: false`, `noiseSuppression: false` y `autoGainControl: false`, y liberar pistas y nodos cuando se detenga.

La landing no accede al micrófono. La app y la PWA comparten el mismo código que después empaquetará Capacitor para Android e iOS.

## Aplicación heredada

Laravel, Blade y sus módulos de canciones, contactos y planes se mantienen en la raíz durante la transición. No se consideran parte del nuevo producto. Su extracción se hará en una fase aparte, con inventario de rutas, datos y usuarios, y un plan de rollback.
