import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// The dashboard has more than one table of loadings, so scope to this panel.
const recentDispatches = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "Recent dispatches" }) });

test.describe("Dashboard", () => {
  test("shows the header and the dispatch summary cards", async ({ adminPage: page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Warehouse Dashboard" })).toBeVisible();
    await expect(page.getByText("Welcome back, Test.")).toBeVisible();
    // Card labels have changed between dashboard versions, so match loosely.
    await expect(page.getByText(/Pending (dispatches|deliveries)/i).first()).toBeVisible();
  });

  test("lists recent dispatches", async ({ adminPage: page }) => {
    await page.goto("/dashboard");
    const panel = recentDispatches(page);
    const row = panel.getByRole("row", { name: /LD-0101/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText("RT-NORTH");
    await expect(panel.getByRole("row", { name: /LD-0102/ })).toContainText("Delivered");
  });

  test("clicking a recent dispatch opens its delivery details", async ({ adminPage: page }) => {
    await page.goto("/dashboard");
    await recentDispatches(page).getByRole("row", { name: /LD-0101/ }).click();
    await expect(page).toHaveURL(/\/supply-invoices\?tab=loading/);
    // The details modal shows the load number and its truck.
    await expect(page.getByText("#LD-0101")).toBeVisible();
    await expect(page.getByText("WP-CAB-1234").first()).toBeVisible();
  });
});
