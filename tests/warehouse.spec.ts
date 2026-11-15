import { test, expect, admin, token } from './fixtures/warehouse';

test.describe('7.3 Automated Test Cases - Playwright (Frontend)', () => {
  test('E-01 Unauthenticated redirect', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Warehouse Dashboard' })).toHaveCount(0);
  });

  test('E-02 Empty-field validation', async ({ page }) => {
    let loginRequests = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/login') loginRequests++;
    });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Enter your username' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Enter your password' })).toBeVisible();
    await expect(page.getByLabel('Username', { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/\/login$/);
    expect(loginRequests).toBe(0);
  });

  test('E-03 Wrong credentials', async ({ page }) => {
    await page.route('**/api/login', (route) => route.fulfill({
      status: 401,
      json: { message: 'Invalid credentials.' },
    }));
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill('wrong_user');
    await page.getByLabel('Password', { exact: true }).fill('wrong_password');
    const response = page.waitForResponse('**/api/login');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    expect((await response).status()).toBe(401);
    await expect(page.getByRole('alert')).toHaveText('Username or password is incorrect.');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('E-04 Admin login (mocked)', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(admin.username);
    await page.getByLabel('Password', { exact: true }).fill('mock-password');
    const request = page.waitForRequest('**/api/login');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    const loginRequest = await request;
    expect(loginRequest.method()).toBe('POST');
    expect(loginRequest.postDataJSON()).toEqual({
      username: admin.username,
      password: 'mock-password',
    });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Warehouse Dashboard' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(token);
  });

  test('E-05 Dashboard header and cards', async ({ adminPage: page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Warehouse Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome back, Test.', { exact: true })).toBeVisible();
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.getByText(admin.name, { exact: true })).toBeVisible();
    await expect(header.getByText('LKR 125,000.00', { exact: true })).toBeVisible();
    for (const label of [
      'Pending dispatches',
      'Units out on trucks',
      'Delivered (last 30 days)',
      'Not delivered (last 30 days)',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('E-06 Recent dispatches', async ({ adminPage: page }) => {
    await page.goto('/dashboard');

    const recentDispatches = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Recent dispatches', exact: true }),
    });
    const firstDispatch = recentDispatches.getByRole('row').filter({ hasText: 'LD-0101' });
    await expect(firstDispatch).toBeVisible();
    await expect(firstDispatch).toContainText('COL-01');
    await expect(firstDispatch).toContainText('WP-LD-0101');
    await expect(firstDispatch).toContainText('Pending');
    const secondDispatch = recentDispatches.getByRole('row').filter({ hasText: 'LD-0102' });
    await expect(secondDispatch).toBeVisible();
    await expect(secondDispatch).toContainText('KAN-02');
    await expect(secondDispatch).toContainText('WP-LD-0102');
    await expect(secondDispatch).toContainText('Delivered');
  });

  test('E-07 Open dispatch details', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    const recentDispatches = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Recent dispatches', exact: true }),
    });
    await recentDispatches.getByRole('row').filter({ hasText: 'LD-0101' }).click();

    await expect(page).toHaveURL(/\/supply-invoices\?tab=loading$/);
    await expect(page.getByRole('button', { name: 'New Loading', exact: true })).toBeVisible();
    await expect(page.getByText('Loading Manifest Details', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '#LD-0101', exact: true })).toBeVisible();
    await expect(page.getByText('Test Rice 1kg', { exact: true })).toBeVisible();
    await expect(page.getByText('RICE-001', { exact: true })).toBeVisible();
    await expect(page.getByText('24 units', { exact: true })).toBeVisible();

    // Closing the popup must not reopen it from the loadingId query parameter.
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByText('Loading Manifest Details', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: 'LD-0101' })).toBeVisible();
  });

  test('E-08 Loading tab lists manifests', async ({ adminPage: page }) => {
    await page.goto('/supply-invoices?tab=loading');

    await expect(page.getByRole('heading', { name: 'Invoices & Manifests' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Load Ref', exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LD-0101' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'LD-0102' })).toBeVisible();
    await expect(page.getByText('No loading manifests found', { exact: true })).toHaveCount(0);
  });

  test('E-09 Manifest load error', async ({ adminPage: page }) => {
    await page.route('**/api/loadings', (route) => route.fulfill({
      status: 500,
      json: { message: 'Server error.' },
    }));
    const response = page.waitForResponse('**/api/loadings');
    await page.goto('/supply-invoices?tab=loading');

    expect((await response).status()).toBe(500);
    await expect(page.getByText('Failed to load manifests from server.', { exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: /LD-010[12]/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\/supply-invoices\?tab=loading$/);
  });
});
