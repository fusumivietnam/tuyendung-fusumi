#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  classifyLifecycleFromText,
  extractJobsFromFeed,
  extractJobUrlsFromFeed,
  extractJobUrlsFromLinks,
  normalizeJobUrl,
  parseDeadlineFromText,
} from '../scripts/live_jobs.mjs';

const SITE = 'https://tuyendung.fusumi.vn';
const NOW = new Date('2026-10-14T12:00:00+07:00');

assert.equal(
  normalizeJobUrl('/2026/10/ke-toan-noi-bo.html?m=1#x', SITE),
  `${SITE}/2026/10/ke-toan-noi-bo.html`,
);
assert.equal(normalizeJobUrl('/p/ung-tuyen.html', SITE), '');
assert.equal(normalizeJobUrl('https://example.com/2026/10/job.html', SITE), '');

assert.deepEqual(parseDeadlineFromText('Hạn ứng tuyển: 31/12/2026'), {
  raw: '31/12/2026',
  valid: true,
  validThrough: '2026-12-31T23:59:59+07:00',
});
assert.deepEqual(parseDeadlineFromText('Hạn ứng tuyển: 2026-10-01'), {
  raw: '2026-10-01',
  valid: true,
  validThrough: '2026-10-01T23:59:59+07:00',
});
assert.deepEqual(parseDeadlineFromText('Hạn ứng tuyển: 31/02/2026'), {
  raw: '31/02/2026',
  valid: false,
  validThrough: '',
});
assert.equal(parseDeadlineFromText('Không công bố deadline'), null);

assert.equal(classifyLifecycleFromText('Không có hạn ứng tuyển', NOW).lifecycle, 'open');
assert.equal(classifyLifecycleFromText('Hạn ứng tuyển: 31/12/2026', NOW).lifecycle, 'open');
assert.equal(classifyLifecycleFromText('Hạn ứng tuyển: 01/10/2026', NOW).lifecycle, 'expired');
assert.equal(classifyLifecycleFromText('Hạn ứng tuyển: 31/02/2026', NOW).lifecycle, 'inconclusive');

const feed = {
  feed: {
    entry: [
      {
        link: [{ rel: 'alternate', href: `${SITE}/2026/10/ke-toan-noi-bo.html` }],
        content: { $t: '<table><tr><th>Hạn ứng tuyển</th><td>31/12/2026</td></tr></table>' },
      },
      {
        link: [{ rel: 'alternate', href: `${SITE}/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html?m=1` }],
        content: { $t: '<p>Hạn ứng tuyển: 01/10/2026</p>' },
      },
      { link: [{ rel: 'self', href: `${SITE}/feeds/posts/default/1` }] },
    ],
  },
};
assert.deepEqual(extractJobUrlsFromFeed(feed, SITE), [
  `${SITE}/2026/10/ke-toan-noi-bo.html`,
  `${SITE}/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html`,
]);

const jobs = extractJobsFromFeed(feed, SITE, NOW);
assert.equal(jobs[0].lifecycle, 'open');
assert.equal(jobs[0].validThrough, '2026-12-31T23:59:59+07:00');
assert.equal(jobs[1].lifecycle, 'expired');
assert.equal(jobs[1].validThrough, '2026-10-01T23:59:59+07:00');

assert.deepEqual(
  extractJobUrlsFromLinks([
    `${SITE}/2026/10/ke-toan-noi-bo.html`,
    '/2026/10/ke-toan-noi-bo.html?m=1',
    '/p/ve-fusumi.html',
    `${SITE}/2026/11/job-moi.html#section`,
  ], SITE),
  [
    `${SITE}/2026/10/ke-toan-noi-bo.html`,
    `${SITE}/2026/11/job-moi.html`,
  ],
);

console.log('Live job discovery + lifecycle parsing tests passed.');
