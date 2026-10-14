# Live smoke test

`Live Smoke Test` checks the public Blogger deployment without modifying Blogger.

## Triggers

- after updates land on `main`;
- manual `workflow_dispatch`;
- daily at 08:00 Asia/Ho_Chi_Minh.

## Strategy

Blogger can rate-limit GitHub-hosted runners (HTTP 429), so the live test keeps request volume low and separates static HTML from rendered runtime checks.

### Static HTML probe

`scripts/check_live_site.py`:

1. fetches homepage and validates core UI markers, Page links, job cards, canonical URL, and runtime gadget marker;
2. discovers one published job from homepage and fetches it after a short pacing delay;
3. validates job canonical, apply CTA, JobPosting marker, and runtime marker;
4. fetches the Apply Page with the same `vi-tri` + `job` query shape emitted by the runtime;
5. uses a short, bounded 429 retry policy before considering the static probe unavailable.

The static probe is intentionally fast-fail for Blogger rate limiting:

- 3 attempts per URL by default;
- 12 second request timeout;
- 429 backoff of 2s then 4s;
- `Retry-After` is honored but capped at 10s;
- pacing between successful public requests defaults to 1.5s.

Persistent HTTP 429 remains `INCONCLUSIVE`, not a production regression. This keeps the static probe useful without making every workflow wait close to a minute when Blogger blocks GitHub-hosted runner IPs.

### Rendered browser probe

`scripts/check_live_runtime.mjs` launches Chromium against the automatically discovered published jobs and validates the DOM after JavaScript execution:

- exactly one Careers Runtime marker;
- exactly one Analytics Runtime marker;
- exactly one Careers Config marker;
- canonical URL equals the clean job URL;
- meta description is present and no longer the known generic description;
- Layout Config values use valid email / entry ID / GA4 formats;
- GA4 loader uses the Measurement ID from Layout Config;
- Apply CTA carries the configured Apply Page path, `vi-tri`, and clean `job` URL;
- lifecycle-specific Apply and JobPosting behavior is correct;
- `#fusumi-jobposting-jsonld` contains the required JobPosting fields for open jobs;
- `directApply` remains `false` for the external Google Form flow;
- `baseSalary` is not fabricated;
- `validThrough`, when present, parses as a real date.

A machine-readable `live-runtime-report.json` artifact is uploaded on every run.

### Playwright browser cache

CI and `Live Smoke Test` pin the same Playwright version and cache `~/.cache/ms-playwright` with a key derived from runner OS + Playwright version + Chromium.

- system dependencies are still installed on every fresh runner;
- Chromium browser binaries are downloaded only on cache miss;
- changing the pinned Playwright version automatically rotates the cache key;
- cache failure never changes runtime verification semantics: a miss simply installs Chromium normally.

This avoids repeatedly downloading the large Chromium archive on routine runs while keeping browser/runtime behavior deterministic.

If Blogger or the Blogger feed returns HTTP 429, the affected rendered check is reported as **inconclusive** where possible rather than being treated as a false production regression. Real contract failures still fail the workflow.

Static source contracts remain covered by `scripts/check_runtime_contract.py` and the mocked Playwright suite on every PR, so production availability and source correctness are independent signals.
