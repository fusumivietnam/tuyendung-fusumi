import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runtimeReportJobPath } from '../scripts/responsive_job_path.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusumi-responsive-'));
const file = path.join(dir, 'runtime.json');
try {
  assert.equal(runtimeReportJobPath(file), '');
  fs.writeFileSync(file, JSON.stringify({
    site: 'https://tuyendung.fusumi.vn',
    jobs: [
      { url: 'https://evil.example/2026/10/fake.html' },
      { url: 'https://tuyendung.fusumi.vn/2026/10/job.html?tracking=1' },
    ],
  }));
  assert.equal(runtimeReportJobPath(file), '/2026/10/job.html');
  fs.writeFileSync(file, JSON.stringify({ site: 'https://evil.example', jobs: [{ url: 'https://tuyendung.fusumi.vn/2026/10/job.html' }] }));
  assert.equal(runtimeReportJobPath(file), '');
  fs.writeFileSync(file, 'not json');
  assert.equal(runtimeReportJobPath(file), '');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('Responsive reuse audit tests passed.');
