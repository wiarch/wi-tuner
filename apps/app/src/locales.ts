export const resources = {
    en: {
        translation: {
            title: "Wi-Tuner",
            subtitle: "A private tuner for your practice.",
            phase: "Audio engine",
            phaseDescription:
                "Tune with private, on-device microphone analysis. Audio is never recorded or sent anywhere.",
            reference: "Reference pitch",
            language: "Language",
            english: "English",
            spanish: "Español",
            openLanding: "Visit the product page",
            microphone: "Microphone",
            sampleRate: "Processing rate",
            startMicrophone: "Start tuning",
            stopMicrophone: "Stop microphone",
            retry: "Retry microphone",
            audioIdle: "Microphone is off",
            audioRequesting: "Waiting for microphone permission…",
            audioActive: "Listening · updates at least 30 times per second",
            audioSuspended: "Tuner paused while the app is in the background",
            audioRecovering: "Restoring microphone connection…",
            audioError: "The tuner needs attention",
            audioPermissionDenied:
                "Microphone permission was denied. Allow microphone access in your browser or device settings, then retry.",
            audioNoMicrophone:
                "No microphone is available. Connect or enable one, then retry.",
            audioUnsupported:
                "This browser cannot capture audio. Use a recent browser over HTTPS and retry.",
            audioDeviceLost:
                "The microphone disconnected or is busy. Reconnect it or close other audio apps, then retry.",
            audioInterrupted:
                "Audio was interrupted. Keep the app open and retry if it does not reconnect.",
            audioUnknown:
                "The microphone could not start. Check your browser audio settings and retry.",
            noPitch: "Play a note near the microphone",
            detectedPitch: "Detected pitch",
            audioPrivacy: "Audio is analyzed in memory on this device only.",
            latency: "{{value}} ms latency",
        },
    },
    es: {
        translation: {
            title: "Wi-Tuner",
            subtitle: "Un afinador privado para practicar.",
            phase: "Motor de audio",
            phaseDescription:
                "Afina con análisis privado del micrófono en el dispositivo. El audio no se graba ni se envía.",
            reference: "Frecuencia de referencia",
            language: "Idioma",
            english: "English",
            spanish: "Español",
            openLanding: "Ver la página del producto",
            microphone: "Micrófono",
            sampleRate: "Frecuencia de procesamiento",
            startMicrophone: "Empezar a afinar",
            stopMicrophone: "Apagar micrófono",
            retry: "Reintentar micrófono",
            audioIdle: "Micrófono apagado",
            audioRequesting: "Esperando permiso para usar el micrófono…",
            audioActive: "Escuchando · actualiza al menos 30 veces por segundo",
            audioSuspended:
                "Afinador pausado mientras la app está en segundo plano",
            audioRecovering: "Restableciendo la conexión del micrófono…",
            audioError: "El afinador requiere atención",
            audioPermissionDenied:
                "Se denegó el permiso del micrófono. Permite el acceso en los ajustes del navegador o dispositivo y reintenta.",
            audioNoMicrophone:
                "No hay un micrófono disponible. Conecta o activa uno y reintenta.",
            audioUnsupported:
                "Este navegador no puede capturar audio. Usa uno reciente mediante HTTPS y reintenta.",
            audioDeviceLost:
                "El micrófono se desconectó o está ocupado. Conéctalo o cierra otras apps de audio y reintenta.",
            audioInterrupted:
                "El audio se interrumpió. Mantén la app abierta y reintenta si no se reconecta.",
            audioUnknown:
                "No se pudo iniciar el micrófono. Revisa los ajustes de audio del navegador y reintenta.",
            noPitch: "Toca una nota cerca del micrófono",
            detectedPitch: "Nota detectada",
            audioPrivacy:
                "El audio se analiza en memoria y solo en este dispositivo.",
            latency: "{{value}} ms de latencia",
        },
    },
} as const;
