# Browser runtime tests

Fusumi Careers uses a three-layer validation model:

1. `scripts/check_runtime_contract.py` validates source-level runtime contracts without a browser.
2. `tests/runtime.spec.js` executes `templates/fusumi-careers-runtime.html` in Chromium with deterministic Blogger fixtures.
3. `scripts/check_live_site.py` probes the deployed Blogger site when Blogger accepts requests from the GitHub-hosted runner.

## What Playwright covers

The browser tests verify JavaScript behavior that plain HTTP cannot observe reliably:

- JobPosting JSON-LD is injected after the Blogger feed metadata is resolved.
- Job title, `datePosted`, `employmentType`, `jobLocation`, `validThrough`, `totalJobOpenings`, canonical URL, organization and identifier are populated.
- Job-detail CTA carries `vi-tri` and the canonical `job` URL to `/p/ung-tuyen.html`.
- The Apply page reads query parameters and prefills the HR email action.
- Search/filter accessibility state updates `aria-live`, `aria-disabled`, and the Escape-to-clear behavior.

The tests mock only network responses. The runtime JavaScript itself is read directly from `templates/fusumi-careers-runtime.html`, so regressions in that source are exercised by Chromium.

## Blogger HTTP 429

Blogger may rate-limit GitHub-hosted runner IPs before the first production request. The live smoke test retries with backoff. If every retry returns HTTP 429, the live result is reported as `INCONCLUSIVE` rather than a deployment failure. Other HTTP failures, missing selectors, canonical mismatches, missing job cards, missing runtime markers, and broken apply routes still fail the live test.

This separation prevents Blogger infrastructure throttling from masking deterministic runtime regressions while retaining a production probe whenever the public site is reachable from GitHub Actions.
