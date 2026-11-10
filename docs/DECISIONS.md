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

## Fase 3: interfaz y preferencias

- La pantalla principal calcula la lectura final desde la frecuencia DSP y aplica en presentación la notación, transposición y temperamento seleccionados; el motor de audio permanece independiente de las preferencias visuales.
- La aguja representa cents de forma continua; únicamente el color de estado usa el umbral configurable (2 cents por defecto). La paleta inicial azul/naranja/verde evita depender de rojo y verde como única distinción.
- El estroboscopio usa `requestAnimationFrame` y filas de armónicos en canvas, limitadas a cuatro sobretonos; mantiene su ciclo mientras actualiza la fase desde la lectura reciente.
- Las preferencias se guardan localmente con idb-keyval. La primera solicitud de micrófono se precede por dos pantallas cortas sobre propósito y privacidad; no hay audio grabado ni transmitido.
- La referencia sonora sintetiza hasta doce armónicos decrecientes en el navegador y se detiene automáticamente; no se descargan muestras. Los parciales agudos mantienen audible una nota grave.
- En modo instrumento, la aguja y los cents siguen la cuerda más cercana. La transposición cambia solo el nombre escrito; el objetivo sonoro no se desplaza.
- El bloqueo de filtro acepta solo lecturas dentro de ±150 cents del tono sostenido, así un armónico u otra nota no roba la aguja. El bloqueo de nota vale solo durante la sesión.
- El estroboscopio avanza un ciclo por cada hercio de batido y queda quieto a 0 cents. La pantalla usa el color de afinado solo dentro del umbral; la aguja no tiene zona muerta.

## Fase 4: metrónomo

- El metrónomo usa el scheduler de `dsp-core` y agenda los clics con `currentTime` de su propio `AudioContext`. El afinador mantiene otro contexto para el micrófono, así que uno puede suspenderse sin parar al otro.
- El host consulta el scheduler cada 25 ms con una ventana de 100 ms. Un poll tardío descarta los pulsos ya vencidos y el siguiente clic sigue en la rejilla del reloj de audio.
- La pantalla permanece activa con la Wake Lock API mientras el metrónomo corre. En móvil, cada pulso principal dispara `@capacitor/haptics`; en la web esa llamada no se hace.
- Los clics se sintetizan en el dispositivo. No hay muestras descargadas.

## Fase 5: empaquetado

- El service worker lo genera `vite-plugin-pwa` en el build y se registra con un script externo (`injectRegister: "script"`), para que la CSP pueda usar `script-src 'self'` sin `unsafe-inline` ni `unsafe-eval`. `style-src` admite `'unsafe-inline'` porque React escribe atributos `style`.
- No hay fuentes descargadas. La interfaz usa la pila del sistema. `font-src 'self'` no autoriza un CDN.
- Las cabeceras viven en `apps/app/public/_headers` (Cloudflare Pages las copia al directorio publicado) y en `apps/app/vercel.json`.
- En la web las preferencias siguen en idb-keyval. En Android e iOS el mismo almacén usa `@capacitor/preferences`. El bloqueo de nota sigue sin persistir.
- Exportar un temperamento en la web descarga el JSON. En el dispositivo se escribe en la caché con Filesystem y se entrega con Share. Importar en el dispositivo vuelve a leer ese archivo con Filesystem.
- El metrónomo mantiene la pantalla con Wake Lock en la web y con `@capacitor-community/keep-awake` en el dispositivo. `@capacitor/keep-awake` no está publicado en npm.
- Los iconos PNG son propios, generados por `apps/app/scripts/render-icons.mjs`. No se reutiliza arte de otra app.

## Fase 6: landing

- El idioma es una página (`/` y `/en/`), no un script. Así el texto existe sin JavaScript y no hay scripts de terceros. El único `script` es JSON-LD `application/ld+json`, que el navegador no ejecuta.
- El origen público provisional es `https://wi-tuner.app`. La app enlazada por defecto es `https://app.wi-tuner.app/`, sustituible con `PUBLIC_APP_URL`.
- Google Play apunta a `com.wituner.app`. App Store aún no tiene id numérico: el botón busca "Wi-Tuner" en la tienda. Los botones son texto, sin copiar los logotipos.
- El contacto es `mailto:contact@wi-tuner.app`. No hay formulario ni servicio externo.
- La fuente es la pila del sistema. El dibujo del diapasón es propio (`apps/landing/scripts/render-icons.mjs`).

## Fase 7: cierre

- Borrar todos los datos pide confirmación y vacía IndexedDB (`keyval-store`), Preferences, la caché, los JSON de temperamentos en la caché nativa y el idioma. No reescribe los valores por defecto en el almacén.
- El id `deviceId` del micrófono es la restricción de `getUserMedia` para elegir un dispositivo de entrada. No es un identificador publicitario y no se guarda.
- La compra única de apoyo existe solo como `SUPPORT_PURCHASE_ENABLED = false`. No hay producto de tienda ni anuncios.
- El origen de la política es `docs/PRIVACY.md`. La app enlaza `https://wi-tuner.app/privacidad/` y la landing publica el mismo texto. La declaración de las tiendas es que no se recopilan datos.
- `scripts/check-external-hosts.mjs` falla si el producto o la vista heredada nombran un host fuera de la lista, un SDK de medición o el nombre anterior.
