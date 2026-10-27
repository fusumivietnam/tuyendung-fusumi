#!/usr/bin/env node

import fs from 'node:fs';
import { chromium } from '@playwright/test';

const SITE = 'https://tuyendung.fusumi.vn';
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1366, height: 768 },
];

const report = {
  checkedAt: new Date().toISOString(),
  site: SITE,
  status: 'pass',
  pages: [],
  notes: [],
};

function fail(message) {
  report.status = 'fail';
  report.notes.push(message);
  console.error(`ERROR: ${message}`);
}

function markInconclusive(message) {
  if (report.status !== 'fail') report.status = 'inconclusive';
  report.notes.push(message);
  console.log(`INCONCLUSIVE: ${message}`);
}

async function inspectPage(browser, path, viewport, label) {
  const url = new URL(path, SITE).href;
  const page = await browser.newPage({ viewport });
  const item = {
    label,
    url,
    viewport,
    status: 'pass',
    checks: {},
    failures: [],
  };
  report.pages.push(item);

  const itemFail = (message) => {
    item.status = 'fail';
    item.failures.push(message);
    fail(`${label} [${viewport.name}] ${message}`);
  };

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response?.status() ?? 0;
    item.checks.documentStatus = status;

    if (status === 429) {
      item.status = 'inconclusive';
      markInconclusive(`${label} [${viewport.name}] returned HTTP 429.`);
      return item;
    }
    if (status !== 200) {
      itemFail(`returned HTTP ${status}.`);
      return item;
    }

    await page.waitForTimeout(1200);

    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const width = window.innerWidth;
      const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);

      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };

      const selectors = [
        '.header-row',
        '#page_list_top',
        '.toolbar',
        '.summary',
        '.cta',
        '.content',
        '.fusumi-footer-contact',
        '.fusumi-apply-actions',
      ];

      const bounds = [];
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach((element) => {
          if (!visible(element)) return;
          const rect = element.getBoundingClientRect();
          bounds.push({ selector, left: rect.left, right: rect.right, width: rect.width });
        });
      }

      const offenders = [...document.querySelectorAll('body *')]
        .filter(element => visible(element))
        .map(element => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className.slice(0,100) : '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          };
        })
        .filter(element => element.right > width + 1 || element.left < -1)
        .slice(0, 12);

      const scrollCandidates = [...document.querySelectorAll('body, body *')]
        .map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className.slice(0, 90) : '',
            display: style.display,
            visibility: style.visibility,
            position: style.position,
            overflowX: style.overflowX,
            width: Math.round(rect.width),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          };
        })
        .filter(element => element.scrollWidth > element.clientWidth + 1 || element.right > width + 1)
        .sort((a,b) => (b.scrollWidth-b.clientWidth)-(a.scrollWidth-a.clientWidth))
        .slice(0, 16);

      const richWidthDetails = [...document.querySelectorAll('.post-body h2, .post-body .separator')]
        .map(element => {
          const style = getComputedStyle(element);
          const before = getComputedStyle(element, '::before');
          const after = getComputedStyle(element, '::after');
          const nodes = [...element.querySelectorAll('*')].slice(0, 16).map(child => {
            const r = child.getBoundingClientRect();
            const cs = getComputedStyle(child);
            return { tag:child.tagName.toLowerCase(), className:typeof child.className === 'string' ? child.className.slice(0, 80) : '', right:Math.round(r.right), width:Math.round(r.width), scrollWidth:child.scrollWidth, marginLeft:cs.marginLeft, marginRight:cs.marginRight, inlineStyle:(child.getAttribute('style') || '').slice(0, 180) };
          });
          return { tag:element.tagName.toLowerCase(), className:element.className, text:(element.textContent || '').slice(0, 70), clientWidth:element.clientWidth, scrollWidth:element.scrollWidth, overflowX:style.overflowX, wordBreak:style.wordBreak, overflowWrap:style.overflowWrap, whiteSpace:style.whiteSpace, pseudoBefore:before.content, pseudoAfter:after.content, children:nodes };
        });

      const controls = [];
      document.querySelectorAll('.toolbar input,.toolbar select,.summary .clear,.apply .btn,.fusumi-apply-actions .btn').forEach((element) => {
        if (!visible(element)) return;
        const rect = element.getBoundingClientRect();
        controls.push({
          tag: element.tagName,
          className: element.className || '',
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
        });
      });

      const tables = [];
      document.querySelectorAll('.post-body table').forEach((table) => {
        if (!visible(table)) return;
        const rect = table.getBoundingClientRect();
        const style = getComputedStyle(table);
        tables.push({
          left: rect.left,
          right: rect.right,
          width: rect.width,
          clientWidth: table.clientWidth,
          scrollWidth: table.scrollWidth,
          overflowX: style.overflowX,
          display: style.display,
        });
      });

      return {
        viewportWidth: width,
        scrollWidth,
        horizontalOverflow: scrollWidth > width + 1,
        offenders,
        scrollCandidates,
        richWidthDetails,
        bounds,
        controls,
        tables,
      };
    });

    item.checks.layout = layout;

    if (layout.horizontalOverflow) {
      itemFail(`page horizontally overflows: scrollWidth=${layout.scrollWidth}, viewport=${layout.viewportWidth}. Offenders: ${JSON.stringify(layout.offenders)}; Scroll candidates: ${JSON.stringify(layout.scrollCandidates)}; Rich widths: ${JSON.stringify(layout.richWidthDetails)}`);
    }

    for (const bound of layout.bounds) {
      if (bound.left < -1 || bound.right > layout.viewportWidth + 1) {
        itemFail(`${bound.selector} escapes viewport bounds (${Math.round(bound.left)}..${Math.round(bound.right)} of ${layout.viewportWidth}).`);
      }
    }

    for (const control of layout.controls) {
      if (control.left < -1 || control.right > layout.viewportWidth + 1) {
        itemFail(`control ${control.tag}.${control.className} escapes viewport bounds.`);
      }
      if (viewport.name === 'mobile' && control.height < 40) {
        itemFail(`mobile control ${control.tag}.${control.className} is only ${Math.round(control.height)}px high.`);
      }
    }

    if (viewport.name === 'mobile') {
      for (const table of layout.tables) {
        const internallyScrollable = ['auto', 'scroll'].includes(table.overflowX);
        const fitsViewport = table.left >= -1 && table.right <= layout.viewportWidth + 1;
        if (!fitsViewport && !internallyScrollable) {
          itemFail('job metadata table overflows without an internal horizontal scroll container.');
        }
      }
    }

    console.log(`OK responsive: ${label} [${viewport.name}]`);
    return item;
  } catch (error) {
    if (/429|ERR_TOO_MANY_REQUESTS/i.test(String(error))) {
      item.status = 'inconclusive';
      markInconclusive(`${label} [${viewport.name}] was rate-limited.`);
    } else {
      itemFail(`browser verification error: ${error.message || error}`);
    }
    return item;
  } finally {
    await page.close();
  }
}

async function discoverJobPath(browser) {
  const page = await browser.newPage({ viewport: VIEWPORTS[0] });
  try {
    const response = await page.goto(`${SITE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (response?.status() === 429) return null;
    await page.waitForTimeout(900);
    const href = await page.locator('.job a[href*="/20"]').first().getAttribute('href').catch(() => null);
    if (!href) return null;
    const url = new URL(href, SITE);
    return url.pathname;
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const targets = [
    { path: '/', label: 'Homepage' },
    { path: '/search', label: 'Search' },
    { path: '/p/ung-tuyen.html', label: 'Apply page' },
  ];

  const jobPath = await discoverJobPath(browser);
  if (jobPath) {
    targets.push({ path: jobPath, label: 'Live job post' });
  } else {
    markInconclusive('Could not discover a live job URL for responsive verification.');
  }

  for (const target of targets) {
    for (const viewport of VIEWPORTS) {
      await inspectPage(browser, target.path, viewport, target.label);
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync('live-responsive-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Live responsive verification result: ${report.status.toUpperCase()}`);
if (report.status === 'fail') process.exit(1);
