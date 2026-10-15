#!/usr/bin/env node

import assert from 'node:assert/strict';
import { renderSummary } from '../scripts/render_live_summary.mjs';

const site = 'https://tuyendung.fusumi.vn';
const runtime = {
  checkedAt: '2026-10-15T00:00:01.000Z',
  site,
  discovery: { source: 'blogger-feed' },
  notes: [],
  jobs: [
    {
      url: `${site}/2026/10/open-job.html`,
      status: 'pass',
      lifecycle: 'open',
      failures: [],
      checks: {
        title: 'Open Job',
        canonical: `${site}/2026/10/open-job.html`,
        metaDescription: 'Fusumi tuyển Open Job tại Hà Nội.',
        applyHref: '/p/ung-tuyen.html?vi-tri=Open+Job&job=https%3A%2F%2Ftuyendung.fusumi.vn%2F2026%2F10%2Fopen-job.html',
        jobPosting: { type: 'JobPosting' },
      },
    },
    {
      url: `${site}/2026/10/expired-job.html`,
      status: 'pass',
      lifecycle: 'expired',
      failures: [],
      checks: {
        title: 'Expired Job',
        canonical: `${site}/2026/10/expired-job.html`,
        metaDescription: 'Fusumi tuyển Expired Job tại Hà Nội.',
        jobPostingCount: 0,
      },
    },
  ],
};

const markdown = renderSummary(runtime);
assert.match(markdown, /Live Status Dashboard/);
assert.match(markdown, /rendered production runtime and user-facing behavior/);
assert.match(markdown, /\[Open Job\]\(https:\/\/tuyendung\.fusumi\.vn\/2026\/10\/open-job\.html\)/);
assert.match(markdown, /Open Job.*🟢 Open.*✅ PASS.*✅ present.*✅ active.*✅/);
assert.match(markdown, /Expired Job.*⚫ Expired.*✅ PASS.*✅ absent.*✅ disabled.*✅/);
assert.doesNotMatch(markdown, /Authoring QA/);
assert.match(markdown, /Overall:.*2 pass.*0 fail.*0 inconclusive.*1 open.*1 expired/);

const partial = renderSummary(null);
assert.match(partial, /Runtime JSON report was unavailable/);
assert.match(partial, /No job data/);

const failedRuntime = structuredClone(runtime);
failedRuntime.jobs[0].status = 'fail';
failedRuntime.jobs[0].failures = [`${site}/2026/10/open-job.html canonical mismatch`];
const failed = renderSummary(failedRuntime);
assert.match(failed, /Open Job.*❌ FAIL/);
assert.match(failed, /Open Job.*\| ❌ \|$/m);

console.log('Live summary renderer tests passed.');
