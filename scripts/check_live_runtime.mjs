#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { classifyLifecycleFromText, discoverLiveJobs } from './live_jobs.mjs';

const SITE = 'https://tuyendung.fusumi.vn';
const GENERIC_DESCRIPTION = 'Trang thông tin tuyển dụng chính thức của Fusumi Việt Nam';
const report = {
  checkedAt: new Date().toISOString(),
  site: SITE,
  status: 'pass',
  discovery: null,
  jobs: [],
  counts: { open: 0, expired: 0, inconclusive: 0 },
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

async function inspectJob(browser, discoveredJob) {
  const jobUrl = discoveredJob.url;
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiCareersRuntimeCheck/1.2',
  });
  const item = { url: jobUrl, discoveryLifecycle: discoveredJob.lifecycle, checks: {}, network: {}, failures: [] };
  report.jobs.push(item);
  const itemFail = (message) => {
    item.failures.push(message);
    fail(message);
  };

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
      item.lifecycle = 'inconclusive';
      report.counts.inconclusive += 1;
      return;
    }
    if (status !== 200) {
      itemFail(`${jobUrl} returned HTTP ${status}.`);
      item.status = 'fail';
      return;
    }

    await page.waitForTimeout(1500);

    const runtimeCount = await page.locator('#fusumi-careers-runtime').count();
    const analyticsCount = await page.locator('#fusumi-analytics-runtime').count();
    const configCount = await page.locator('#fusumi-careers-config').count();
    item.checks.markers = { runtimeCount, analyticsCount, configCount };
    if (runtimeCount !== 1) itemFail(`${jobUrl} missing Careers Runtime marker.`);
    if (analyticsCount !== 1) itemFail(`${jobUrl} missing Analytics Runtime marker.`);
    if (configCount !== 1) itemFail(`${jobUrl} missing Careers Config marker.`);

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    item.checks.canonical = canonical;
    if (!canonical || cleanUrl(canonical) !== cleanUrl(jobUrl)) {
      itemFail(`${jobUrl} canonical mismatch: ${canonical || 'missing'}.`);
    }

    const title = ((await page.locator('.content h1').first().textContent()) || '').replace(/\s+/g, ' ').trim();
    const description = ((await page.locator('meta[name="description"]').first().getAttribute('content')) || '').replace(/\s+/g, ' ').trim();
    const bodyText = (await page.locator('.post-body').first().textContent().catch(() => '')) || '';
    const lifecycle = classifyLifecycleFromText(bodyText);
    item.lifecycle = lifecycle.lifecycle;
    item.lifecycleReason = lifecycle.reason;
    item.validThrough = lifecycle.validThrough;
    item.checks.title = title;
    item.checks.metaDescription = description;
    if (!title) itemFail(`${jobUrl} missing job H1.`);
    if (!description || description === GENERIC_DESCRIPTION) {
      itemFail(`${jobUrl} still has missing/generic meta description.`);
    }

    if (
      discoveredJob.lifecycle !== 'inconclusive' &&
      lifecycle.lifecycle !== 'inconclusive' &&
      discoveredJob.lifecycle !== lifecycle.lifecycle
    ) {
      item.checks.lifecycleMismatch = { discovery: discoveredJob.lifecycle, rendered: lifecycle.lifecycle };
      markInconclusive(`${jobUrl} lifecycle differs between Blogger discovery and rendered page; rendered page is used for contract checks.`);
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) itemFail(`${jobUrl} Config has invalid HR email.`);
      if (!config.applyPage.startsWith('/')) itemFail(`${jobUrl} Config has invalid Apply Page path.`);
      if (!/^entry\.\d+$/.test(config.formPositionEntry)) itemFail(`${jobUrl} Config has invalid Google Form position entry.`);
      if (!/^entry\.\d+$/.test(config.formJobEntry)) itemFail(`${jobUrl} Config has invalid Google Form job entry.`);
      if (!/^G-[A-Z0-9]+$/i.test(config.ga4)) itemFail(`${jobUrl} Config has invalid GA4 measurement ID.`);
    }

    const ga4Loader = await page.locator('script[data-fusumi-ga4]').first().getAttribute('data-fusumi-ga4');
    item.checks.ga4Loader = ga4Loader;
    if (!ga4Loader) itemFail(`${jobUrl} missing GA4 loader marker.`);
    if (config?.ga4 && ga4Loader && config.ga4 !== ga4Loader) {
      itemFail(`${jobUrl} GA4 loader does not match Layout Config.`);
    }

    item.network.feedStatus = feedStatus;

    if (lifecycle.lifecycle === 'expired') {
      report.counts.expired += 1;
      const scopeStatus = await page.locator('.content').first().getAttribute('data-job-status');
      const expiredClass = await page.locator('.content.job-expired').count();
      const statusText = ((await page.locator('[data-job-status-message]').first().textContent().catch(() => '')) || '').trim();
      item.checks.expiredState = { scopeStatus, expiredClass, statusText };
      if (scopeStatus !== 'expired' && expiredClass !== 1) itemFail(`${jobUrl} is expired but runtime did not mark the job expired.`);
      if (!/Đã hết hạn tuyển/i.test(statusText)) itemFail(`${jobUrl} is expired but missing the expired status message.`);

      const applyLinks = page.locator('.apply a,.job-cta a').filter({ hasText: /Ứng tuyển/i });
      const applyCount = await applyLinks.count();
      for (let index = 0; index < applyCount; index += 1) {
        const link = applyLinks.nth(index);
        const href = await link.getAttribute('href');
        const disabled = await link.getAttribute('aria-disabled');
        if (href || disabled !== 'true') itemFail(`${jobUrl} is expired but still exposes an enabled Apply CTA.`);
      }

      await page.waitForTimeout(250);
      const jsonLdCount = await page.locator('#fusumi-jobposting-jsonld').count();
      item.checks.jobPostingCount = jsonLdCount;
      if (jsonLdCount !== 0) itemFail(`${jobUrl} is expired but still emits JobPosting JSON-LD.`);
    } else if (lifecycle.lifecycle === 'open') {
      report.counts.open += 1;
      const applyLink = page.locator('.apply a,.job-cta a').filter({ hasText: /Ứng tuyển/i }).first();
      if (await applyLink.count()) {
        const href = await applyLink.getAttribute('href');
        item.checks.applyHref = href;
        if (!href) {
          itemFail(`${jobUrl} open job Apply CTA has no href.`);
        } else {
          const apply = new URL(href, SITE);
          const expectedPath = config?.applyPage || '/p/ung-tuyen.html';
          if (apply.pathname !== expectedPath) itemFail(`${jobUrl} Apply CTA path mismatch: ${apply.pathname}.`);
          if (cleanUrl(apply.searchParams.get('job') || '') !== cleanUrl(jobUrl)) itemFail(`${jobUrl} Apply CTA job parameter mismatch.`);
          if (!apply.searchParams.get('vi-tri')) itemFail(`${jobUrl} Apply CTA missing vi-tri parameter.`);
        }
      } else {
        itemFail(`${jobUrl} open job is missing visible Apply CTA.`);
      }

      try {
        await page.waitForSelector('#fusumi-jobposting-jsonld', { timeout: 8000 });
      } catch {}
      const rawJsonLd = await page.locator('#fusumi-jobposting-jsonld').first().textContent().catch(() => null);
      if (!rawJsonLd) {
        if (feedStatus === 429) {
          markInconclusive(`${jobUrl} Blogger feed returned HTTP 429, so rendered JobPosting could not be verified.`);
          item.status = 'inconclusive';
          report.counts.inconclusive += 1;
          return;
        }
        itemFail(`${jobUrl} open job is missing rendered fusumi-jobposting-jsonld.`);
      } else {
        let data;
        try {
          data = JSON.parse(rawJsonLd);
        } catch {
          itemFail(`${jobUrl} JobPosting JSON-LD is not valid JSON.`);
        }
        if (data) {
          item.checks.jobPosting = {
            type: data['@type'], title: data.title, datePosted: data.datePosted, url: data.url,
            directApply: data.directApply, employmentType: data.employmentType,
            jobLocation: data.jobLocation, validThrough: data.validThrough,
            hasBaseSalary: Object.prototype.hasOwnProperty.call(data, 'baseSalary'),
          };
          if (data['@type'] !== 'JobPosting') itemFail(`${jobUrl} JSON-LD @type is not JobPosting.`);
          if (!data.title || !data.description || !data.datePosted) itemFail(`${jobUrl} JobPosting missing title/description/datePosted.`);
          if (cleanUrl(data.url || '') !== cleanUrl(jobUrl)) itemFail(`${jobUrl} JobPosting url mismatch.`);
          if (data.directApply !== false) itemFail(`${jobUrl} JobPosting directApply must remain false.`);
          if (!data.hiringOrganization?.name) itemFail(`${jobUrl} JobPosting missing hiringOrganization.`);
          if (Object.prototype.hasOwnProperty.call(data, 'baseSalary')) itemFail(`${jobUrl} unexpectedly emits baseSalary.`);
          if (data.validThrough && Number.isNaN(Date.parse(data.validThrough))) itemFail(`${jobUrl} emits invalid validThrough.`);
        }
      }
    } else {
      report.counts.inconclusive += 1;
      markInconclusive(`${jobUrl} lifecycle is inconclusive (${lifecycle.reason}); Apply/JobPosting lifecycle checks were skipped.`);
      item.status = 'inconclusive';
      return;
    }

    item.status = item.failures.length ? 'fail' : 'pass';
    console.log(`OK rendered runtime: ${jobUrl} [${item.lifecycle}]`);
  } catch (error) {
    if (/429|ERR_TOO_MANY_REQUESTS/i.test(String(error))) {
      markInconclusive(`${jobUrl} was rate-limited during rendered verification.`);
      item.status = 'inconclusive';
      item.lifecycle = item.lifecycle || 'inconclusive';
      report.counts.inconclusive += 1;
    } else {
      itemFail(`${jobUrl} browser verification error: ${error.message || error}`);
      item.status = 'fail';
    }
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const discovery = await discoverLiveJobs(browser, { site: SITE });
  report.discovery = discovery;
  discovery.notes.forEach(note => report.notes.push(note));
  console.log(`Discovered ${discovery.jobs.length} live job(s) via ${discovery.source}.`);

  if (!discovery.jobs.length) {
    markInconclusive('Could not discover any live job URL from Blogger feed or homepage.');
  } else {
    for (const job of discovery.jobs) {
      await inspectJob(browser, job);
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync('live-runtime-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Live runtime verification result: ${report.status.toUpperCase()}`);
if (report.status === 'fail') process.exit(1);
