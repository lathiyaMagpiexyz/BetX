import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LottoBlast/);
  });

  test('giveaways page loads', async ({ page }) => {
    await page.goto('/giveaways');
    await expect(page).toHaveTitle(/Live giveaways/);
  });

  test('create-giveaway page loads', async ({ page }) => {
    await page.goto('/create-giveaway');
    await expect(
      page.getByRole('heading', { name: /Run your own giveaway|Set the prize pool/i })
    ).toBeVisible();
  });

  test('my-entries page loads', async ({ page }) => {
    await page.goto('/my-entries');
    await expect(
      page.getByRole('heading', { name: /My entries/i })
    ).toBeVisible();
  });

  test('trust variant loads', async ({ page }) => {
    await page.goto('/v/trust');
    await expect(page).toHaveTitle(/Pays Out On-Chain/);
  });

  test('speed variant loads', async ({ page }) => {
    await page.goto('/v/speed');
    await expect(page).toHaveTitle(/Run a Giveaway in 60 Seconds/);
  });
});
