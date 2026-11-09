# Wi-Tuner — Seguridad y privacidad

## Audio y micrófono

- Solicita permiso del micrófono solo cuando la persona inicia el afinador.
- Solicita `echoCancellation: false`, `noiseSuppression: false` y `autoGainControl: false`.
- Procesa buffers en memoria en el dispositivo. No los grabes, almacenes ni transmitas.
- Detén las pistas y cierra nodos de audio al detener el afinador, navegar fuera o desmontar la app.
- No escribas muestras ni valores de audio en logs, errores remotos o telemetría.

## Datos locales

Wi-Tuner no usa cuentas. Las preferencias pueden guardarse localmente; ofrece una acción clara para eliminarlas. El modo offline debe funcionar sin depender de llamadas de terceros.

## Dependencias y despliegues

- No agregues analítica, publicidad ni fuentes externas sin decisión documentada.
- Mantén lockfile y CI actualizados.
- Publica web y PWA por HTTPS para habilitar MediaDevices.
- Revisa CSP, permisos y origen de cada recurso antes del despliegue.
