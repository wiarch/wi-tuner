# Decisiones de arquitectura

## Fase 0: transición segura al monorepo

- Se conserva la aplicación Laravel existente en la raíz: eliminarla o moverla ahora podría romper rutas, datos y despliegues. La nueva app y la landing viven en `apps/`; DSP y UI compartidos en `packages/`.
- El nombre público y técnico queda normalizado como Wi-Tuner, `wi-tuner`, `@wi-tuner/*` y `com.wituner.app`.
- La fase crea esqueletos ejecutables y verificables. No implementa aún afinación con micrófono, estroboscopio, metrónomo completo ni empaquetado nativo.
- La detección de idioma limita la interfaz a español e inglés; usa el idioma del sistema cuando está disponible y cae a inglés.
- Los paquetes compartidos se compilan antes que las apps mediante dependencias de tareas de Turborepo.
