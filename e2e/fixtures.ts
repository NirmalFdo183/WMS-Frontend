import { test as base, expect, type Page } from "@playwright/test";
import { MOCK_API } from "../playwright.config";

export const adminUser = { id: 1, name: "Test Admin", email: "admin@test.local", role: "admin" };

const today = new Date().toISOString().slice(0, 10);

export const loadings = [
  {
    id: 101,
    load_number: "LD-0101",
    loading_date: today,
    prepared_date: today,
    status: "pending",
    route: { route_code: "RT-NORTH", name: "North route" },
    truck: { licence_plate_no: "WP-CAB-1234" },
    sales_rep: { name: "Sam Rep" },
    loading_items: [{ id: 1, product_id: 1, qty: 20, product: { name: "Sample Biscuits" } }],
  },
  {
    id: 102,
    load_number: "LD-0102",
    loading_date: today,
    prepared_date: today,
    status: "delivered",
    route: { route_code: "RT-SOUTH", name: "South route" },
    truck: { licence_plate_no: "WP-CAD-5678" },
    sales_rep: { name: "Sam Rep" },
    loading_items: [],
  },
];

/** Default JSON answers for the endpoints the tested pages call. */
const defaults: Record<string, unknown> = {
  "/login": { access_token: "test-token", user: adminUser },
  "/user": adminUser,
  "/loadings": loadings,
  "/supplier-invoices/total-sum": { total: 1250000 },
};

/** Use as an override value to make an endpoint fail with that status. */
export const failWith = (status: number) => ({ __status: status, message: "mock error" });

/**
 * Answers every request to the mock API. Known endpoints get fixture data,
 * anything else gets an empty list so pages render their empty states.
 */
export async function mockApi(page: Page, overrides: Record<string, unknown> = {}) {
  const responses = { ...defaults, ...overrides };
  await page.route(`${MOCK_API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    const body = path in responses ? responses[path] : [];
    if (body && typeof body === "object" && "__status" in body) {
      const { __status, ...rest } = body as { __status: number };
      return route.fulfill({ status: __status, json: rest });
    }
    return route.fulfill({ json: body });
  });
}

/** Seeds localStorage the same way a successful login does. */
export async function signInAsAdmin(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("user", JSON.stringify(user));
  }, adminUser);
}

/** `adminPage` is a page that is already signed in as an admin with the API mocked. */
export const test = base.extend<{ adminPage: Page }>({
  // Named `provide` rather than `use` so the React hooks lint rule leaves it alone.
  adminPage: async ({ page }, provide) => {
    await mockApi(page);
    await signInAsAdmin(page);
    await provide(page);
  },
});

export { expect };
