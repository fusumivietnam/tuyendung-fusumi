#!/usr/bin/env node

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ISSUE_TITLE = '[Production] Fusumi Careers live audit failure';

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function normalizedStatus(value) {
  return String(value || '').trim().toUpperCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function evaluateRegression(runtimeReport) {
  const failures = [];
  const inconclusive = [];
  const jobs = [];

  for (const item of runtimeReport?.jobs || []) {
    if (!item?.url) continue;
    const title = item.checks?.title || '';
    const status = normalizedStatus(item.status);
    jobs.push({ url: item.url, title, runtime: status });

    if (status === 'FAIL') {
      const reasons = item.failures?.length ? item.failures : [item.reason || 'Rendered runtime contract failed'];
      for (const reason of reasons) failures.push({ source: 'Runtime', url: item.url, title, reason });
    }
    if (status === 'INCONCLUSIVE') {
      inconclusive.push({ source: 'Runtime', url: item.url, reason: item.reason || 'Inconclusive' });
    }
  }

  if (normalizedStatus(runtimeReport?.status) === 'FAIL' && !failures.some(item => item.source === 'Runtime')) {
    failures.push({ source: 'Runtime', url: runtimeReport?.site || '', title: '', reason: unique(runtimeReport?.notes || []).join('; ') || 'Runtime report failed' });
  }
  if (normalizedStatus(runtimeReport?.status) === 'INCONCLUSIVE') {
    inconclusive.push({ source: 'Runtime', url: runtimeReport?.site || '', reason: unique(runtimeReport?.notes || []).join('; ') || 'Runtime report inconclusive' });
  }

  const reportPresent = Boolean(runtimeReport);
  const allRowsTrusted = jobs.length > 0 && jobs.every(row => row.runtime === 'PASS');
  const hasInconclusive = inconclusive.length > 0 || jobs.some(row => row.runtime === 'INCONCLUSIVE');
  const hasFailure = failures.length > 0;

  return {
    action: hasFailure ? 'open-or-update' : (reportPresent && allRowsTrusted && !hasInconclusive ? 'close-if-open' : 'no-op'),
    failures,
    inconclusive,
    jobs,
  };
}

function escapeMarkdown(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

export function buildFailureMarkdown(decision, { runUrl = '', checkedAt = '' } = {}) {
  const lines = [
    'A production regression was detected by the Fusumi Careers live runtime audit.',
    '',
  ];
  if (runUrl) lines.push(`- Workflow run: ${runUrl}`);
  if (checkedAt) lines.push(`- Checked: ${checkedAt}`);
  lines.push('', '| Source | Job | Failure |', '| --- | --- | --- |');
  for (const failure of decision.failures) {
    const name = escapeMarkdown(failure.title) || escapeMarkdown(failure.url) || 'Site';
    const job = failure.url ? `[${name}](${failure.url})` : name;
    lines.push(`| ${escapeMarkdown(failure.source)} | ${job} | ${escapeMarkdown(failure.reason)} |`);
  }
  lines.push('', '> HTTP 429 and other INCONCLUSIVE states do not create or update this issue.');
  return `${lines.join('\n')}\n`;
}

async function githubRequest(path, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'fusumi-careers-live-regression-sync',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed: HTTP ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

async function findIssue() {
  const issues = await githubRequest('/issues?state=all&per_page=100');
  return issues.find(issue => !issue.pull_request && issue.title === ISSUE_TITLE) || null;
}

async function syncIssue(decision, options) {
  const existing = await findIssue();
  if (decision.action === 'open-or-update') {
    const body = buildFailureMarkdown(decision, options);
    if (!existing) {
      const created = await githubRequest('/issues', { method: 'POST', body: { title: ISSUE_TITLE, body } });
      console.log(`Created production regression issue #${created.number}.`);
      return;
    }
    if (existing.state === 'closed') {
      await githubRequest(`/issues/${existing.number}`, { method: 'PATCH', body: { state: 'open' } });
    }
    await githubRequest(`/issues/${existing.number}/comments`, { method: 'POST', body: { body } });
    console.log(`${existing.state === 'closed' ? 'Reopened and updated' : 'Updated'} production regression issue #${existing.number}.`);
    return;
  }

  if (decision.action === 'close-if-open' && existing?.state === 'open') {
    const message = [
      'Production recovery confirmed by the live runtime audit: all discovered jobs passed rendered runtime checks.',
      options.runUrl ? `\nWorkflow run: ${options.runUrl}` : '',
    ].join('');
    await githubRequest(`/issues/${existing.number}/comments`, { method: 'POST', body: { body: message } });
    await githubRequest(`/issues/${existing.number}`, { method: 'PATCH', body: { state: 'closed' } });
    console.log(`Closed recovered production regression issue #${existing.number}.`);
    return;
  }

  console.log('No production regression issue change required.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtime = readJson(process.argv[2] || 'live-runtime-report.json');
  const decision = evaluateRegression(runtime);
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : '';
  const checkedAt = runtime?.checkedAt || new Date().toISOString();

  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) {
    console.log(JSON.stringify(decision, null, 2));
  } else {
    await syncIssue(decision, { runUrl, checkedAt });
  }
}
