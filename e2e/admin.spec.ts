import { test, expect, type Page } from '@playwright/test';

/** Admin smoke in TEST_MODE: owner login → publish an update → it appears on the student homepage. Needs the API with ADMIN_OWNER_PHONES set. */
test.beforeEach(async ({ request }) => {
  const ok = await request.get('/api/health').then((r) => r.ok()).catch(() => false);
  test.skip(!ok, 'API server not running');
});

async function adminLogin(page: Page, phone: string) {
  await page.goto('/admin/login');
  await page.getByTestId('admin-phone').fill(phone);
  await page.getByTestId('admin-submit').click();
  const code = (await page.getByTestId('admin-dev-otp').innerText()).match(/\d{6}/)![0];
  await page.getByTestId('admin-otp').fill(code);
  await page.getByTestId('admin-submit').click();
  await expect(page).toHaveURL(/\/admin$/);
}

test('non-admin number is refused', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByTestId('admin-phone').fill('9123456789');
  await page.getByTestId('admin-submit').click();
  await expect(page.getByTestId('admin-error')).toBeVisible();
});

test('owner: dashboard, publish an update, students see it; drawer and toggles on mobile', async ({ page }) => {
  await adminLogin(page, '9000000001');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/डैशबोर्ड|Dashboard/);
  await page.getByTestId('admin-menu').click();
  await page.getByRole('link', { name: /अपडेट|Updates/ }).first().click();
  await page.getByTestId('update-new').click();
  const title = `टेस्ट अपडेट ${Date.now()}`;
  await page.getByTestId('update-form').locator('input[lang=hi]').first().fill(title);
  await page.getByTestId('update-source').fill('BSEB notice');
  await page.getByTestId('update-publish').click();
  await expect(page.getByText(title)).toBeVisible();

  // Student side: strip on the homepage and the /updates page
  await page.goto('/');
  await page.getByTestId('choose-class-12').click();
  await page.getByTestId('choose-medium-hindi').click();
  await page.getByTestId('choose-stream-science').click();
  await expect(page.getByTestId('latest-updates')).toContainText(title);
  await expect(page.getByTestId('poster-banner')).toBeVisible();
  // Drawer
  await page.getByTestId('menu-button').click();
  await expect(page.getByTestId('drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('drawer')).toBeHidden();
  await page.getByTestId('menu-button').click();
  await page.getByRole('link', { name: /ताज़ा अपडेट|Latest Updates/ }).click();
  await expect(page).toHaveURL(/\/updates$/);
  await expect(page.getByText(title)).toBeVisible();
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    await expect(page.getByTestId('toggle-row')).toBeVisible();
  }
});
