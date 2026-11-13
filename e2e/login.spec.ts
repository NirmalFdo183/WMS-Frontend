import { test, expect } from "@playwright/test";
import { mockApi, failWith } from "./fixtures";

test.describe("Login", () => {
  test("unauthenticated visitors are sent to the login page", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Thejani Traders" })).toBeVisible();
  });

  test("shows validation errors for empty fields", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter your username")).toBeVisible();
    await expect(page.getByText("Enter your password")).toBeVisible();
  });

  test("shows an error for wrong credentials", async ({ page }) => {
    await mockApi(page, { "/login": failWith(401) });
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Username or password is incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an admin signs in and lands on the dashboard", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Warehouse Dashboard" })).toBeVisible();
  });
});
