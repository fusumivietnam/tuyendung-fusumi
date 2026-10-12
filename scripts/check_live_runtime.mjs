#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from '@playwright/test';

const SITE = 'https://tuyendung.fusumi.vn';
const JOBS = [
  `${SITE}/2026/10/ke-toan-noi-bo.html`,
  `${SITE}/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html`,
];
const GENERIC_DESCRIPTION = 'Trang thông tin tuyển dụng chính thức của Fusumi Việt Nam';
const report = {
  checkedAt: new Date().toISOString(),
  site: SITE,
  status: 'pass',
  jobs: [],
  notes: [],
};

function cleanUrl(raw) {
  const url = new URL(raw, SITE);
  return `${url.origin}${url.pathname}`;
}

function markInconclusive(message) {
  if (report.status !== 'fail') report.status = 'inconclusive';
  report.notes.push(message);
  console.log(`INCONCLUSIVE: ${message}`);
}

function fail(message) {
  report.status = 'fail';
  report.notes.push(message);
  console.error(`ERROR: ${message}`);
}

async function inspectJob(browser, jobUrl) {
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiCareersRuntimeCheck/1.0',
  });
  const item = { url: jobUrl, checks: {}, network: {} };
  report.jobs.push(item);

  let feedStatus = null;
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/feeds/posts/default')) feedStatus = response.status();
  });

  try {
    const response = await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response?.status() ?? 0;
    item.network.documentStatus = status;
    if (status === 429) {
      markInconclusive(`${jobUrl} returned HTTP 429 to the browser runner.`);
      item.status = 'inconclusive';
      return;
    }
    if (status !== 200) {
      fail(`${jobUrl} returned HTTP ${status}.`);
      item.status = 'fail';
      return;
    }

    await page.waitForTimeout(1500);

    const runtimeCount = await page.locator('#fusumi-careers-runtime').count();
    const analyticsCount = await page.locator('#fusumi-analytics-runtime').count();
    const configCount = await page.locator('#fusumi-careers-config').count();
    item.checks.markers = { runtimeCount, analyticsCount, configCount };
    if (runtimeCount !== 1) fail(`${jobUrl} missing Careers Runtime marker.`);
    if (analyticsCount !== 1) fail(`${jobUrl} missing Analytics Runtime marker.`);
    if (configCount !== 1) fail(`${jobUrl} missing Careers Config marker.`);

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    item.checks.canonical = canonical;
    if (!canonical || cleanUrl(canonical) !== cleanUrl(jobUrl)) {
      fail(`${jobUrl} canonical mismatch: ${canonical || 'missing'}.`);
    }

    const title = ((await page.locator('.content h1').first().textContent()) || '').replace(/\s+/g, ' ').trim();
    const description = ((await page.locator('meta[name="description"]').first().getAttribute('content')) || '').replace(/\s+/g, ' ').trim();
    item.checks.title = title;
    item.checks.metaDescription = description;
    if (!title) fail(`${jobUrl} missing job H1.`);
    if (!description || description === GENERIC_DESCRIPTION) {
      fail(`${jobUrl} still has missing/generic meta description.`);
    }

    const config = await page.locator('#fusumi-careers-config').first().evaluate((node) => ({
      email: node.getAttribute('data-hr-email') || '',
      applyPage: node.getAttribute('data-apply-page') || '',
      formUrl: node.getAttribute('data-google-form-url') || '',
      formPositionEntry: node.getAttribute('data-google-form-position-entry') || '',
      formJobEntry: node.getAttribute('data-google-form-job-entry') || '',
      ga4: node.getAttribute('data-ga4-measurement-id') || '',
    })).catch(() => null);
    item.checks.config = config;
    if (config) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) fail(`${jobUrl} Config has invalid HR email.`);
      if (!config.applyPage.startsWith('/')) fail(`${jobUrl} Config has invalid Apply Page path.`);
      if (!/^entry\.\d+$/.test(config.formPositionEntry)) fail(`${jobUrl} Config has invalid Google Form position entry.`);
      if (!/^entry\.\d+$/.test(config.formJobEntry)) fail(`${jobUrl} Config has invalid Google Form job entry.`);
      if (!/^G-[A-Z0-9]+$/i.test(config.ga4)) fail(`${jobUrl} Config has invalid GA4 measurement ID.`);
    }

    const ga4Loader = await page.locator('script[data-fusumi-ga4]').first().getAttribute('data-fusumi-ga4');
    item.checks.ga4Loader = ga4Loader;
    if (!ga4Loader) fail(`${jobUrl} missing GA4 loader marker.`);
    if (config?.ga4 && ga4Loader && config.ga4 !== ga4Loader) {
      fail(`${jobUrl} GA4 loader does not match Layout Config.`);
    }

    const applyLink = page.locator('.apply a,.job-cta a').filter({ hasText: /Ứng tuyển/i }).first();
    if (await applyLink.count()) {
      const href = await applyLink.getAttribute('href');
      item.checks.applyHref = href;
      if (!href) {
        fail(`${jobUrl} Apply CTA has no href.`);
      } else {
        const apply = new URL(href, SITE);
        const expectedPath = config?.applyPage || '/p/ung-tuyen.html';
        if (apply.pathname !== expectedPath) fail(`${jobUrl} Apply CTA path mismatch: ${apply.pathname}.`);
        if (cleanUrl(apply.searchParams.get('job') || '') !== cleanUrl(jobUrl)) fail(`${jobUrl} Apply CTA job parameter mismatch.`);
        if (!apply.searchParams.get('vi-tri')) fail(`${jobUrl} Apply CTA missing vi-tri parameter.`);
      }
    } else {
      fail(`${jobUrl} missing visible Apply CTA.`);
    }

    try {
      await page.waitForSelector('#fusumi-jobposting-jsonld', { timeout: 8000 });
    } catch {}
    item.network.feedStatus = feedStatus;

    const rawJsonLd = await page.locator('#fusumi-jobposting-jsonld').first().textContent().catch(() => null);
    if (!rawJsonLd) {
      if (feedStatus === 429) {
        markInconclusive(`${jobUrl} Blogger feed returned HTTP 429, so rendered JobPosting could not be verified.`);
        item.status = 'inconclusive';
        return;
      }
      fail(`${jobUrl} missing rendered fusumi-jobposting-jsonld.`);
    } else {
      let data;
      try {
        data = JSON.parse(rawJsonLd);
      } catch {
        fail(`${jobUrl} JobPosting JSON-LD is not valid JSON.`);
      }
      if (data) {
        item.checks.jobPosting = {
          type: data['@type'],
          title: data.title,
          datePosted: data.datePosted,
          url: data.url,
          directApply: data.directApply,
          employmentType: data.employmentType,
          jobLocation: data.jobLocation,
          validThrough: data.validThrough,
          hasBaseSalary: Object.prototype.hasOwnProperty.call(data, 'baseSalary'),
        };
        if (data['@type'] !== 'JobPosting') fail(`${jobUrl} JSON-LD @type is not JobPosting.`);
        if (!data.title || !data.description || !data.datePosted) fail(`${jobUrl} JobPosting missing title/description/datePosted.`);
        if (cleanUrl(data.url || '') !== cleanUrl(jobUrl)) fail(`${jobUrl} JobPosting url mismatch.`);
        if (data.directApply !== false) fail(`${jobUrl} JobPosting directApply must remain false.`);
        if (!data.hiringOrganization?.name) fail(`${jobUrl} JobPosting missing hiringOrganization.`);
        if (Object.prototype.hasOwnProperty.call(data, 'baseSalary')) fail(`${jobUrl} unexpectedly emits baseSalary.`);
        if (data.validThrough && Number.isNaN(Date.parse(data.validThrough))) fail(`${jobUrl} emits invalid validThrough.`);
      }
    }

    item.status = report.status === 'fail' ? 'fail' : 'pass';
    console.log(`OK rendered runtime: ${jobUrl}`);
  } catch (error) {
    if (/429|ERR_TOO_MANY_REQUESTS/i.test(String(error))) {
      markInconclusive(`${jobUrl} was rate-limited during rendered verification.`);
      item.status = 'inconclusive';
    } else {
      fail(`${jobUrl} browser verification error: ${error.message || error}`);
      item.status = 'fail';
    }
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const jobUrl of JOBS) {
    await inspectJob(browser, jobUrl);
  }
} finally {
  await browser.close();
}

fs.writeFileSync('live-runtime-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Live runtime verification result: ${report.status.toUpperCase()}`);
if (report.status === 'fail') process.exit(1);
