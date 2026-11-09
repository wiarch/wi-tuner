export const landingCopy = {
    en: {
        eyebrow: "A tuner built for focused practice",
        heading: "Hear the note. Find your tuning.",
        description:
            "A clear chromatic tuner and practice toolkit, designed to keep your audio on your device.",
        open: "Open the tuner",
        github: "View on GitHub",
        featureOne: "Chromatic tuning",
        featureTwo: "Offline-ready",
        featureThree: "Private by design",
    },
    es: {
        eyebrow: "Un afinador para practicar con enfoque",
        heading: "Escucha la nota. Encuentra tu afinación.",
        description:
            "Un afinador cromático y herramientas de práctica, diseñados para procesar el audio en tu dispositivo.",
        open: "Abrir el afinador",
        github: "Ver en GitHub",
        featureOne: "Afinación cromática",
        featureTwo: "Preparado para offline",
        featureThree: "Privado desde el diseño",
    },
} as const;

export type LandingLanguage = keyof typeof landingCopy;
