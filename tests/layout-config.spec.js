const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const careers = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-careers-runtime.html'), 'utf8');
const analytics = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-analytics-runtime.html'), 'utf8');
const configBase = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-careers-config.html'), 'utf8');
const origin = 'http://fusumi.test';

function customConfig() {
  return configBase
    .replace('hr@fusumi.vn', 'jobs@example.com')
    .replace('/p/ung-tuyen.html', '/p/nop-ho-so.html')
    .replace('entry.348709449', 'entry.111')
    .replace('entry.3122690363', 'entry.222')
    .replace('G-6FN6HGQ5R8', 'G-TEST123');
}

async function routeSite(page, html) {
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/p/ung-tuyen.html' || url.pathname === '/2026/10/ke-toan-noi-bo.html') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    if (url.pathname === '/feeds/posts/default') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ feed: { entry: [] } }) });
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
}

test('Layout config works when gadget is after both runtimes', async ({ page }) => {
  const html = `<!doctype html><html><head></head><body>
    <div class="fusumi-apply-page">
      <strong data-apply-position></strong>
      <a data-apply-job-link hidden href="#">Job</a>
      <p data-apply-channel-note></p>
      <a data-apply-google-form hidden href="#" onclick="event.preventDefault()">Form</a>
      <a data-apply-email href="mailto:hr@fusumi.vn" onclick="event.preventDefault()">Email</a>
    </div>
    ${careers}
    ${analytics}
    ${customConfig()}
  </body></html>`;

  await routeSite(page, html);
  const jobUrl = `${origin}/2026/10/ke-toan-noi-bo.html`;
  await page.goto(`${origin}/p/ung-tuyen.html?vi-tri=${encodeURIComponent('Kế toán nội bộ')}&job=${encodeURIComponent(jobUrl)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(20);

  const formHref = await page.locator('[data-apply-google-form]').getAttribute('href');
  const formUrl = new URL(formHref);
  expect(formUrl.searchParams.get('entry.111')).toBe('Kế toán nội bộ');
  expect(formUrl.searchParams.get('entry.222')).toBe(jobUrl);
  expect(await page.locator('[data-apply-google-form]').isVisible()).toBe(true);

  const mailHref = await page.locator('[data-apply-email]').getAttribute('href');
  expect(mailHref.startsWith('mailto:jobs@example.com?')).toBe(true);

  const loader = page.locator('script[data-fusumi-ga4="G-TEST123"]');
  await expect(loader).toHaveCount(1);
});

test('runtimes keep production-safe fallbacks when config gadget is absent', async ({ page }) => {
  const html = `<!doctype html><html><head></head><body>
    <div class="fusumi-apply-page"
      data-google-form-url="https://docs.google.com/forms/d/e/FORM_ID/viewform"
      data-google-form-position-entry="entry.111"
      data-google-form-job-entry="entry.222">
      <strong data-apply-position></strong>
      <a data-apply-google-form hidden href="#" onclick="event.preventDefault()">Form</a>
      <a data-apply-email href="mailto:hr@fusumi.vn" onclick="event.preventDefault()">Email</a>
    </div>
    ${careers}
    ${analytics}
  </body></html>`;

  await routeSite(page, html);
  await page.goto(`${origin}/p/ung-tuyen.html?vi-tri=${encodeURIComponent('Kế toán nội bộ')}`, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('script[data-fusumi-ga4="G-6FN6HGQ5R8"]')).toHaveCount(1);
  const mailHref = await page.locator('[data-apply-email]').getAttribute('href');
  expect(mailHref.startsWith('mailto:hr@fusumi.vn?')).toBe(true);
});

test('Layout config overrides Apply Page path without rewriting contact links', async ({ page }) => {
  const html = `<!doctype html><html><head><link rel="canonical" href="${origin}/2026/10/ke-toan-noi-bo.html"></head><body>
    <article class="content" itemtype="https://schema.org/JobPosting">
      <h1>Kế toán nội bộ</h1>
      <div class="chips"><span class="chip" data-raw="ĐĐ: Hà Nội">Hà Nội</span><span class="chip" data-raw="HT: Full-time">Full-time</span></div>
      <div class="post-body"><p>Mô tả công việc kế toán nội bộ tại Fusumi Việt Nam với các nhiệm vụ nghiệp vụ kế toán hàng ngày.</p></div>
      <div class="job-cta">
        <a data-apply-link href="/p/ung-tuyen.html">Ứng tuyển ngay</a>
        <a href="mailto:hr@fusumi.vn">Email</a>
        <a href="tel:0797139999">Điện thoại</a>
      </div>
    </article>
    ${careers}
    ${customConfig()}
  </body></html>`;

  await routeSite(page, html);
  await page.goto(`${origin}/2026/10/ke-toan-noi-bo.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(20);

  const apply = new URL(await page.locator('[data-apply-link]').getAttribute('href'), origin);
  expect(apply.pathname).toBe('/p/nop-ho-so.html');
  expect(apply.searchParams.get('vi-tri')).toBe('Kế toán nội bộ');
  expect(await page.locator('a[href^="mailto:"]').getAttribute('href')).toBe('mailto:hr@fusumi.vn');
  expect(await page.locator('a[href^="tel:"]').getAttribute('href')).toBe('tel:0797139999');
});
