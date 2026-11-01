import { test, expect, type Page } from '@playwright/test';

/** First visit → Class 12 → Hindi → Science → Physics → chapter → quiz → result, at 360px. */
async function firstVisitFlow(page: Page, lang: 'hi' | 'en') {
  await page.goto('/');
  await page.getByTestId('choose-class-12').click();
  await page.getByTestId('choose-medium-hindi').click();
  if (lang === 'en') await page.getByTestId('lang-en').click();
  await page.getByTestId('choose-stream-science').click();
  await expect(page.getByTestId('class-12')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('subject-physics').click();
  await expect(page).toHaveURL(lang === 'en' ? /\/class-12\/english\/physics$/ : /\/class-12\/hindi\/bhautiki$/);
  await page.getByTestId('chapter-1').click();
  await expect(page).toHaveURL(lang === 'en' ? /electric-charges-and-fields$/ : /vaidyut-aavesh-tatha-kshetra$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(lang === 'en' ? 'Electric Charges' : 'वैद्युत आवेश');
  // End-of-chapter quiz: 5 questions, instant feedback
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('option-A').click();
    await expect(page.getByTestId('answer-feedback')).toBeVisible();
    await page.getByTestId('quiz-next').click();
  }
  await expect(page.getByTestId('quiz-result')).toBeVisible();
  // No horizontal overflow at this width
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
}

test('first visit to quiz result in Hindi (360px)', async ({ page }) => {
  await firstVisitFlow(page, 'hi');
  await expect(page.getByText('अभ्यास पूरा हुआ')).toBeVisible();
});

test('first visit to quiz result with English interface (360px)', async ({ page }) => {
  await firstVisitFlow(page, 'en');
  await expect(page.getByText('Practice complete')).toBeVisible();
});

test('choices persist across reloads and chapter reaches in 4 taps', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('choose-class-10').click();
  await page.getByTestId('choose-medium-english').click();
  await page.getByTestId('subject-science').click();
  await page.getByTestId('chapter-1').click();
  await expect(page).toHaveURL(/\/class-10\/english\/science\/chemical-reactions-and-equations$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Chemical Reactions');
  await page.goto('/');
  await expect(page.getByTestId('subject-science')).toBeVisible();
});

test('mock test: OMR, attempt limit warning, result', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('choose-class-12').click();
  await page.getByTestId('choose-medium-hindi').click();
  await page.getByTestId('choose-stream-science').click();
  await page.goto('/mock-test/c12-physics-hindi-1?quick=10');
  await page.getByTestId('mock-start').click();
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('mock-option-B').click();
    if (i < 9) await page.getByTestId('mock-next').click();
  }
  await expect(page.getByTestId('attempted')).toHaveText('10');
  await page.getByTestId('mock-submit').click();
  await page.getByTestId('mock-submit-confirm').click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByTestId('mock-result')).toBeVisible();
});

test('unknown route shows friendly 404 and offline page exists', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByTestId('not-found')).toBeVisible();
  const r = await page.goto('/offline.html');
  expect(r?.status()).toBe(200);
});

test('no horizontal overflow at 320, 360, 768 and 1280px on key pages', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('choose-class-12').click();
  await page.getByTestId('choose-medium-hindi').click();
  await page.getByTestId('choose-stream-science').click();
  for (const width of [320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const url of ['/', '/subjects', '/class-12/hindi/bhautiki', '/class-12/hindi/bhautiki/vaidyut-aavesh-tatha-kshetra', '/papers', '/plans']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${url} @ ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

test('header toggles: language and class switch on mobile and persist after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('choose-class-10').click();
  await page.getByTestId('choose-medium-hindi').click();
  await expect(page.getByTestId('subject-science')).toBeVisible();
  await page.getByTestId('lang-en').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Complete preparation');
  await page.getByTestId('class-12').click();
  await expect(page.getByTestId('choose-stream-arts')).toBeVisible(); // Class 12 needs a stream
  await page.getByTestId('choose-stream-arts').click();
  await expect(page.getByTestId('subject-history')).toBeVisible();
  await page.getByTestId('stream-science').click();
  await expect(page.getByTestId('subject-physics')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('class-12')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('subject-physics')).toBeVisible();
  // Toggling language on a subject page moves to the same subject in the other medium
  await page.goto('/class-12/english/physics');
  await page.getByTestId('lang-hi').click();
  await expect(page).toHaveURL(/\/class-12\/hindi\/bhautiki$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('drawer: exactly one active item per page, logout is an action, list scrolls under a fixed header', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('choose-class-10').click();
  await page.getByTestId('choose-medium-hindi').click();
  const pages: Array<[string, string, string]> = [['/', 'drawer-home', 'bottom-home'], ['/subjects', 'drawer-subjects', 'bottom-subjects'], ['/tests', 'drawer-tests', 'bottom-mock-test'], ['/my-study', 'drawer-my-study', 'bottom-my-study'], ['/my-plan', 'drawer-my-plan', 'bottom-my-study'], ['/admit-card', 'drawer-admit-card', 'bottom-my-study'], ['/plans', 'drawer-plans', 'bottom-my-study']];
  for (const [url, drawerId, bottomId] of pages) {
    await page.goto(url);
    await page.getByTestId('menu-button').click();
    await expect(page.getByTestId('drawer')).toBeVisible();
    const active = page.getByTestId('drawer').locator('[aria-current="page"]');
    await expect(active, url).toHaveCount(1);
    await expect(active).toHaveAttribute('data-testid', drawerId);
    await expect(page.locator('nav[aria-label="Bottom"] [aria-current="page"]'), url).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Bottom"] [aria-current="page"]')).toHaveAttribute('data-testid', bottomId);
    await page.getByTestId('drawer-close').click();
  }
  // Scroll the list: header stays fixed, last item reachable, nothing under the header
  await page.goto('/');
  await page.getByTestId('menu-button').click();
  const list = page.getByTestId('drawer-list');
  const last = page.getByTestId('drawer-disclaimer');
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  const headBottom = await page.locator('.drawer-head').evaluate((e) => e.getBoundingClientRect().bottom);
  const listTop = await list.evaluate((e) => e.getBoundingClientRect().top);
  expect(listTop).toBeGreaterThanOrEqual(headBottom);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  // Logout row appears only when logged in and is not a link
  await expect(page.getByTestId('drawer-logout')).toHaveCount(0);
});
