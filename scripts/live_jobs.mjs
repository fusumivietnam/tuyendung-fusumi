#!/usr/bin/env node

const DEFAULT_SITE = 'https://tuyendung.fusumi.vn';
const JOB_PATH = /^\/\d{4}\/\d{2}\/[^/?#]+\.html$/;

export function normalizeJobUrl(raw, site = DEFAULT_SITE) {
  try {
    const base = new URL(site);
    const url = new URL(raw, base);
    if (url.origin !== base.origin || !JOB_PATH.test(url.pathname)) return '';
    return `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

export function parseDeadlineFromText(text) {
  const normalized = String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = normalized.match(/Hạn ứng tuyển\s*:\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i);
  if (!match) return null;

  const raw = match[1];
  let year;
  let month;
  let day;
  if (/^\d{4}-/.test(raw)) {
    [year, month, day] = raw.split('-').map(Number);
  } else {
    [day, month, year] = raw.split(/[\/.-]/).map(Number);
  }

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return { raw, valid: false, validThrough: '' };
  }

  const pad = value => String(value).padStart(2, '0');
  return {
    raw,
    valid: true,
    validThrough: `${year}-${pad(month)}-${pad(day)}T23:59:59+07:00`,
  };
}

export function classifyLifecycleFromText(text, now = new Date()) {
  const deadline = parseDeadlineFromText(text);
  if (!deadline) {
    return { lifecycle: 'open', reason: 'no-deadline', validThrough: '' };
  }
  if (!deadline.valid) {
    return { lifecycle: 'inconclusive', reason: `invalid-deadline:${deadline.raw}`, validThrough: '' };
  }
  const expiry = Date.parse(deadline.validThrough);
  if (Number.isNaN(expiry)) {
    return { lifecycle: 'inconclusive', reason: `unparseable-deadline:${deadline.raw}`, validThrough: '' };
  }
  return {
    lifecycle: now.getTime() > expiry ? 'expired' : 'open',
    reason: 'deadline',
    validThrough: deadline.validThrough,
  };
}

function feedEntryBody(entry) {
  return entry?.content?.$t || entry?.summary?.$t || '';
}

export function extractJobsFromFeed(feed, site = DEFAULT_SITE, now = new Date()) {
  const entries = feed?.feed?.entry || [];
  const jobs = [];
  for (const entry of entries) {
    const links = Array.isArray(entry?.link) ? entry.link : [];
    const alternate = links.find(link => link?.rel === 'alternate' && link?.href);
    const url = normalizeJobUrl(alternate?.href || '', site);
    if (!url) continue;
    const lifecycle = classifyLifecycleFromText(feedEntryBody(entry), now);
    jobs.push({ url, ...lifecycle, lifecycleSource: 'blogger-feed' });
  }
  return [...new Map(jobs.map(job => [job.url, job])).values()];
}

export function extractJobUrlsFromFeed(feed, site = DEFAULT_SITE) {
  return extractJobsFromFeed(feed, site).map(job => job.url);
}

export function extractJobUrlsFromLinks(links, site = DEFAULT_SITE) {
  return [...new Set((links || []).map(link => normalizeJobUrl(link, site)).filter(Boolean))];
}

async function discoverFromFeed(browser, site) {
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiJobDiscovery/1.1',
  });
  const feedUrl = `${site.replace(/\/$/, '')}/feeds/posts/default?alt=json&max-results=150`;
  try {
    const response = await page.goto(feedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response?.status() ?? 0;
    if (status === 429) return { jobs: [], note: 'Blogger feed returned HTTP 429' };
    if (status < 200 || status >= 400) return { jobs: [], note: `Blogger feed returned HTTP ${status}` };
    const raw = await page.locator('body').innerText();
    const feed = JSON.parse(raw);
    return { jobs: extractJobsFromFeed(feed, site), note: '' };
  } catch (error) {
    return { jobs: [], note: `Feed discovery failed: ${error?.message || error}` };
  } finally {
    await page.close();
  }
}

async function discoverFromHomepage(browser, site) {
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiJobDiscovery/1.1',
  });
  try {
    const response = await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response?.status() ?? 0;
    if (status === 429) return { jobs: [], note: 'Homepage returned HTTP 429' };
    if (status < 200 || status >= 400) return { jobs: [], note: `Homepage returned HTTP ${status}` };
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.href));
    const jobs = extractJobUrlsFromLinks(links, site).map(url => ({
      url,
      lifecycle: 'inconclusive',
      reason: 'homepage-discovery-has-no-post-body',
      validThrough: '',
      lifecycleSource: 'homepage',
    }));
    return { jobs, note: '' };
  } catch (error) {
    return { jobs: [], note: `Homepage discovery failed: ${error?.message || error}` };
  } finally {
    await page.close();
  }
}

function result(jobs, source, notes) {
  const sorted = [...jobs].sort((a, b) => a.url.localeCompare(b.url));
  return { jobs: sorted, urls: sorted.map(job => job.url), source, notes };
}

export async function discoverLiveJobs(browser, { site = DEFAULT_SITE } = {}) {
  const notes = [];
  const feed = await discoverFromFeed(browser, site);
  if (feed.note) notes.push(feed.note);
  if (feed.jobs.length) return result(feed.jobs, 'blogger-feed', notes);

  const homepage = await discoverFromHomepage(browser, site);
  if (homepage.note) notes.push(homepage.note);
  if (homepage.jobs.length) return result(homepage.jobs, 'homepage', notes);

  return result([], 'none', notes);
}
