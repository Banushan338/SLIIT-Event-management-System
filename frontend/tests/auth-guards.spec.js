import { test, expect } from '@playwright/test';

test.describe('Unauthenticated access', () => {
  test('root redirects to login when not signed in', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
  });

  test('login page shows heading and email field', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'load', timeout: 60_000 });
    await expect(page.locator('h1').first()).toContainText(/Welcome back/i);
    await expect(page.getByLabel(/university email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });

  test('register page is reachable', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'load', timeout: 60_000 });
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: /create your/i })).toBeVisible();
  });

  test('protected faculty route sends user to login', async ({ page }) => {
    await page.goto('/faculty/approvals', { waitUntil: 'load', timeout: 60_000 });
    await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
  });
});
