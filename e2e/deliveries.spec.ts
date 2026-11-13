import { test, expect, mockApi, signInAsAdmin, failWith } from "./fixtures";

test.describe("Deliveries (loading manifests)", () => {
  test("the loading tab lists the manifests", async ({ adminPage: page }) => {
    await page.goto("/supply-invoices?tab=loading");
    await expect(page.getByText("Loading Manifests").first()).toBeVisible();
    await expect(page.getByText("LD-0101").first()).toBeVisible();
    await expect(page.getByText("LD-0102").first()).toBeVisible();
  });

  test("shows an error when manifests fail to load", async ({ page }) => {
    await mockApi(page, { "/loadings": failWith(500) });
    await signInAsAdmin(page);
    await page.goto("/supply-invoices?tab=loading");
    await expect(page.getByText("Failed to load manifests from server.")).toBeVisible();
  });
});
