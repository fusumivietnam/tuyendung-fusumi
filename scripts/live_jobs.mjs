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

export function extractJobUrlsFromFeed(feed, site = DEFAULT_SITE) {
  const entries = feed?.feed?.entry || [];
  const urls = [];
  for (const entry of entries) {
    const links = Array.isArray(entry?.link) ? entry.link : [];
    const alternate = links.find(link => link?.rel === 'alternate' && link?.href);
    const url = normalizeJobUrl(alternate?.href || '', site);
    if (url) urls.push(url);
  }
  return [...new Set(urls)];
}

export function extractJobUrlsFromLinks(links, site = DEFAULT_SITE) {
  return [...new Set((links || []).map(link => normalizeJobUrl(link, site)).filter(Boolean))];
}

async function discoverFromFeed(browser, site) {
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiJobDiscovery/1.0',
  });
  const feedUrl = `${site.replace(/\/$/, '')}/feeds/posts/default?alt=json&max-results=150`;
  try {
    const response = await page.goto(feedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response?.status() ?? 0;
    if (status === 429) return { urls: [], note: 'Blogger feed returned HTTP 429' };
    if (status < 200 || status >= 400) return { urls: [], note: `Blogger feed returned HTTP ${status}` };
    const raw = await page.locator('body').innerText();
    const feed = JSON.parse(raw);
    return { urls: extractJobUrlsFromFeed(feed, site), note: '' };
  } catch (error) {
    return { urls: [], note: `Feed discovery failed: ${error?.message || error}` };
  } finally {
    await page.close();
  }
}

async function discoverFromHomepage(browser, site) {
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiJobDiscovery/1.0',
  });
  try {
    const response = await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response?.status() ?? 0;
    if (status === 429) return { urls: [], note: 'Homepage returned HTTP 429' };
    if (status < 200 || status >= 400) return { urls: [], note: `Homepage returned HTTP ${status}` };
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.href));
    return { urls: extractJobUrlsFromLinks(links, site), note: '' };
  } catch (error) {
    return { urls: [], note: `Homepage discovery failed: ${error?.message || error}` };
  } finally {
    await page.close();
  }
}

export async function discoverLiveJobs(browser, { site = DEFAULT_SITE } = {}) {
  const notes = [];
  const feed = await discoverFromFeed(browser, site);
  if (feed.note) notes.push(feed.note);
  if (feed.urls.length) {
    return { urls: feed.urls.sort(), source: 'blogger-feed', notes };
  }

  const homepage = await discoverFromHomepage(browser, site);
  if (homepage.note) notes.push(homepage.note);
  if (homepage.urls.length) {
    return { urls: homepage.urls.sort(), source: 'homepage', notes };
  }

  return { urls: [], source: 'none', notes };
}
