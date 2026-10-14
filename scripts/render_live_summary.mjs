#!/usr/bin/env node

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const GENERIC_DESCRIPTION = 'Trang thông tin tuyển dụng chính thức của Fusumi Việt Nam';

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function statusBadge(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'PASS') return '✅ PASS';
  if (value === 'FAIL') return '❌ FAIL';
  if (value === 'INCONCLUSIVE') return '⚠️ INCONCLUSIVE';
  return '—';
}

function lifecycleBadge(value) {
  if (value === 'open') return '🟢 Open';
  if (value === 'expired') return '⚫ Expired';
  if (value === 'inconclusive') return '🟡 Inconclusive';
  return '—';
}

function escapeCell(value) {
  return String(value ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';
}

function labelValue(labels, prefix) {
  const label = (labels || []).find(item => String(item).trim().startsWith(prefix));
  return label ? String(label).trim().slice(prefix.length).trim() : '';
}

function failureMatches(runtime, pattern) {
  return (runtime?.failures || []).some(message => pattern.test(String(message)));
}

function jobPostingCell(runtime, lifecycle) {
  if (!runtime) return '—';
  if (runtime.status === 'inconclusive' || lifecycle === 'inconclusive') return '⚠️';
  if (lifecycle === 'expired') {
    return runtime.checks?.jobPostingCount === 0 && !failureMatches(runtime, /JobPosting/i) ? '✅ absent' : '❌';
  }
  if (lifecycle === 'open') {
    return runtime.checks?.jobPosting && !failureMatches(runtime, /JobPosting|JSON-LD/i) ? '✅ present' : '❌';
  }
  return '—';
}

function applyCell(runtime, lifecycle) {
  if (!runtime) return '—';
  if (runtime.status === 'inconclusive' || lifecycle === 'inconclusive') return '⚠️';
  if (lifecycle === 'expired') {
    return failureMatches(runtime, /Apply CTA/i) ? '❌' : '✅ disabled';
  }
  if (lifecycle === 'open') {
    return runtime.checks?.applyHref && !failureMatches(runtime, /Apply CTA|Apply Page|vi-tri|job parameter/i) ? '✅ active' : '❌';
  }
  return '—';
}

function seoCell(runtime) {
  if (!runtime) return '—';
  if (runtime.status === 'inconclusive') return '⚠️';
  const canonical = runtime.checks?.canonical || '';
  const description = runtime.checks?.metaDescription || '';
  const failed = failureMatches(runtime, /canonical|meta description/i);
  return canonical && description && description !== GENERIC_DESCRIPTION && !failed ? '✅' : '❌';
}

function summaryStatus(authoring, runtime) {
  const values = [authoring?.status, runtime?.status].map(value => String(value || '').toUpperCase());
  if (values.includes('FAIL')) return '❌ FAIL';
  if (values.includes('INCONCLUSIVE') || values.includes('')) return '⚠️ INCONCLUSIVE';
  return '✅ PASS';
}

export function renderSummary(authoringReport, runtimeReport) {
  const byUrl = new Map();
  for (const item of authoringReport?.jobs || []) {
    if (!item?.url) continue;
    byUrl.set(item.url, { ...(byUrl.get(item.url) || {}), authoring: item });
  }
  for (const item of runtimeReport?.jobs || []) {
    if (!item?.url) continue;
    byUrl.set(item.url, { ...(byUrl.get(item.url) || {}), runtime: item });
  }

  const lines = [
    '## Fusumi Careers — Live Status Dashboard',
    '',
    `- Site: ${runtimeReport?.site || authoringReport?.site || 'https://tuyendung.fusumi.vn/'}`,
    `- Discovery: ${runtimeReport?.discovery?.source || authoringReport?.discovery?.source || 'unavailable'}`,
    `- Checked: ${runtimeReport?.checkedAt || authoringReport?.checkedAt || 'unavailable'}`,
    '- Legend: ✅ pass · ❌ fail · ⚠️ inconclusive · — unavailable',
    '',
    '| Job | Location | Lifecycle | Authoring QA | Runtime | JobPosting | Apply | SEO |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  const rows = [...byUrl.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (!rows.length) {
    lines.push('| No job data | — | — | ⚠️ | ⚠️ | — | — | — |');
  }

  for (const [url, pair] of rows) {
    const authoring = pair.authoring;
    const runtime = pair.runtime;
    const title = authoring?.title || runtime?.checks?.title || new URL(url).pathname.split('/').pop()?.replace(/\.html$/, '') || url;
    const location = labelValue(authoring?.labels, 'ĐĐ:') || '—';
    const lifecycle = runtime?.lifecycle || authoring?.lifecycle || 'inconclusive';
    const linkedTitle = `[${escapeCell(title)}](${url})`;
    lines.push(`| ${linkedTitle} | ${escapeCell(location)} | ${lifecycleBadge(lifecycle)} | ${statusBadge(authoring?.status)} | ${statusBadge(runtime?.status)} | ${jobPostingCell(runtime, lifecycle)} | ${applyCell(runtime, lifecycle)} | ${seoCell(runtime)} |`);
  }

  const totals = { pass: 0, fail: 0, inconclusive: 0, open: 0, expired: 0 };
  for (const [, pair] of rows) {
    const status = summaryStatus(pair.authoring, pair.runtime);
    if (status.includes('FAIL')) totals.fail += 1;
    else if (status.includes('INCONCLUSIVE')) totals.inconclusive += 1;
    else totals.pass += 1;
    const lifecycle = pair.runtime?.lifecycle || pair.authoring?.lifecycle;
    if (lifecycle === 'open') totals.open += 1;
    if (lifecycle === 'expired') totals.expired += 1;
  }

  lines.push('', `**Overall:** ✅ ${totals.pass} pass · ❌ ${totals.fail} fail · ⚠️ ${totals.inconclusive} inconclusive · 🟢 ${totals.open} open · ⚫ ${totals.expired} expired`);

  const notes = [...(authoringReport?.discovery?.notes || []), ...(runtimeReport?.notes || [])];
  if (notes.length) {
    lines.push('', '<details><summary>Notes / diagnostics</summary>', '');
    for (const note of [...new Set(notes)]) lines.push(`- ${escapeCell(note)}`);
    lines.push('', '</details>');
  }

  if (!authoringReport || !runtimeReport) {
    lines.push('', '> ⚠️ One or more JSON reports were unavailable. Dashboard cells marked `—` or `INCONCLUSIVE` are not treated as production regressions by this renderer.');
  }

  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const authoring = readJson(process.argv[2] || 'live-authoring-report.json');
  const runtime = readJson(process.argv[3] || 'live-runtime-report.json');
  process.stdout.write(renderSummary(authoring, runtime));
}
