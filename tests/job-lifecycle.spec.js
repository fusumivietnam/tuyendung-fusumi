const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const careers = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-careers-runtime.html'), 'utf8');
const config = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-careers-config.html'), 'utf8');
const origin = 'http://fusumi.test';
const postPath = '/2026/10/ke-toan-noi-bo.html';
const postUrl = origin + postPath;

function jobHtml(deadlineRow = '') {
  return `<!doctype html><html><head><link rel="canonical" href="${postUrl}"></head><body>
    <article class="content" itemtype="https://schema.org/JobPosting">
      <h1>Kế toán nội bộ</h1>
      <div class="chips">
        <span class="chip" data-raw="ĐĐ: Hà Nội">Hà Nội</span>
        <span class="chip" data-raw="HT: Full-time">Full-time</span>
      </div>
      <div class="post-body">
        <p>Fusumi Việt Nam tuyển Kế toán nội bộ phụ trách nghiệp vụ kế toán hàng ngày và phối hợp cùng các bộ phận liên quan.</p>
        <table>${deadlineRow}<tr><td>Số lượng</td><td>1</td></tr></table>
      </div>
      <div class="apply"><a data-apply-link href="/p/ung-tuyen.html">Ứng tuyển vị trí này</a></div>
    </article>
    ${careers}
    ${config}
  </body></html>`;
}

async function routeJob(page, html) {
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname === postPath) {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    if (url.pathname === '/feeds/posts/default') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feed: {
            entry: [{
              id: { $t: 'blogger-post-123' },
              published: { $t: '2026-10-06T08:00:00.000+07:00' },
              updated: { $t: '2026-10-06T08:00:00.000+07:00' },
              link: [{ rel: 'alternate', href: postUrl }]
            }]
          }
        })
      });
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });
}

test('expired job is visibly closed and JobPosting JSON-LD is removed', async ({ page }) => {
  const html = jobHtml('<tr><td>Hạn ứng tuyển</td><td>31/12/2020</td></tr>');
  await routeJob(page, html);
  await page.goto(postUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(80);

  await expect(page.locator('[data-job-status-message]')).toHaveText('Đã hết hạn tuyển');
  await expect(page.locator('.content')).toHaveAttribute('data-job-status', 'expired');
  const apply = page.locator('[data-apply-link]');
  await expect(apply).not.toHaveAttribute('href', /.+/);
  await expect(apply).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#fusumi-jobposting-jsonld')).toHaveCount(0);
});

test('future deadline keeps application open and emits validThrough', async ({ page }) => {
  const html = jobHtml('<tr><td>Hạn ứng tuyển</td><td>31/12/2099</td></tr>');
  await routeJob(page, html);
  await page.goto(postUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(80);

  await expect(page.locator('[data-job-status-message]')).toHaveCount(0);
  await expect(page.locator('[data-apply-link]')).toHaveAttribute('href', /\/p\/ung-tuyen\.html\?/);
  await expect(page.locator('#fusumi-jobposting-jsonld')).toHaveCount(1);
  const schema = await page.locator('#fusumi-jobposting-jsonld').evaluate(node => JSON.parse(node.textContent));
  expect(schema.validThrough).toBe('2099-12-31T23:59:59+07:00');
});

test('job without a valid deadline remains open without fabricated validThrough', async ({ page }) => {
  const html = jobHtml();
  await routeJob(page, html);
  await page.goto(postUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(80);

  await expect(page.locator('[data-job-status-message]')).toHaveCount(0);
  await expect(page.locator('#fusumi-jobposting-jsonld')).toHaveCount(1);
  const schema = await page.locator('#fusumi-jobposting-jsonld').evaluate(node => JSON.parse(node.textContent));
  expect(schema.validThrough).toBeUndefined();
});
