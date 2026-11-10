# Publicar Wi-Tuner

La app web sale de `apps/app`. Android e iOS usan el mismo `dist` a través de Capacitor. Identificador: `com.wituner.app`. Nombre visible: Wi-Tuner.

El audio no se graba ni se envía. No hay cuentas, anuncios ni analítica de terceros.

## Web (PWA)

Desde la raíz del repositorio, con pnpm 11 vía Corepack:

```bash
corepack pnpm install --store-dir "C:\Users\William Ache\Documents\Codex\.pnpm-store\v11"
corepack pnpm --filter @wi-tuner/ui build
corepack pnpm --filter @wi-tuner/app build
```

El resultado es `apps/app/dist`. Incluye `manifest.webmanifest`, iconos PNG, `audio-capture.worklet.js` y el service worker. La navegación sin red cae en `index.html`. El registro del worker es el archivo `registerSW.js`, no un script en línea.

Comprobar en local:

```bash
corepack pnpm --filter @wi-tuner/app exec vite preview --host 127.0.0.1 --port 4173
```

Abrir esa URL, recargar una vez para que el worker tome el control, cortar la red y volver a cargar `/`. La interfaz debe abrir.

### Cloudflare Pages

- Directorio raíz del proyecto: el repositorio.
- Comando de compilación: `corepack pnpm --filter @wi-tuner/ui build && corepack pnpm --filter @wi-tuner/app build`
- Directorio de salida: `apps/app/dist`
- Vite copia `apps/app/public/_headers` a `dist/_headers`. Cloudflare Pages aplica esas cabeceras.

### Vercel

- Root Directory: `apps/app`
- Framework: Vite
- Build command: `cd ../.. && corepack pnpm --filter @wi-tuner/ui build && corepack pnpm --filter @wi-tuner/app build`
- Output directory: `dist`
- `apps/app/vercel.json` publica las mismas cabeceras.

### Cabeceras

La política es la misma en ambos archivos:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

También se envían `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy` con micrófono solo en el propio origen, y HSTS de un año.

No hay scripts de terceros. `script-src` es solo `'self'`. No hay `unsafe-eval`. `'unsafe-inline'` queda limitado a estilos porque la interfaz escribe atributos `style`.

No se descarga ninguna fuente. `src/styles.css` usa la pila del sistema (`ui-sans-serif`, `system-ui`, `-apple-system`, `Segoe UI`). `font-src 'self'` bloquea un CDN de fuentes.

`worker-src 'self'` cubre el service worker y el AudioWorklet de captura.

## Iconos

Los PNG de 192, 512, maskable 512 y el icono de Apple salen de `apps/app/scripts/render-icons.mjs`:

```bash
node apps/app/scripts/render-icons.mjs
```

El dibujo es un diapasón propio sobre `#0f172a`. Hay que volver a ejecutar el script si cambia el dibujo y dejar los PNG en `apps/app/public/`.

## Proyectos nativos

Hacen falta JDK 21 y Android SDK para Android. iOS se firma y compila solo en macOS con Xcode.

Tras el build web, desde `apps/app`:

```bash
corepack pnpm exec cap add android
corepack pnpm exec cap add ios
corepack pnpm exec cap sync
```

`capacitor.config.ts` fija `appId` en `com.wituner.app` y `webDir` en `dist`.

Plugins: `@capacitor/haptics`, `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/share` y `@capacitor-community/keep-awake`. El paquete `@capacitor/keep-awake` no existe en el registro; el plugin de la comunidad expone `keepAwake` y `allowSleep`.

### Permisos

Android, en `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

`@capacitor-community/keep-awake` mantiene la pantalla con `FLAG_KEEP_SCREEN_ON`. No añade el permiso `WAKE_LOCK`.

iOS, en `ios/App/App/Info.plist`, clave `NSMicrophoneUsageDescription`:

```
Wi-Tuner uses the microphone to measure the pitch of your instrument. Audio stays on this device and is never recorded or uploaded.
```

La traducción española está en `ios/App/App/es.lproj/InfoPlist.strings`. La inglesa está en `Info.plist` y en `en.lproj/InfoPlist.strings`. El proyecto Xcode incluye ambas.

## Android: compilar y firmar

Variables: `JAVA_HOME` hacia JDK 21 y `ANDROID_HOME` hacia el SDK. Aceptar las licencias del SDK antes del primer build.

Depuración, desde `apps/app/android`:

```bash
gradlew.bat assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/`.

Release firmado:

1. Crear el almacén una sola vez, desde `apps/app`. Guardar la contraseña fuera del repositorio.

```bash
keytool -genkeypair -v -keystore wi-tuner-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

2. Crear `apps/app/android/keystore.properties` (no se commitea):

```
storeFile=../../wi-tuner-upload.jks
storePassword=REEMPLAZAR
keyAlias=upload
keyPassword=REEMPLAZAR
```

3. `android/app/build.gradle` ya lee `keystore.properties` y aplica `signingConfigs.release` solo si ese archivo existe. Sin él, `bundleRelease` genera un AAB sin firmar.

4. Compilar:

```bash
gradlew.bat bundleRelease
```

El archivo para Play Console es `android/app/build/outputs/bundle/release/app-release.aab`.

En Play Console: crear la app con el id `com.wituner.app`, subir el AAB a una pista de prueba, completar la ficha de datos y la declaración de micrófono (el audio se procesa en el dispositivo y no se transmite). Play App Signing puede quedar activado: Google guarda la clave de firma de la app y la clave `upload` solo sirve para subir.

## iOS: compilar y firmar

En un Mac, con Xcode:

```bash
cd apps/app
corepack pnpm --filter @wi-tuner/ui build
corepack pnpm --filter @wi-tuner/app build
corepack pnpm exec cap sync ios
open ios/App/App.xcodeproj
```

Los plugins nativos entran por Swift Package Manager (`ios/App/CapApp-SPM/Package.swift`). Este proyecto no usa CocoaPods.

En Xcode:

1. Target App, pestaña Signing & Capabilities.
2. Team: el equipo de Apple Developer.
3. Bundle Identifier: `com.wituner.app`.
4. Dejar "Automatically manage signing" para desarrollo.
5. Comprobar que `NSMicrophoneUsageDescription` aparece en Info.
6. Scheme App, dispositivo Any iOS Device (arm64).
7. Product, Archive.
8. En el Organizer, Distribute App, App Store Connect, Upload.

Para firmar a mano, en el Apple Developer portal crear un App ID `com.wituner.app` con la capacidad de micrófono implícita en el uso de `AVAudioSession`, un certificado Apple Distribution y un perfil App Store. En Signing desactivar la gestión automática y elegir ese perfil.

App Store Connect: nueva app con el mismo bundle id, subir el build del archive, declarar que el micrófono mide el tono y que el audio no sale del dispositivo. No activar publicidad ni seguimiento.

## Temperamentos

En el navegador, Exportar descarga `<id>.json` y la subida lee un archivo local. En Android e iOS, Exportar escribe el JSON en la caché de la app y abre la hoja de Share. Importar guarda la selección y la vuelve a leer con Filesystem antes de parsearla.

## Qué no entra en el repositorio

`keystore.properties`, `*.jks`, `*.p8`, perfiles de aprovisionamiento y `local.properties` del SDK. Las carpetas `android/` e `ios/` sí forman parte del proyecto; sus salidas de compilación las ignoran los `.gitignore` que genera Capacitor.
