import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const admin = {
  id: 1,
  username: 'test_admin',
  name: 'Test Admin',
  email: 'test.admin@ims.local',
  role: 'admin',
};

export const token = 'playwright-mock-token';

export const loadings = [
  {
    id: 101,
    load_number: 'LD-0101',
    loading_date: '2026-11-15',
    prepared_date: '2026-11-14',
    status: 'pending',
    truck: { id: 1, licence_plate_no: 'WP-LD-0101' },
    route: { id: 1, route_code: 'COL-01', route_description: 'Colombo' },
    sales_rep: { id: 1, name: 'Test Sales Rep' },
    driver: { id: 2, name: 'Test Driver' },
    loading_items: [
      {
        id: 1001,
        qty: 24,
        free_qty: 0,
        net_price: 100,
        batch_stock: {
          id: 1,
          retail_price: 120,
          product: { id: 1, name: 'Test Rice 1kg', material_code: 'RICE-001' },
        },
      },
    ],
  },
  {
    id: 102,
    load_number: 'LD-0102',
    loading_date: '2026-11-14',
    prepared_date: '2026-11-13',
    status: 'delivered',
    truck: { id: 2, licence_plate_no: 'WP-LD-0102' },
    route: { id: 2, route_code: 'KAN-02', route_description: 'Kandy' },
    sales_rep: { id: 3, name: 'Second Sales Rep' },
    driver: { id: 4, name: 'Second Driver' },
    loading_items: [],
  },
];

type Fixtures = {
  mockApi: void;
  adminPage: Page;
};

export const test = base.extend<Fixtures>({
  // Every test gets fresh, isolated API mocks. Unknown endpoints fail the test
  // rather than silently falling through to a real backend.
  mockApi: [async ({ page }, runFixture) => {
    const unexpectedRequests: string[] = [];
    const responses: Record<string, unknown> = {
      'POST /login': { access_token: token, user: admin },
      'GET /user': admin,
      'GET /products': [
        { id: 1, name: 'Test Rice 1kg', material_code: 'RICE-001', total_units: 100 },
      ],
      'GET /batch-stocks': [],
      'GET /loadings': loadings,
      'GET /supplier-invoices': [],
      'GET /supplier-invoices/total-sum': { total: 125000 },
      'GET /sales': [],
    };

    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^\/api/, '');
      const key = `${request.method()} ${path}`;

      if (Object.hasOwn(responses, key)) {
        await route.fulfill({ json: responses[key] });
      } else {
        unexpectedRequests.push(key);
        await route.fulfill({ status: 501, json: { message: `Missing mock: ${key}` } });
      }
    });

    await runFixture();
    expect(unexpectedRequests, 'Add explicit mocks for unexpected API requests').toEqual([]);
  }, { auto: true }],

  // E-05 onwards start signed in; E-04 separately tests the actual login form.
  adminPage: async ({ page }, runFixture) => {
    await page.addInitScript(({ user, accessToken }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', accessToken);
    }, { user: admin, accessToken: token });
    await runFixture(page);
  },
});

export { expect };
