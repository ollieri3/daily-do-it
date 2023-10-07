// These are local DB credentials only
//TODO: Move these to be dynamic based on some scaffolded data
const credentials = {
  email: "foo@bar.com",
  password: "123456789",
};

import { test, expect } from "@playwright/test";

test("Sign in with Email & Password", async ({ page }) => {
  await page.goto("/signin");

  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveTitle("Your Calendar - Daily Do It");
});
