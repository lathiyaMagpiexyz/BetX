import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LottoBlast/);
  });

  test('lotteries page loads', async ({ page }) => {
    await page.goto('/lotteries');
    await expect(page).toHaveTitle(/Live draws/);
  });

  test('create-draw page loads', async ({ page }) => {
    await page.goto('/create-draw');
    await expect(
      page.getByRole('heading', { name: /Run your own lottery|Set the jackpot/i })
    ).toBeVisible();
  });

  test('my-tickets page loads', async ({ page }) => {
    await page.goto('/my-tickets');
    await expect(
      page.getByRole('heading', { name: /My tickets/i })
    ).toBeVisible();
  });

  test('trust variant loads', async ({ page }) => {
    await page.goto('/v/trust');
    await expect(page).toHaveTitle(/Pays Out On-Chain/);
  });

  test('speed variant loads', async ({ page }) => {
    await page.goto('/v/speed');
    await expect(page).toHaveTitle(/Run a Lottery in 60 Seconds/);
  });
});
