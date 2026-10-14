#!/usr/bin/env node
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const JOBS = [
  'https://tuyendung.fusumi.vn/2026/10/ke-toan-noi-bo.html',
  'https://tuyendung.fusumi.vn/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html',
];
const REPORT = 'live-authoring-report.json';
const QA_SCRIPT = 'scripts/check_job_authoring.py';

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function auditJob(browser, url) {
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiLiveAuthoringAudit/1.0',
  });
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const status = response ? response.status() : 0;
    if (status === 429) {
      return { url, status: 'INCONCLUSIVE', reason: 'Blogger returned HTTP 429' };
    }
    if (status < 200 || status >= 400) {
      return { url, status: 'FAIL', reason: `HTTP ${status}` };
    }

    await page.waitForTimeout(1200);
    const data = await page.evaluate(() => {
      const scope = document.querySelector('.content[itemtype*="JobPosting"]') || document.querySelector('main.content') || document.body;
      const h1 = scope.querySelector('h1');
      const body = scope.querySelector('.post-body');
      const labelNodes = [...scope.querySelectorAll('[data-raw]')];
      let labels = labelNodes.map(node => (node.getAttribute('data-raw') || '').trim()).filter(Boolean);
      if (!labels.length) {
        labels = [...scope.querySelectorAll('.chip')]
          .map(node => (node.textContent || '').trim())
          .filter(Boolean);
      }
      return {
        title: (h1?.textContent || '').trim(),
        labels,
        bodyHtml: body?.innerHTML || '',
      };
    });

    if (!data.title || !data.bodyHtml) {
      return { url, status: 'INCONCLUSIVE', reason: 'Expected job DOM was not available after render' };
    }

    const dir = mkdtempSync(join(tmpdir(), 'fusumi-live-authoring-'));
    const htmlFile = join(dir, 'job.html');
    writeFileSync(htmlFile, data.bodyHtml, 'utf8');
    try {
      const args = [QA_SCRIPT, '--title', data.title, '--labels', ...data.labels, '--html-file', htmlFile];
      const result = spawnSync('python', args, { encoding: 'utf8' });
      const output = normalize(`${result.stdout || ''}\n${result.stderr || ''}`);
      if (result.status === 0) {
        return { url, status: 'PASS', title: data.title, labels: data.labels };
      }
      return {
        url,
        status: 'FAIL',
        title: data.title,
        labels: data.labels,
        reason: output || `authoring QA exited ${result.status}`,
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch (error) {
    const text = normalize(error?.message || String(error));
    if (/429|ERR_TOO_MANY_REQUESTS/i.test(text)) {
      return { url, status: 'INCONCLUSIVE', reason: text };
    }
    return { url, status: 'INCONCLUSIVE', reason: text };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
let results;
try {
  results = [];
  for (const url of JOBS) {
    const result = await auditJob(browser, url);
    results.push(result);
    console.log(`${result.status}: ${url}${result.reason ? ` — ${result.reason}` : ''}`);
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
} finally {
  await browser.close();
}

const summary = {
  checkedAt: new Date().toISOString(),
  jobs: results,
  counts: {
    pass: results.filter(item => item.status === 'PASS').length,
    fail: results.filter(item => item.status === 'FAIL').length,
    inconclusive: results.filter(item => item.status === 'INCONCLUSIVE').length,
  },
};
writeFileSync(REPORT, JSON.stringify(summary, null, 2) + '\n', 'utf8');

if (summary.counts.fail > 0) {
  process.exitCode = 1;
}
