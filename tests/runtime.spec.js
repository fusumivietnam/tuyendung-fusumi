const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'templates', 'fusumi-careers-runtime.html'), 'utf8');
const origin = 'http://fusumi.test';
const jobPath = '/2026/10/ke-toan-noi-bo.html';
const jobUrl = origin + jobPath;
const formUrl = 'https://docs.google.com/forms/d/e/FORM_ID/viewform';

function documentHtml(body, head = '') {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">${head}</head><body>${body}${runtime}</body></html>`;
}

function jobFixture() {
  return documentHtml(`
    <main class="content" itemscope itemtype="https://schema.org/JobPosting">
      <div class="chips">
        <span class="chip" data-raw="PB: Kinh doanh">Kinh doanh</span>
        <span class="chip" data-raw="ĐĐ: Hà Nội">Hà Nội</span>
        <span class="chip" data-raw="HT: Full-time">Full-time</span>
      </div>
      <h1>[Fulltime - Hà Nội] Kế toán nội bộ</h1>
      <div class="post-body">
        <p>Fusumi tuyển Kế toán nội bộ phụ trách nghiệp vụ kế toán và phối hợp với các bộ phận liên quan.</p>
        <table>
          <tr><th>Số lượng</th><td>2</td></tr>
          <tr><th>Hạn ứng tuyển</th><td>31/10/2026</td></tr>
        </table>
        <h2>Mô tả công việc</h2>
        <p>Thực hiện hạch toán, đối soát chứng từ và hỗ trợ lập báo cáo nội bộ.</p>
      </div>
      <div class="apply"><a href="/p/ung-tuyen.html">Ứng tuyển vị trí này</a></div>
    </main>
  `, '<meta name="description" content="Trang thông tin tuyển dụng chính thức của Fusumi Việt Nam">');
}

function applyFixture(configured = false) {
  const attrs = configured
    ? `data-google-form-url="${formUrl}" data-google-form-position-entry="entry.111" data-google-form-job-entry="entry.222"`
    : 'data-google-form-url="" data-google-form-position-entry="" data-google-form-job-entry=""';

  return documentHtml(`
    <main class="fusumi-apply-page" ${attrs}>
      <h1>Ứng tuyển</h1>
      <p>Vị trí: <strong data-apply-position></strong></p>
      <a data-apply-job-link hidden href="#">Xem lại tin tuyển dụng</a>
      <p data-apply-channel-note></p>
      <a data-apply-google-form hidden href="#">Ứng tuyển qua Google Form</a>
      <a data-apply-email href="mailto:hr@fusumi.vn">Gửi CV qua email</a>
    </main>
  `, `<link rel="canonical" href="${origin}/p/ung-tuyen.html">`);
}

function listingFixture() {
  return documentHtml(`
    <section id="viec-lam">
      <input id="jobSearch" type="search" value="">
      <select id="departmentFilter"><option value="">Tất cả phòng ban</option></select>
      <select id="locationFilter"><option value="">Tất cả địa điểm</option></select>
      <select id="typeFilter"><option value="">Tất cả hình thức</option></select>
      <button id="clearFilters" type="button">Xóa bộ lọc</button>
      <span id="jobCount">1 vị trí phù hợp</span>
      <div id="jobsEmpty" hidden>Không có vị trí phù hợp</div>
    </section>
  `);
}

async function installRoutes(page) {
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/feeds/posts/default') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          feed: {
            entry: [{
              id: { $t: 'tag:blogger.com,1999:blog-2676884408752392681.post-1134939156650530196' },
              published: { $t: '2026-10-06T08:30:00+07:00' },
              updated: { $t: '2026-10-06T08:30:00+07:00' },
              link: [{ rel: 'alternate', href: jobUrl }]
            }]
          }
        })
      });
    }

    if (url.pathname === jobPath) {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: jobFixture() });
    }

    if (url.pathname === '/p/ung-tuyen.html') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: applyFixture(false) });
    }

    if (url.pathname === '/p/ung-tuyen-form.html') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: applyFixture(true) });
    }

    if (url.pathname === '/listing') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: listingFixture() });
    }

    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' });
  });
}

test.beforeEach(async ({ page }) => {
  await installRoutes(page);
});

test('injects complete JobPosting JSON-LD from runtime data', async ({ page }) => {
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fusumi-jobposting-jsonld')).toHaveCount(1);

  const schema = await page.locator('#fusumi-jobposting-jsonld').evaluate((node) => JSON.parse(node.textContent));
  expect(schema['@type']).toBe('JobPosting');
  expect(schema.title).toBe('Kế toán nội bộ');
  expect(schema.datePosted).toBe('2026-10-06');
  expect(schema.employmentType).toBe('FULL_TIME');
  expect(schema.totalJobOpenings).toBe(2);
  expect(schema.validThrough).toBe('2026-10-31T23:59:59+07:00');
  expect(schema.jobLocation.address.addressLocality).toBe('Hà Nội');
  expect(schema.identifier.value).toContain('post-1134939156650530196');
  expect(schema.url).toBe(jobUrl);
  expect(schema.directApply).toBe(false);
  expect(schema.description).toContain('Fusumi tuyển Kế toán nội bộ');
  expect(schema.baseSalary).toBeUndefined();
  expect(schema.employmentUnit).toBeUndefined();
});

test('creates canonical fallback and replaces generic meta description on job pages', async ({ page }) => {
  await page.goto(`${jobUrl}?utm_source=test#apply`, { waitUntil: 'domcontentloaded' });

  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveCount(1);
  await expect(canonical).toHaveAttribute('href', jobUrl);

  const descriptions = page.locator('meta[name="description"]');
  await expect(descriptions).toHaveCount(1);
  await expect(descriptions).toHaveAttribute(
    'content',
    'Fusumi Việt Nam tuyển Kế toán nội bộ tại Hà Nội, hình thức Full-time. Xem mô tả công việc, yêu cầu và cách ứng tuyển.'
  );
});

test('job CTA carries normalized position and canonical URL to Apply page', async ({ page }) => {
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  const href = await page.locator('.apply a').getAttribute('href');
  const applyUrl = new URL(href, origin);

  expect(applyUrl.pathname).toBe('/p/ung-tuyen.html');
  expect(applyUrl.searchParams.get('vi-tri')).toBe('Kế toán nội bộ');
  expect(applyUrl.searchParams.get('job')).toBe(jobUrl);
});

test('Apply page keeps email fallback when Google Form is not configured', async ({ page }) => {
  const url = `${origin}/p/ung-tuyen.html?vi-tri=${encodeURIComponent('Kế toán nội bộ')}&job=${encodeURIComponent(jobUrl)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('[data-apply-position]')).toHaveText('Kế toán nội bộ');
  await expect(page.locator('[data-apply-job-link]')).toBeVisible();
  await expect(page.locator('[data-apply-job-link]')).toHaveAttribute('href', jobUrl);
  await expect(page.locator('[data-apply-google-form]')).toBeHidden();
  await expect(page.locator('[data-apply-channel-note]')).toContainText('email tuyển dụng');

  const mailHref = await page.locator('[data-apply-email]').getAttribute('href');
  const mail = new URL(mailHref);
  expect(mail.protocol).toBe('mailto:');
  expect(decodeURIComponent(mail.pathname)).toBe('hr@fusumi.vn');
  expect(mail.searchParams.get('subject')).toContain('Ứng tuyển - Kế toán nội bộ');
  expect(mail.searchParams.get('body')).toContain(jobUrl);
});

test('configured Google Form receives prefilled position and job URL', async ({ page }) => {
  const url = `${origin}/p/ung-tuyen-form.html?vi-tri=${encodeURIComponent('Kế toán nội bộ')}&job=${encodeURIComponent(jobUrl)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const form = page.locator('[data-apply-google-form]');
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute('target', '_blank');
  await expect(form).toHaveAttribute('rel', 'noopener');
  await expect(page.locator('[data-apply-channel-note]')).toContainText('biểu mẫu');

  const href = await form.getAttribute('href');
  const target = new URL(href);
  expect(target.origin).toBe('https://docs.google.com');
  expect(target.searchParams.get('usp')).toBe('pp_url');
  expect(target.searchParams.get('entry.111')).toBe('Kế toán nội bộ');
  expect(target.searchParams.get('entry.222')).toBe(jobUrl);
});

test('apply channel clicks push structured dataLayer events', async ({ page }) => {
  const url = `${origin}/p/ung-tuyen-form.html?vi-tri=${encodeURIComponent('Kế toán nội bộ')}&job=${encodeURIComponent(jobUrl)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.locator('[data-apply-email]').click({ noWaitAfter: true });
  const emailEvent = await page.evaluate(() => window.dataLayer.at(-1));
  expect(emailEvent.event).toBe('fusumi_apply_click');
  expect(emailEvent.apply_channel).toBe('email');
  expect(emailEvent.job_position).toBe('Kế toán nội bộ');
  expect(emailEvent.job_url).toBe(jobUrl);
});

test('search accessibility state reacts to typing and Escape', async ({ page }) => {
  await page.goto(`${origin}/listing`, { waitUntil: 'domcontentloaded' });

  const search = page.locator('#jobSearch');
  const clear = page.locator('#clearFilters');
  const count = page.locator('#jobCount');
  const empty = page.locator('#jobsEmpty');

  await expect(count).toHaveAttribute('aria-live', 'polite');
  await expect(empty).toHaveAttribute('role', 'status');
  await expect(empty).toHaveAttribute('aria-live', 'polite');
  await expect(clear).toBeDisabled();
  await expect(clear).toHaveAttribute('aria-disabled', 'true');

  await search.fill('kế toán');
  await expect(clear).toBeEnabled();
  await expect(clear).toHaveAttribute('aria-disabled', 'false');

  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(clear).toBeDisabled();
  await expect(clear).toHaveAttribute('aria-disabled', 'true');
});
