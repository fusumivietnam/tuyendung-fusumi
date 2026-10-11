const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const analytics = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-analytics-runtime.html'), 'utf8');
const origin = 'http://fusumi.test';

function fixture() {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body>${analytics}</body></html>`;
}

test('loads Fusumi GTM container and initializes dataLayer once', async ({ page }) => {
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fixture() });
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });

  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });

  const loader = page.locator('script[data-fusumi-gtm="GTM-TLPRFXWF"]');
  await expect(loader).toHaveCount(1);
  await expect(loader).toHaveAttribute('src', /googletagmanager\.com\/gtm\.js\?id=GTM-TLPRFXWF/);

  const state = await page.evaluate(() => ({
    count: document.querySelectorAll('script[data-fusumi-gtm]').length,
    first: window.dataLayer && window.dataLayer[0]
  }));

  expect(state.count).toBe(1);
  expect(state.first.event).toBe('gtm.js');
  expect(typeof state.first['gtm.start']).toBe('number');
});
