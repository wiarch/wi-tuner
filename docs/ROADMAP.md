# Wi-Tuner — Roadmap

Las casillas reflejan trabajo implementado y verificado, no solo intención.

## Fase 0 — Cimientos

- [x] Adoptar Wi-Tuner como identidad en código, paquetes, interfaz, documentación y CI.
- [x] Establecer pnpm workspaces y Turborepo.
- [x] Configurar TypeScript estricto, ESLint, Prettier y Vitest.
- [x] Crear workspaces iniciales para app, landing, DSP y UI.
- [x] Preparar app bilingüe y PWA, y landing en inglés y español.
- [x] Registrar la transición reversible desde Laravel en `docs/DECISIONS.md`.
- [ ] Validar permisos de micrófono y el shell offline en dispositivos reales.

## Fase 1 — Afinador confiable

- [ ] Integrar detección de tono en tiempo real en la app.
- [ ] Añadir suavizado e histéresis para estabilizar nota y cents.
- [ ] Tratar silencio, ruido, señal débil, clipping y notas simultáneas.
- [ ] Implementar calibración A4 y selector cromático/por cuerda.
- [ ] Probar guitarra y bajo en navegadores y micrófonos reales.
- [ ] Completar el modo estroboscópico con mediciones reales de latencia.

## Fase 2 — Instrumentos y práctica

- [ ] Ampliar presets de guitarra y bajo, y añadir ukelele y violín.
- [ ] Mejorar metrónomo, tonos de referencia y accesibilidad.
- [ ] Guardar preferencias locales y habilitar borrar datos locales.
- [ ] Verificar comportamiento offline y recuperación de permisos.

## Fase 3 — Plataformas

- [ ] Crear proyectos nativos Android e iOS con Capacitor.
- [ ] Validar micrófono, latencia, instalación y actualizaciones en dispositivos.
