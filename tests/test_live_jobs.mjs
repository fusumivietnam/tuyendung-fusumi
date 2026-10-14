#!/usr/bin/env node
import assert from 'node:assert/strict';
import { extractJobUrlsFromFeed, extractJobUrlsFromLinks, normalizeJobUrl } from '../scripts/live_jobs.mjs';

const SITE = 'https://tuyendung.fusumi.vn';

assert.equal(
  normalizeJobUrl('/2026/10/ke-toan-noi-bo.html?m=1#x', SITE),
  `${SITE}/2026/10/ke-toan-noi-bo.html`,
);
assert.equal(normalizeJobUrl('/p/ung-tuyen.html', SITE), '');
assert.equal(normalizeJobUrl('https://example.com/2026/10/job.html', SITE), '');

const feed = {
  feed: {
    entry: [
      { link: [{ rel: 'alternate', href: `${SITE}/2026/10/ke-toan-noi-bo.html` }] },
      { link: [{ rel: 'alternate', href: `${SITE}/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html?m=1` }] },
      { link: [{ rel: 'self', href: `${SITE}/feeds/posts/default/1` }] },
    ],
  },
};
assert.deepEqual(extractJobUrlsFromFeed(feed, SITE), [
  `${SITE}/2026/10/ke-toan-noi-bo.html`,
  `${SITE}/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html`,
]);

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

console.log('Live job discovery parsing tests passed.');
