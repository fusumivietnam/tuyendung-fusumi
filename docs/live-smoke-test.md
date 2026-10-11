# Live smoke test

`Live Smoke Test` checks the public Blogger deployment without modifying Blogger.

## Triggers

- after updates land on `main`;
- manual `workflow_dispatch`;
- daily at 08:00 Asia/Ho_Chi_Minh.

## Strategy

Blogger can rate-limit GitHub-hosted runners (HTTP 429), so the live test intentionally keeps request volume low:

1. fetch homepage and validate core UI markers, Page links, job cards, canonical URL, and runtime gadget marker;
2. discover one published job from homepage and fetch it after a short pacing delay;
3. validate job canonical, apply CTA, JobPosting marker, and runtime marker;
4. fetch the Apply Page with the same `vi-tri` + `job` query shape emitted by the runtime;
5. use explicit 429 backoff before considering the deployment unavailable.

Static source contracts are checked separately by `scripts/check_runtime_contract.py`, so Page templates, CSS centralization, Footer separation, apply-flow JavaScript and JobPosting generation logic are still verified on every PR without repeatedly hitting Blogger.

The stdlib live probe does not execute client-side JavaScript. Runtime JSON-LD execution is therefore verified separately in a browser/Rich Results test when needed.
