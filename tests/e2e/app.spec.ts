import { expect, test } from "@playwright/test";

test("the app shell loads with its supported language options", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173");
  await expect(page).toHaveTitle("Wi-Tuner");
  await expect(page.getByRole("option", { name: "English" })).toBeAttached();
  await expect(page.getByRole("option", { name: "Español" })).toBeAttached();
});

test("the landing page links to the tuner", async ({ page }) => {
  await page.goto("http://127.0.0.1:4321");
  await expect(page.getByRole("link", { name: "Abrir el afinador" })).toHaveAttribute(
    "href",
    "/app/",
  );
});

