# Wi-Tuner

**Afinador cromático y herramientas de práctica, con procesamiento de audio local.**

Wi-Tuner ayuda a afinar instrumentos con claridad desde el navegador y prepara una misma base para web, PWA y futuras aplicaciones móviles. El audio del afinador se analizará en el dispositivo y no se grabará ni se transmitirá.

> Estado: Fase 0. El repositorio conserva temporalmente la aplicación Laravel existente y añade los cimientos del nuevo monorepo. La app React y la landing están inicializadas; el flujo completo de afinación, el modo estroboscópico y las plataformas nativas se desarrollarán en fases posteriores.

## Estructura

- `apps/app`: aplicación React + Vite, PWA, i18next, Zustand, IndexedDB y configuración de Capacitor.
- `apps/landing`: landing Astro con contenido en español e inglés.
- `packages/dsp-core`: motor musical y DSP en TypeScript puro.
- `packages/ui`: componentes React compartidos, Tailwind CSS v4 y Radix UI.
- `app/`, `resources/`, `routes/` y `composer.json`: aplicación Laravel existente, conservada durante la transición.
- `docs/DECISIONS.md`: decisiones de migración y alcance.

## Requisitos

- Node.js 22.23.4 o superior.
- pnpm 11.25.0.
- PHP 8.3 y Composer para ejecutar la aplicación Laravel conservada.

## Preparar y verificar el monorepo

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Desarrollo de la nueva app y landing:

```sh
pnpm dev:app
pnpm dev:landing
```

La app muestra por ahora la estructura del producto, detecta inglés o español, instala su service worker y usa los paquetes compartidos. El afinador con micrófono se implementará en la siguiente fase.

## Aplicación Laravel conservada

La aplicación anterior se mantiene para no eliminar rutas, datos o pantallas durante la transición. Para iniciarla, instala Composer, configura `.env` y ejecuta:

```sh
composer install
php artisan key:generate
pnpm install
composer run dev
```

Su interfaz heredada no representa aún el diseño final de Wi-Tuner. La extracción o eliminación de módulos antiguos se hará con una migración revisada y reversible.

## Privacidad y seguridad

- El acceso al micrófono requiere consentimiento del navegador y un contexto HTTPS seguro.
- La captura futura debe desactivar echo cancellation, noise suppression y automatic gain control.
- El audio se procesa en memoria en el dispositivo; no se graba ni se transmite.
- Las preferencias se almacenan localmente y la app ofrecerá una acción para borrar los datos locales.
- No hay analítica de terceros, anuncios ni SDK publicitarios.

Consulta [SECURITY.md](docs/SECURITY.md), [PRODUCT.md](docs/PRODUCT.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md) y [ROADMAP.md](docs/ROADMAP.md).

## Licencia

Este proyecto se distribuye bajo la [licencia MIT](LICENSE) y forma parte del ecosistema WI Arch.
