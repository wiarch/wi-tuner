export const SITE_ORIGIN = "https://wi-tuner.app";

export const STORE_LINKS = {
    play: "https://play.google.com/store/apps/details?id=com.wituner.app",
    appStore: "https://apps.apple.com/us/search?term=Wi-Tuner",
} as const;

export const CONTACT_EMAIL = "contact@wi-tuner.app";

export type LandingLanguage = "es" | "en";

export interface LandingPage {
    language: LandingLanguage;
    locale: string;
    htmlTitle: string;
    description: string;
    eyebrow: string;
    heading: string;
    lead: string;
    tryBrowser: string;
    playStore: string;
    appStore: string;
    featuresTitle: string;
    featuresIntro: string;
    features: readonly { title: string; text: string }[];
    instrumentsTitle: string;
    instrumentsIntro: string;
    instruments: readonly string[];
    stepsTitle: string;
    steps: readonly { title: string; text: string }[];
    privacyBanner: string;
    privacyText: string;
    faqTitle: string;
    faq: readonly { question: string; answer: string }[];
    privacyLink: string;
    contactLink: string;
    languageLabel: string;
    otherLanguage: string;
    navLabel: string;
    featuresNav: string;
    instrumentsNav: string;
    stepsNav: string;
    privacyNav: string;
    faqNav: string;
    privacyPageTitle: string;
    privacyPage: readonly { heading: string; text: string }[];
    contactPageTitle: string;
    contactPageLead: string;
    contactWrite: string;
    footerNote: string;
    skip: string;
}

const featuresEs = [
    {
        title: "Afinador cromático",
        text: "Nota, octava, hercios y cents siempre visibles. La aguja se mueve de forma continua.",
    },
    {
        title: "Estroboscopio",
        text: "El patrón se queda quieto en el centro y se desplaza con el batido. Puedes ver hasta cuatro armónicos.",
    },
    {
        title: "Metrónomo",
        text: "De 30 a 300 BPM, compás propio, acentos y varios timbres. Puede sonar mientras afinas.",
    },
    {
        title: "Afinaciones",
        text: "Presets de guitarra, bajo y otros instrumentos, más temperamentos editables.",
    },
    {
        title: "Sin conexión",
        text: "La PWA guarda la app en el dispositivo. No hace falta una cuenta para usarla.",
    },
    {
        title: "Referencia A4",
        text: "La nota de referencia se elige. Un tono con armónicos ayuda a oír las notas graves.",
    },
] as const;

const featuresEn = [
    {
        title: "Chromatic tuner",
        text: "Note, octave, hertz and cents stay visible. The needle moves without a dead zone.",
    },
    {
        title: "Strobe",
        text: "The pattern rests at the center and drifts with the beat. Up to four harmonics can be shown.",
    },
    {
        title: "Metronome",
        text: "30 to 300 BPM, your own meter, accents and several tones. It can run while you tune.",
    },
    {
        title: "Tunings",
        text: "Presets for guitar, bass and other instruments, plus editable temperaments.",
    },
    {
        title: "Offline",
        text: "The PWA keeps the app on the device. No account is required.",
    },
    {
        title: "A4 reference",
        text: "You choose the reference pitch. A tone with harmonics keeps low notes audible.",
    },
] as const;

const instruments = [
    "Guitarra",
    "Bajo",
    "Violín",
    "Viola",
    "Violonchelo",
    "Ukelele",
    "Banjo",
    "Mandolina",
    "Piano",
    "Cromático",
] as const;

const instrumentsEn = [
    "Guitar",
    "Bass",
    "Violin",
    "Viola",
    "Cello",
    "Ukulele",
    "Banjo",
    "Mandolin",
    "Piano",
    "Chromatic",
] as const;

export const landing: Record<LandingLanguage, LandingPage> = {
    es: {
        language: "es",
        locale: "es_ES",
        htmlTitle: "Wi-Tuner — Afinador cromático y metrónomo",
        description:
            "Afinador cromático con estroboscopio y metrónomo. El audio se analiza en tu dispositivo: 0 anuncios, 0 rastreadores.",
        eyebrow: "Afinador cromático y metrónomo",
        heading: "Afina con precisión. El sonido no sale de tu dispositivo.",
        lead: "Wi-Tuner muestra la nota, los cents y un estroboscopio real. También lleva metrónomo. Sirve en el navegador, en Android y en iOS, sin cuenta.",
        tryBrowser: "Probar en el navegador",
        playStore: "Google Play",
        appStore: "App Store",
        featuresTitle: "Funciones clave",
        featuresIntro:
            "Hecho para afinar rápido y seguir practicando, con los datos en el aparato.",
        features: featuresEs,
        instrumentsTitle: "Instrumentos",
        instrumentsIntro:
            "Cada preset trae sus cuerdas y sus afinaciones. El modo cromático no supone un instrumento.",
        instruments,
        stepsTitle: "Cómo funciona",
        steps: [
            {
                title: "Abre Wi-Tuner",
                text: "Entra desde el navegador o instala la app. La misma interfaz sirve en la web y en el móvil.",
            },
            {
                title: "Permite el micrófono",
                text: "El permiso sirve para medir el tono. El audio se procesa en memoria y no se graba ni se envía.",
            },
            {
                title: "Toca una nota",
                text: "La aguja, los cents y el estroboscopio muestran el desvío. El metrónomo puede ir al mismo tiempo.",
            },
        ],
        privacyBanner:
            "0 anuncios · 0 rastreadores · tu audio nunca sale de tu dispositivo",
        privacyText:
            "No hay cuentas ni analítica de terceros. Las preferencias se guardan en el aparato y puedes borrarlas.",
        faqTitle: "Preguntas frecuentes",
        faq: [
            {
                question: "¿Wi-Tuner graba lo que toco?",
                answer: "No. El micrófono alimenta el análisis de tono en memoria. No hay archivo de audio ni envío a un servidor.",
            },
            {
                question: "¿Hace falta una cuenta?",
                answer: "No. No hay registro. Los ajustes viven en el dispositivo.",
            },
            {
                question: "¿Funciona sin conexión?",
                answer: "Sí. La versión web es una PWA. Después de abrirla una vez, la interfaz carga sin red.",
            },
            {
                question: "¿Qué instrumentos incluye?",
                answer: "Guitarra, bajo, cuerda frotada, ukelele, banjo, mandolina y piano, además del modo cromático.",
            },
            {
                question: "¿Puedo usar el metrónomo mientras afino?",
                answer: "Sí. El metrónomo usa su propio reloj de audio y no comparte el contexto del micrófono.",
            },
        ],
        privacyLink: "Política de privacidad",
        contactLink: "Contacto",
        languageLabel: "Idioma",
        otherLanguage: "English",
        navLabel: "Secciones",
        featuresNav: "Funciones",
        instrumentsNav: "Instrumentos",
        stepsNav: "Pasos",
        privacyNav: "Privacidad",
        faqNav: "Preguntas",
        privacyPageTitle: "Política de privacidad",
        privacyPage: [
            {
                heading: "Qué no hacemos",
                text: "Wi-Tuner no muestra anuncios, no carga rastreadores y no pide una cuenta. No se recopilan datos. No vendemos datos.",
            },
            {
                heading: "Micrófono",
                text: "El afinador usa el micrófono solo para estimar la frecuencia. Las muestras permanecen en memoria y se descartan. No se graban ni se transmiten.",
            },
            {
                heading: "Datos en el dispositivo",
                text: "Idioma, tema, afinación y temperamentos se guardan localmente. La app incluye la acción Borrar todos mis datos.",
            },
            {
                heading: "Esta web",
                text: "La landing no pide el micrófono y no inserta scripts de terceros. El cambio de idioma es un enlace a otra página.",
            },
        ],
        contactPageTitle: "Contacto",
        contactPageLead:
            "Escribe para errores, privacidad o las fichas de las tiendas. No hay formulario: el mensaje sale de tu correo.",
        contactWrite: "Escribir a Wi-Tuner",
        footerNote: "Audio local. Sin anuncios. Sin rastreadores.",
        skip: "Saltar al contenido",
    },
    en: {
        language: "en",
        locale: "en_US",
        htmlTitle: "Wi-Tuner — Chromatic tuner and metronome",
        description:
            "Chromatic tuner with a real strobe and a metronome. Audio is analyzed on your device: 0 ads, 0 trackers.",
        eyebrow: "Chromatic tuner and metronome",
        heading: "Tune precisely. The sound stays on your device.",
        lead: "Wi-Tuner shows the note, the cents and a real strobe. It also includes a metronome. It runs in the browser, on Android and on iOS, with no account.",
        tryBrowser: "Try in the browser",
        playStore: "Google Play",
        appStore: "App Store",
        featuresTitle: "Key features",
        featuresIntro:
            "Built to tune quickly and keep practicing, with the data on the device.",
        features: featuresEn,
        instrumentsTitle: "Instruments",
        instrumentsIntro:
            "Each preset carries its strings and tunings. Chromatic mode does not assume an instrument.",
        instruments: instrumentsEn,
        stepsTitle: "How it works",
        steps: [
            {
                title: "Open Wi-Tuner",
                text: "Use the browser or install the app. The web and mobile versions share one interface.",
            },
            {
                title: "Allow the microphone",
                text: "The permission is only for measuring pitch. Audio is processed in memory. It is not recorded or uploaded.",
            },
            {
                title: "Play a note",
                text: "The needle, the cents and the strobe show the offset. The metronome can run at the same time.",
            },
        ],
        privacyBanner:
            "0 ads · 0 trackers · your audio never leaves your device",
        privacyText:
            "There are no accounts and no third-party analytics. Preferences stay on the device, and you can erase them.",
        faqTitle: "Frequently asked questions",
        faq: [
            {
                question: "Does Wi-Tuner record what I play?",
                answer: "No. The microphone feeds an in-memory pitch estimate. There is no audio file and no upload.",
            },
            {
                question: "Do I need an account?",
                answer: "No. There is no sign-up. Settings stay on the device.",
            },
            {
                question: "Does it work offline?",
                answer: "Yes. The web version is a PWA. After you open it once, the interface loads without a network.",
            },
            {
                question: "Which instruments are included?",
                answer: "Guitar, bass, bowed strings, ukulele, banjo, mandolin and piano, plus a chromatic mode.",
            },
            {
                question: "Can the metronome run while I tune?",
                answer: "Yes. The metronome uses its own audio clock and does not share the microphone context.",
            },
        ],
        privacyLink: "Privacy policy",
        contactLink: "Contact",
        languageLabel: "Language",
        otherLanguage: "Español",
        navLabel: "Sections",
        featuresNav: "Features",
        instrumentsNav: "Instruments",
        stepsNav: "Steps",
        privacyNav: "Privacy",
        faqNav: "Questions",
        privacyPageTitle: "Privacy policy",
        privacyPage: [
            {
                heading: "What we do not do",
                text: "Wi-Tuner shows no ads, loads no trackers and asks for no account. No data is collected. We do not sell data.",
            },
            {
                heading: "Microphone",
                text: "The tuner uses the microphone only to estimate frequency. Samples stay in memory and are discarded. They are not recorded or transmitted.",
            },
            {
                heading: "Data on the device",
                text: "Language, theme, tuning and temperaments are stored locally. The app includes Erase all my data.",
            },
            {
                heading: "This website",
                text: "The landing page does not ask for the microphone and does not embed third-party scripts. The language change is a link to another page.",
            },
        ],
        contactPageTitle: "Contact",
        contactPageLead:
            "Write about bugs, privacy or the store listings. There is no form: the message leaves from your mail app.",
        contactWrite: "Email Wi-Tuner",
        footerNote: "Local audio. No ads. No trackers.",
        skip: "Skip to content",
    },
};

export function localizedPath(path: string, language: LandingLanguage): string {
    const bare = path.replace(/^\/en(?=\/|$)/, "") || "/";
    const normalized = bare.endsWith("/") ? bare : `${bare}/`;
    if (language === "es") return normalized;
    return normalized === "/" ? "/en/" : `/en${normalized}`;
}

export function softwareApplicationLd(page: LandingPage, pageUrl: string) {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Wi-Tuner",
        applicationCategory: "MusicApplication",
        operatingSystem: "Web, Android, iOS",
        url: pageUrl,
        description: page.description,
        inLanguage: page.language,
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
        publisher: {
            "@type": "Organization",
            name: "Wi-Tuner",
            email: CONTACT_EMAIL,
        },
    };
}
