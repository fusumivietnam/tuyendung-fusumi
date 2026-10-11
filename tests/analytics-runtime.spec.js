const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const analytics = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-analytics-runtime.html'), 'utf8');
const origin = 'http://fusumi.test';

function fixture() {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body>
    <a data-apply-google-form href="#" onclick="event.preventDefault()">Ứng tuyển qua Google Form</a>
    <a data-apply-email href="#" onclick="event.preventDefault()">Gửi CV qua email</a>
    ${analytics}
  </body></html>`;
}

async function commands(page) {
  return page.evaluate(() => (window.dataLayer || []).map((item) => {
    if (Object.prototype.toString.call(item) === '[object Arguments]') return Array.from(item);
    return item;
  }));
}

test('loads GA4 and sends careers application conversion', async ({ page }) => {
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/p/ung-tuyen.html') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fixture() });
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });

  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());

  const jobUrl = `${origin}/2026/10/ke-toan-noi-bo.html`;
  await page.goto(`${origin}/p/ung-tuyen.html?vi-tri=${encodeURIComponent('Kế toán nội bộ')}&job=${encodeURIComponent(jobUrl)}`, { waitUntil: 'domcontentloaded' });

  const loader = page.locator('script[data-fusumi-ga4="G-6FN6HGQ5R8"]');
  await expect(loader).toHaveCount(1);
  await expect(loader).toHaveAttribute('src', /googletagmanager\.com\/gtag\/js\?id=G-6FN6HGQ5R8/);

  let dl = await commands(page);
  expect(dl.some((entry) => Array.isArray(entry) && entry[0] === 'config' && entry[1] === 'G-6FN6HGQ5R8')).toBe(true);

  await page.locator('[data-apply-google-form]').click();
  dl = await commands(page);

  const event = dl.find((entry) => Array.isArray(entry) && entry[0] === 'event' && entry[1] === 'fusumi_apply_click');
  expect(event).toBeTruthy();
  expect(event[2].apply_channel).toBe('google_form');
  expect(event[2].job_position).toBe('Kế toán nội bộ');
  expect(event[2].job_url).toBe(jobUrl);
});
