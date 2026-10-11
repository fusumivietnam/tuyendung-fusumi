const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-careers-runtime.html'), 'utf8');
const origin = 'http://fusumi.test';
const jobPath = '/2026/10/ke-toan-noi-bo.html';
const jobUrl = origin + jobPath;

function html(body) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><link rel="canonical" href="${jobUrl}"></head><body>${body}${runtime}</body></html>`;
}

async function installFeed(page) {
  await page.route(`${origin}/feeds/posts/default**`, route => route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({ feed: { entry: [{
      id: { $t: 'tag:blogger.com,1999:blog-2676884408752392681.post-1134939156650530196' },
      published: { $t: '2026-10-06T08:30:00+07:00' },
      link: [{ rel: 'alternate', href: jobUrl }]
    }] } })
  }));
}

test('job CTA rewrites only application links and preserves contact links', async ({ page }) => {
  await installFeed(page);
  await page.route(jobUrl, route => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: html(`
      <main class="content" itemscope itemtype="https://schema.org/JobPosting">
        <div class="chips"><span class="chip" data-raw="ĐĐ: Hà Nội">Hà Nội</span><span class="chip" data-raw="HT: Full-time">Full-time</span></div>
        <h1>Kế toán nội bộ</h1>
        <div class="post-body"><p>Fusumi tuyển Kế toán nội bộ phụ trách nghiệp vụ kế toán và phối hợp với các bộ phận liên quan.</p></div>
        <div class="job-cta">
          <a id="apply" href="/p/ung-tuyen.html">Ứng tuyển vị trí này</a>
          <a id="mail" href="mailto:hr@fusumi.vn">Email tuyển dụng</a>
          <a id="phone" href="tel:0797139999">0797139999</a>
        </div>
      </main>
    `)
  }));

  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });

  const apply = new URL(await page.locator('#apply').getAttribute('href'), origin);
  expect(apply.pathname).toBe('/p/ung-tuyen.html');
  expect(apply.searchParams.get('vi-tri')).toBe('Kế toán nội bộ');
  expect(apply.searchParams.get('job')).toBe(jobUrl);
  await expect(page.locator('#mail')).toHaveAttribute('href', 'mailto:hr@fusumi.vn');
  await expect(page.locator('#phone')).toHaveAttribute('href', 'tel:0797139999');
});

test('email fallback preserves intentional blank lines', async ({ page }) => {
  const applyUrl = `${origin}/p/ung-tuyen.html?vi-tri=${encodeURIComponent('Kế toán nội bộ')}&job=${encodeURIComponent(jobUrl)}`;
  await page.route(`${origin}/p/ung-tuyen.html**`, route => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body>
      <main class="fusumi-apply-page" data-google-form-url="" data-google-form-position-entry="" data-google-form-job-entry="">
        <strong data-apply-position></strong>
        <a data-apply-job-link hidden href="#">Xem lại tin tuyển dụng</a>
        <p data-apply-channel-note></p>
        <a data-apply-google-form hidden href="#">Form</a>
        <a data-apply-email href="mailto:hr@fusumi.vn">Email</a>
      </main>${runtime}</body></html>`
  }));

  await page.goto(applyUrl, { waitUntil: 'domcontentloaded' });
  const href = await page.locator('[data-apply-email]').getAttribute('href');
  const mail = new URL(href);
  const body = mail.searchParams.get('body');

  expect(body).toContain('Fusumi,\n\nTôi gửi hồ sơ ứng tuyển');
  expect(body).toContain(`${jobUrl}\n\nHọ và tên:`);
  expect(body).toContain('Link CV/Portfolio:\n\nTrân trọng.');
});
