#!/usr/bin/env node
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyLifecycleFromText, discoverLiveJobs } from './live_jobs.mjs';

const SITE = 'https://tuyendung.fusumi.vn';
const REPORT = 'live-authoring-report.json';
const QA_SCRIPT = 'scripts/check_job_authoring.py';

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function runQa({ url, title, labels, bodyHtml, lifecycle, lifecycleReason, validThrough, discoveryLifecycle, source }) {
  const dir = mkdtempSync(join(tmpdir(), 'fusumi-live-authoring-'));
  const htmlFile = join(dir, 'job.html');
  writeFileSync(htmlFile, bodyHtml, 'utf8');
  try {
    const args = [QA_SCRIPT, '--title', title, '--labels', ...labels, '--html-file', htmlFile];
    const result = spawnSync('python', args, { encoding: 'utf8' });
    const output = normalize(`${result.stdout || ''}\n${result.stderr || ''}`);
    const base = {
      url,
      source,
      lifecycle,
      lifecycleReason,
      validThrough,
      discoveryLifecycle,
      title,
      labels,
    };
    if (result.status === 0) return { ...base, status: 'PASS' };
    return { ...base, status: 'FAIL', reason: output || `authoring QA exited ${result.status}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function canAuditFromFeed(job) {
  return job?.lifecycleSource === 'blogger-feed' && Boolean(job.title && job.bodyHtml && job.labels?.length);
}

function auditFeedJob(job) {
  const lifecycle = classifyLifecycleFromText(job.bodyHtml);
  return runQa({
    url: job.url,
    title: job.title,
    labels: job.labels,
    bodyHtml: job.bodyHtml,
    lifecycle: lifecycle.lifecycle,
    lifecycleReason: lifecycle.reason,
    validThrough: lifecycle.validThrough,
    discoveryLifecycle: job.lifecycle,
    source: 'blogger-feed',
  });
}

async function auditRenderedJob(browser, discoveredJob) {
  const url = discoveredJob.url;
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiLiveAuthoringAudit/1.3',
  });
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const status = response ? response.status() : 0;
    if (status === 429) {
      return { url, source: 'rendered-page', status: 'INCONCLUSIVE', lifecycle: 'inconclusive', reason: 'Blogger returned HTTP 429' };
    }
    if (status < 200 || status >= 400) {
      return { url, source: 'rendered-page', status: 'FAIL', lifecycle: discoveredJob.lifecycle, reason: `HTTP ${status}` };
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
        bodyText: body?.textContent || '',
      };
    });

    if (!data.title || !data.bodyHtml) {
      return { url, source: 'rendered-page', status: 'INCONCLUSIVE', lifecycle: 'inconclusive', reason: 'Expected job DOM was not available after render' };
    }

    const renderedLifecycle = classifyLifecycleFromText(data.bodyText);
    return runQa({
      url,
      title: data.title,
      labels: data.labels,
      bodyHtml: data.bodyHtml,
      lifecycle: renderedLifecycle.lifecycle,
      lifecycleReason: renderedLifecycle.reason,
      validThrough: renderedLifecycle.validThrough,
      discoveryLifecycle: discoveredJob.lifecycle,
      source: 'rendered-page',
    });
  } catch (error) {
    const text = normalize(error?.message || String(error));
    return { url, source: 'rendered-page', status: 'INCONCLUSIVE', lifecycle: 'inconclusive', reason: text };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
let results = [];
let discovery;
try {
  discovery = await discoverLiveJobs(browser, { site: SITE });
  console.log(`Discovered ${discovery.jobs.length} live job(s) via ${discovery.source}.`);
  discovery.notes.forEach(note => console.log(`WARN: ${note}`));

  if (!discovery.jobs.length) {
    results.push({ url: SITE, source: 'none', status: 'INCONCLUSIVE', lifecycle: 'inconclusive', reason: 'Could not discover any live job URL from Blogger feed or homepage' });
  } else {
    for (const job of discovery.jobs) {
      const result = canAuditFromFeed(job) ? auditFeedJob(job) : await auditRenderedJob(browser, job);
      results.push(result);
      console.log(`${result.status}: ${job.url} [${result.lifecycle}] via ${result.source}${result.reason ? ` — ${result.reason}` : ''}`);
      if (result.source === 'rendered-page') await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
} finally {
  await browser.close();
}

const summary = {
  checkedAt: new Date().toISOString(),
  site: SITE,
  discovery: discovery || { jobs: [], urls: [], source: 'none', notes: ['Discovery did not complete'] },
  jobs: results,
  counts: {
    pass: results.filter(item => item.status === 'PASS').length,
    fail: results.filter(item => item.status === 'FAIL').length,
    inconclusive: results.filter(item => item.status === 'INCONCLUSIVE').length,
    open: results.filter(item => item.lifecycle === 'open').length,
    expired: results.filter(item => item.lifecycle === 'expired').length,
    lifecycleInconclusive: results.filter(item => item.lifecycle === 'inconclusive').length,
    feed: results.filter(item => item.source === 'blogger-feed').length,
    renderedFallback: results.filter(item => item.source === 'rendered-page').length,
  },
};
writeFileSync(REPORT, JSON.stringify(summary, null, 2) + '\n', 'utf8');

if (summary.counts.fail > 0) process.exitCode = 1;
