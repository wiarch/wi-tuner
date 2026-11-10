# Wi-Tuner

Afinador cromático con estroboscopio y metrónomo. La misma app corre en el navegador (PWA), Android e iOS. El audio se analiza en el dispositivo: no se graba y no se envía. No hay cuenta, anuncios ni analítica.

## Estructura

- `apps/app`: React, Vite, PWA, i18next, Zustand, IndexedDB y Capacitor.
- `apps/landing`: landing Astro en español e inglés.
- `packages/dsp-core`: tono, temperamentos, notación y scheduler del metrónomo.
- `packages/ui`: componentes React, Tailwind CSS v4 y Radix UI.
- `app/`, `resources/`, `routes/` y `composer.json`: Laravel heredado, fuera del producto nuevo.
- `docs/PRIVACY.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/RELEASE.md`.

## Requisitos

- Node.js 22 o superior (CI usa 24).
- pnpm 11.25.0.
- JDK 21 y Android SDK para compilar Android. Xcode en macOS para iOS.
- PHP 8.3 y Composer solo si se arranca el Laravel heredado.

## Verificar

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test` incluye la auditoría de hosts externos.

Desarrollo:

```sh
pnpm dev:app
pnpm dev:landing
```

La app queda en `http://127.0.0.1:5173` y la landing en `http://127.0.0.1:4321`.

## Privacidad

No se recopilan datos. El detalle está en [docs/PRIVACY.md](docs/PRIVACY.md). En Ajustes, «Borrar todos mis datos» vacía las preferencias, los temperamentos personalizados y la caché local tras una confirmación.

## Tiendas

Compilar y firmar: [docs/RELEASE.md](docs/RELEASE.md). Aún faltan la firma de publicación, el dominio definitivo y las cuentas de desarrollador.

## Laravel heredado

```sh
composer install
php artisan key:generate
composer run dev
```

## Licencia

[MIT](LICENSE).
