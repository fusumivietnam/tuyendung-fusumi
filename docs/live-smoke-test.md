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
5. uses explicit 429 backoff before considering the deployment unavailable.

### Rendered browser probe

`scripts/check_live_runtime.mjs` launches Chromium against both current published jobs and validates the DOM after JavaScript execution:

- exactly one Careers Runtime marker;
- exactly one Analytics Runtime marker;
- exactly one Careers Config marker;
- canonical URL equals the clean job URL;
- meta description is present and no longer the known generic description;
- Layout Config values use valid email / entry ID / GA4 formats;
- GA4 loader uses the Measurement ID from Layout Config;
- Apply CTA carries the configured Apply Page path, `vi-tri`, and clean `job` URL;
- `#fusumi-jobposting-jsonld` is emitted and contains `JobPosting`, title, description, datePosted, hiringOrganization and clean URL;
- `directApply` remains `false` for the external Google Form flow;
- `baseSalary` is not fabricated;
- `validThrough`, when present, parses as a real date.

A machine-readable `live-runtime-report.json` artifact is uploaded on every run.

If Blogger or the Blogger feed returns HTTP 429, the affected rendered check is reported as **inconclusive** where possible rather than being treated as a false production regression. Real contract failures still fail the workflow.

Static source contracts remain covered by `scripts/check_runtime_contract.py` and the mocked Playwright suite on every PR, so production availability and source correctness are independent signals.
