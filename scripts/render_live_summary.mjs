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

export function renderSummary(runtimeReport) {
  const jobs = [...(runtimeReport?.jobs || [])]
    .filter(item => item?.url)
    .sort((a, b) => a.url.localeCompare(b.url));

  const lines = [
    '## Fusumi Careers — Live Status Dashboard',
    '',
    `- Site: ${runtimeReport?.site || 'https://tuyendung.fusumi.vn/'}`,
    `- Discovery: ${runtimeReport?.discovery?.source || 'unavailable'}`,
    `- Checked: ${runtimeReport?.checkedAt || 'unavailable'}`,
    '- Monitoring scope: rendered production runtime and user-facing behavior',
    '- Legend: ✅ pass · ❌ fail · ⚠️ inconclusive · — unavailable',
    '',
    '| Job | Lifecycle | Runtime | JobPosting | Apply | SEO |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  if (!jobs.length) {
    lines.push('| No job data | — | ⚠️ | — | — | — |');
  }

  for (const runtime of jobs) {
    const url = runtime.url;
    const title = runtime.checks?.title || new URL(url).pathname.split('/').pop()?.replace(/\.html$/, '') || url;
    const lifecycle = runtime.lifecycle || 'inconclusive';
    const linkedTitle = `[${escapeCell(title)}](${url})`;
    lines.push(`| ${linkedTitle} | ${lifecycleBadge(lifecycle)} | ${statusBadge(runtime.status)} | ${jobPostingCell(runtime, lifecycle)} | ${applyCell(runtime, lifecycle)} | ${seoCell(runtime)} |`);
  }

  const totals = { pass: 0, fail: 0, inconclusive: 0, open: 0, expired: 0 };
  for (const runtime of jobs) {
    const status = String(runtime.status || '').toUpperCase();
    if (status === 'FAIL') totals.fail += 1;
    else if (status === 'PASS') totals.pass += 1;
    else totals.inconclusive += 1;
    if (runtime.lifecycle === 'open') totals.open += 1;
    if (runtime.lifecycle === 'expired') totals.expired += 1;
  }

  lines.push('', `**Overall:** ✅ ${totals.pass} pass · ❌ ${totals.fail} fail · ⚠️ ${totals.inconclusive} inconclusive · 🟢 ${totals.open} open · ⚫ ${totals.expired} expired`);

  const notes = runtimeReport?.notes || [];
  if (notes.length) {
    lines.push('', '<details><summary>Notes / diagnostics</summary>', '');
    for (const note of [...new Set(notes)]) lines.push(`- ${escapeCell(note)}`);
    lines.push('', '</details>');
  }

  if (!runtimeReport) {
    lines.push('', '> ⚠️ Runtime JSON report was unavailable. This dashboard does not treat missing or inconclusive data as a production regression.');
  }

  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtime = readJson(process.argv[2] || 'live-runtime-report.json');
  process.stdout.write(renderSummary(runtime));
}
