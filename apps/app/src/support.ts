/** One-time support purchase. Off until a store product exists. Never an ad. */
export const SUPPORT_PURCHASE_ENABLED = false;

export function privacyPolicyUrl(language: string): string {
    return language === "en"
        ? "https://wi-tuner.app/en/privacidad/"
        : "https://wi-tuner.app/privacidad/";
}
