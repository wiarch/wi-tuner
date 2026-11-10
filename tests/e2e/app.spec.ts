import { expect, test } from "@playwright/test";

test("onboarding then a simulated A4", async ({ page }) => {
    await page.goto("http://127.0.0.1:5173");
    await page.getByRole("button", { name: "Empezar a afinar" }).click();
    await expect(
        page.getByRole("heading", {
            name: "Por qué Wi-Tuner necesita el micrófono",
        }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(
        page.getByRole("heading", {
            name: "Tu sonido permanece en este dispositivo",
        }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Continuar al permiso del micrófono" })
        .click();

    const frequency = page
        .locator(".wi-readout-metric", { hasText: "Frecuencia" })
        .locator(".wi-readout-value");
    await expect
        .poll(
            async () =>
                Number((await frequency.innerText()).replace(" Hz", "")),
            { timeout: 15_000 },
        )
        .toBeGreaterThan(430);
    await expect.poll(async () =>
        Number((await frequency.innerText()).replace(" Hz", "")),
    ).toBeLessThan(450);
});

test("settings change the reference pitch", async ({ page }) => {
    await page.goto("http://127.0.0.1:5173");
    await page.getByRole("button", { name: "Ajustes" }).click();
    const pitch = page.getByRole("spinbutton", {
        name: "Frecuencia de referencia · A4 (Hz)",
    });
    await pitch.fill("442");
    await expect(pitch).toHaveValue("442");
});

test("the metronome starts and stops", async ({ page }) => {
    await page.goto("http://127.0.0.1:5173");
    await page.getByRole("button", { name: "Iniciar metrónomo" }).click();
    const stop = page.getByRole("button", { name: "Detener metrónomo" });
    await expect(stop).toHaveAttribute("aria-pressed", "true");
    await stop.click();
    await expect(
        page.getByRole("button", { name: "Iniciar metrónomo" }),
    ).toHaveAttribute("aria-pressed", "false");
});

test("deleting data clears settings and asks for onboarding again", async ({
    page,
}) => {
    await page.goto("http://127.0.0.1:5173");
    await page.getByRole("button", { name: "Ajustes" }).click();
    await page
        .getByRole("spinbutton", {
            name: "Frecuencia de referencia · A4 (Hz)",
        })
        .fill("438");
    await page.getByRole("button", { name: "Borrar todos mis datos" }).click();
    await expect(
        page.getByRole("heading", {
            name: "¿Borrar todos los datos de este dispositivo?",
        }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sí, borrar todo" }).click();
    await page.reload();
    await page.getByRole("button", { name: "Ajustes" }).click();
    await expect(
        page.getByRole("spinbutton", {
            name: "Frecuencia de referencia · A4 (Hz)",
        }),
    ).toHaveValue("440");
    await page.getByRole("button", { name: "Empezar a afinar" }).click();
    await expect(
        page.getByRole("heading", {
            name: "Por qué Wi-Tuner necesita el micrófono",
        }),
    ).toBeVisible();
    await expect(page.getByText("Compra única opcional")).toHaveCount(0);
});

test("the landing links to the tuner and the privacy policy", async ({
    page,
}) => {
    await page.goto("http://127.0.0.1:4321");
    await expect(
        page.getByRole("link", { name: "Probar en el navegador" }).first(),
    ).toHaveAttribute("href", "http://127.0.0.1:5173/");
    await expect(
        page.getByRole("link", { name: "Política de privacidad" }),
    ).toHaveAttribute("href", "/privacidad/");
    await page.goto("http://127.0.0.1:4321/privacidad/");
    await expect(
        page.getByRole("heading", { name: "Política de privacidad" }),
    ).toBeVisible();
    await expect(page.getByText("No se recopilan datos")).toBeVisible();
});
