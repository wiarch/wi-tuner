# Decisiones de arquitectura

## Fase 0: transición segura al monorepo

- Se conserva la aplicación Laravel existente en la raíz: eliminarla o moverla ahora podría romper rutas, datos y despliegues. La nueva app y la landing viven en `apps/`; DSP y UI compartidos en `packages/`.
- El nombre público y técnico queda normalizado como Wi-Tuner, `wi-tuner`, `@wi-tuner/*` y `com.wituner.app`.
- La fase crea esqueletos ejecutables y verificables. No implementa aún afinación con micrófono, estroboscopio, metrónomo completo ni empaquetado nativo.
- La detección de idioma limita la interfaz a español e inglés; usa el idioma del sistema cuando está disponible y cae a inglés.
- Los paquetes compartidos se compilan antes que las apps mediante dependencias de tareas de Turborepo.

## Fase 1: DSP y música

- La detección usa YIN con diferencia normalizada acumulada y ajuste parabólico de la curva local; procesa frames en memoria y rechaza señales con claridad insuficiente.
- Los temperamentos guardan desvíos por clase de nota relativos al temperamento igual, anclados a la frecuencia A4 elegida para que el control de referencia siga siendo exacto.
- El scheduler del metrónomo no crea intervalos ni temporizadores: el host lo consulta con su reloj de audio y agenda eventos dentro de la ventana lookahead.
- Los instrumentos se describen por presets de cuerda; piano tiene su rango de 88 notas, mientras que el modo cromático no impone cuerdas.

## Fase 2: captura de audio

- La app mantiene una máquina de estados única y delega la captura mediante `AudioInputProvider`, de modo que un proveedor nativo pueda sustituir al proveedor Web Audio.
- El navegador captura con `AudioWorklet`; las opciones de echo cancellation, reducción de ruido y AGC del navegador quedan desactivadas. El DSP recibe solo buffers en memoria.
- El worklet produce ventanas de 40 ms con saltos de 20 ms, es decir, hasta 50 actualizaciones por segundo; la app informa la latencia de ventana más el tiempo de análisis medido.
- El watchdog consulta cada 200 ms y reinicia el stream y el contexto si pasan más de 1 s sin frames. El regreso a primer plano, cambios de dispositivo o permiso e interrupciones del contexto pasan por la misma ruta de recuperación.
- El sample rate interno se solicita entre 8 y 48 kHz; el worklet aplica decimación por bloques si el contexto entrega una tasa superior.
