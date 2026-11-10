import { SUPPORT_PURCHASE_ENABLED } from "./support";

export function SupportOffer() {
    if (!SUPPORT_PURCHASE_ENABLED) return null;
    return (
        <section aria-label="Apoyo al proyecto">
            <h3>Apoyo al proyecto</h3>
            <p>Compra única opcional. Wi-Tuner no muestra anuncios.</p>
        </section>
    );
}
