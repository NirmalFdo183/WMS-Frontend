import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
});

test('shows the login page', async ({ page }) => {
  await expect(page).toHaveTitle('Thejani Traders');
  await expect(page.getByRole('heading', { name: 'Thejani Traders' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('shows validation errors when signing in without credentials', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert').filter({ hasText: 'Enter your username' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Enter your password' })).toBeVisible();
});

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Thejani Traders' })).toBeVisible();
});
