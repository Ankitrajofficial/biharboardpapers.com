import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end in TEST_MODE: WhatsApp OTP account creation → PayU (simulated signed response) →
 * lock opens → upgrade blocked/offered → logout and return as a known number.
 * Needs the API: `TEST_MODE=true npm run server` (the preview server proxies /api).
 */
test.beforeEach(async ({ request }) => {
  const ok = await request.get('/api/health').then((r) => r.ok()).catch(() => false);
  test.skip(!ok, 'API server not running');
});

const choose = async (page: Page) => {
  await page.goto('/');
  await page.getByTestId('choose-class-12').click();
  await page.getByTestId('choose-medium-hindi').click();
  await page.getByTestId('choose-stream-science').click();
};
const enterOtp = async (page: Page, code: string) => {
  await page.getByTestId('otp-0').click();
  await page.keyboard.type(code);
};

test('locked item → account creation (why, number+consent, OTP boxes, name) → buy plan → unlocked', async ({ page }) => {
  await choose(page);
  // 6th question of a chapter is locked for a visitor; the lock line names the price.
  await page.goto('/class-12/hindi/bhautiki/vaidyut-aavesh-tatha-kshetra/objective');
  for (let i = 0; i < 5; i++) { await page.getByTestId('option-A').click(); await page.getByTestId('practice-next').click(); }
  await expect(page.getByText('पूरा अभ्यास ₹199 में')).toBeVisible();
  await page.getByTestId('locked-button').click();
  await expect(page).toHaveURL(/\/plans\?next=/);
  await page.getByTestId('buy-inter').click();

  // Flow A
  await expect(page.getByTestId('screen-why')).toBeVisible();
  await page.getByTestId('continue-whatsapp').click();
  const phone = '9' + String(Date.now()).slice(-9);
  await page.getByTestId('login-phone').fill('5123');
  await expect(page.getByTestId('send-otp')).toBeDisabled();
  await page.getByTestId('login-phone').fill(phone);
  await page.getByTestId('consent').check();
  await page.getByTestId('send-otp').click();
  const code = (await page.getByTestId('dev-otp').innerText()).match(/\d{6}/)![0];
  await enterOtp(page, code === '000000' ? '111111' : '000000');
  await expect(page.getByTestId('auth-error')).toContainText('बचे प्रयास: 4');
  await enterOtp(page, code);
  await expect(page.getByTestId('screen-name')).toBeVisible();
  await page.getByTestId('login-name').fill('Riya');
  await page.getByTestId('login-email').fill(`riya${Date.now()}@example.com`);
  await page.getByTestId('login-done').click();
  await expect(page.getByTestId('screen-saved')).toBeVisible();

  // Back at P4 confirm → PayU (test mode) → status page → simulated signed success
  await expect(page.getByTestId('confirm-plan')).toBeVisible();
  await expect(page.getByTestId('confirm-plan')).toContainText('₹199');
  await page.getByTestId('pay-upi').click();
  await expect(page.getByTestId('pay-pending')).toBeVisible();
  await page.getByTestId('test-success').click();
  await expect(page.getByTestId('pay-success')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('back-to-item').click();
  await expect(page).toHaveURL(/objective$/);
  for (let i = 0; i < 5; i++) { await page.getByTestId('option-A').click(); await page.getByTestId('practice-next').click(); }
  await expect(page.getByTestId('option-A')).toBeVisible(); // 6th question now open

  // Plans: inter already active, All Access offered as an upgrade for ₹100 more
  await page.goto('/plans');
  await expect(page.getByTestId('plan-inter')).toContainText('आपका प्लान');
  await expect(page.getByTestId('buy-all')).toContainText('₹100');

  // My plan with receipt; logout keeps the masked number for next time
  await page.goto('/my-study');
  await expect(page.getByTestId('my-plan')).toContainText('BBP-');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('logout').click();
  await page.goto('/login');
  await expect(page.getByText(`+91 ${phone.slice(0, 2)}•••••${phone.slice(-3)}`)).toBeVisible();
  await page.getByTestId('send-otp').click();
  const code2 = (await page.getByTestId('dev-otp').innerText()).match(/\d{6}/)![0];
  await enterOtp(page, code2);
  await expect(page.getByTestId('screen-saved')).toBeVisible();
  await expect(page).toHaveURL(/\/my-study$/);
  await expect(page.getByTestId('my-plan')).toContainText('इंटर प्लान');
});

test('failed and pending payments never unlock', async ({ page }) => {
  await choose(page);
  await page.goto('/login?next=/plans');
  await page.getByTestId('continue-whatsapp').click();
  await page.getByTestId('login-phone').fill('8' + String(Date.now()).slice(-9));
  await page.getByTestId('send-otp').click();
  await enterOtp(page, (await page.getByTestId('dev-otp').innerText()).match(/\d{6}/)![0]);
  await page.getByTestId('login-done').click();
  await expect(page).toHaveURL(/\/plans$/);
  await page.getByTestId('buy-matric').click();
  await page.getByTestId('pay-upi').click();
  await page.getByTestId('test-pending').click();
  await expect(page.getByTestId('pay-pending')).toContainText('भुगतान प्रक्रिया में है');
  await page.getByTestId('test-fail').click();
  await expect(page.getByTestId('pay-failed')).toBeVisible();
  await page.goto('/my-study');
  await expect(page.getByTestId('my-plan')).toContainText('कोई प्लान नहीं');
});

test('email OTP login creates an email-only account; checkout asks for a mobile number', async ({ page }) => {
  await choose(page);
  await page.goto('/login?next=/plans');
  await page.getByTestId('continue-email').click();
  const email = `student${Date.now()}@example.com`;
  await page.getByTestId('login-email-input').fill('not-an-email');
  await expect(page.getByTestId('send-otp')).toBeDisabled();
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('send-otp').click();
  await enterOtp(page, (await page.getByTestId('dev-otp').innerText()).match(/\d{6}/)![0]);
  await expect(page.getByTestId('screen-name')).toBeVisible();
  await page.getByTestId('login-done').click();
  await expect(page).toHaveURL(/\/plans$/);
  await page.getByTestId('buy-matric').click();
  await expect(page.getByTestId('checkout-phone')).toBeVisible();
  await page.getByTestId('pay-upi').click();
  await expect(page.getByTestId('confirm-plan')).toContainText(/मोबाइल नंबर|mobile number/);
  await page.getByTestId('checkout-phone').fill('9123456789');
  await page.getByTestId('pay-upi').click();
  await page.getByTestId('test-success').click();
  await expect(page.getByTestId('pay-success')).toBeVisible({ timeout: 15_000 });
  await page.goto('/my-study');
  await expect(page.getByTestId('my-plan')).toContainText('मैट्रिक प्लान');
  await expect(page.getByText(email.slice(0, 2) + '•••@example.com', { exact: true })).toBeVisible();
});
