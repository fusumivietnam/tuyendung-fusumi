#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildFailureMarkdown, evaluateRegression, ISSUE_TITLE } from '../scripts/sync_live_failure_issue.mjs';

assert.equal(ISSUE_TITLE, '[Production] Fusumi Careers live audit failure');

const passRuntime = {
  status: 'pass',
  jobs: [
    { url: 'https://tuyendung.fusumi.vn/2026/10/job-a.html', status: 'pass', checks: { title: 'Job A' }, failures: [] },
  ],
};
assert.equal(evaluateRegression(passRuntime).action, 'close-if-open');

const runtimeFail = {
  status: 'fail',
  jobs: [
    {
      url: 'https://tuyendung.fusumi.vn/2026/10/job-a.html',
      status: 'fail',
      checks: { title: 'Job A' },
      failures: ['JobPosting missing title/description/datePosted.', 'Apply CTA path mismatch.'],
    },
  ],
};
let decision = evaluateRegression(runtimeFail);
assert.equal(decision.action, 'open-or-update');
assert.equal(decision.failures.length, 2);
assert.match(buildFailureMarkdown(decision, { runUrl: 'https://github.com/x/y/actions/runs/1' }), /JobPosting missing/);
assert.match(buildFailureMarkdown(decision), /INCONCLUSIVE states do not create or update/);
assert.doesNotMatch(buildFailureMarkdown(decision), /Authoring QA/);

const inconclusiveRuntime = {
  status: 'inconclusive',
  jobs: [
    { url: 'https://tuyendung.fusumi.vn/2026/10/job-a.html', status: 'inconclusive', checks: { title: 'Job A' }, failures: [] },
  ],
  notes: ['Blogger returned HTTP 429'],
};
decision = evaluateRegression(inconclusiveRuntime);
assert.equal(decision.action, 'no-op');
assert.equal(decision.failures.length, 0);
assert.ok(decision.inconclusive.length >= 1);

assert.equal(evaluateRegression(null).action, 'no-op');

console.log('Live regression issue decision tests passed.');
