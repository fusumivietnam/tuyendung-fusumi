import fs from 'node:fs';

export function runtimeReportJobPath(path, site = 'https://tuyendung.fusumi.vn') {
  let report;
  try {
    report = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    return '';
  }
  try {
    if (new URL(report.site).origin !== new URL(site).origin) return '';
  } catch {
    return '';
  }
  for (const job of report.jobs || []) {
    try {
      const url = new URL(job.url);
      if (url.origin === new URL(site).origin && /^\/\d{4}\/\d{2}\/[^/]+\.html$/.test(url.pathname)) {
        return url.pathname;
      }
    } catch { /* ignore invalid entries */ }
  }
  return '';
}
