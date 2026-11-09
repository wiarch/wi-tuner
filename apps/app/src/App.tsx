import { frequencyToNote } from "@wi-tuner/dsp-core";
import { Button } from "@wi-tuner/ui";
import { useTranslation } from "react-i18next";

const reference = frequencyToNote(440);

export function App() {
    const { i18n, t } = useTranslation();

    return (
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-10 text-slate-900">
            <header className="flex items-center justify-between gap-4">
                <a className="text-xl font-bold tracking-tight" href="/">
                    Wi-Tuner
                </a>
                <label className="flex items-center gap-2 text-sm">
                    <span>{t("language")}</span>
                    <select
                        aria-label={t("language")}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2"
                        onChange={(event) => {
                            void i18n.changeLanguage(event.currentTarget.value);
                        }}
                        value={i18n.resolvedLanguage?.slice(0, 2) ?? "en"}
                    >
                        <option value="en">{t("english")}</option>
                        <option value="es">{t("spanish")}</option>
                    </select>
                </label>
            </header>

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-800">
                    {t("phase")}
                </p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">
                    {t("title")}
                </h1>
                <p className="mt-2 text-lg text-slate-600">{t("subtitle")}</p>
                <p className="mt-6 max-w-xl text-slate-700">
                    {t("phaseDescription")}
                </p>
                <p className="mt-8 rounded-xl bg-slate-50 p-4 text-sm">
                    {t("reference")}: <strong>A4 · 440 Hz</strong>
                    {reference ? ` · ${reference.note}${reference.octave}` : ""}
                </p>
                <Button asChild className="mt-8">
                    <a href={import.meta.env.VITE_LANDING_URL ?? "/"}>
                        {t("openLanding")}
                    </a>
                </Button>
            </section>
        </main>
    );
}
