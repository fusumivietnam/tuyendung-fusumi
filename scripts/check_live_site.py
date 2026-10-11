#!/usr/bin/env python3
"""Smoke-test the deployed Fusumi Blogger site using Python stdlib only."""

from __future__ import annotations

from html.parser import HTMLParser
import argparse
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen

DEFAULT_SITE = "https://tuyendung.fusumi.vn/"
USER_AGENT = "FusumiCareersSmokeTest/2.0 (+https://github.com/fusumivietnam/tuyendung-fusumi)"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.job_count = 0
        self.links: list[str] = []
        self.ids: set[str] = set()
        self.canonical: str | None = None
        self.meta_description: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = dict(attrs)
        classes = (data.get("class") or "").split()
        element_id = data.get("id")
        if element_id:
            self.ids.add(element_id)
        if "job" in classes:
            self.job_count += 1
        if tag == "a" and data.get("href"):
            self.links.append(data["href"] or "")
        if tag == "link" and (data.get("rel") or "").lower() == "canonical" and data.get("href"):
            self.canonical = data["href"]
        if tag == "meta" and (data.get("name") or "").lower() == "description":
            self.meta_description = data.get("content") or ""


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def fetch(url: str, retries: int = 3) -> str:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            request = Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml",
                    "Cache-Control": "no-cache",
                },
            )
            with urlopen(request, timeout=25) as response:
                status = getattr(response, "status", 200)
                if status != 200:
                    fail(f"{url} returned HTTP {status}")
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type:
                    fail(f"{url} returned unexpected content type: {content_type}")
                return response.read().decode("utf-8", errors="replace")
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(attempt * 2)
    fail(f"Cannot fetch {url}: {last_error}")


def assert_contains(name: str, html: str, markers: list[str]) -> None:
    missing = [marker for marker in markers if marker not in html]
    if missing:
        fail(f"{name} missing expected content: {', '.join(missing)}")


def parse(html: str) -> PageParser:
    parser = PageParser()
    parser.feed(html)
    return parser


def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def assert_canonical(name: str, url: str, html: str) -> None:
    parsed = parse(html)
    if not parsed.canonical:
        fail(f"{name} is missing canonical link")
    if normalize_url(parsed.canonical) != normalize_url(url):
        fail(f"{name} canonical mismatch: expected {url}, got {parsed.canonical}")
    print(f"OK canonical {name}: {parsed.canonical}")


def discover_post(base_url: str, html_pages: list[str]) -> str | None:
    host = urlparse(base_url).netloc
    pattern = re.compile(r"/\d{4}/\d{2}/[^?#]+\.html(?:[?#].*)?$")
    for html in html_pages:
        for href in parse(html).links:
            absolute = urljoin(base_url, href)
            parsed = urlparse(absolute)
            if parsed.netloc == host and pattern.search(parsed.path):
                return absolute.split("#", 1)[0].split("?", 1)[0]
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default=DEFAULT_SITE)
    parser.add_argument("--min-jobs", type=int, default=1)
    args = parser.parse_args()

    base = args.site.rstrip("/") + "/"
    pages = {
        "homepage": base,
        "search": urljoin(base, "search"),
        "about": urljoin(base, "p/ve-fusumi.html"),
        "process": urljoin(base, "p/quy-trinh-tuyen-dung.html"),
        "apply": urljoin(base, "p/ung-tuyen.html"),
    }

    html: dict[str, str] = {}
    for name, url in pages.items():
        html[name] = fetch(url)
        if len(html[name].strip()) < 500:
            fail(f"{name} looks unexpectedly empty ({len(html[name])} bytes)")
        print(f"OK {name}: {url} ({len(html[name])} bytes)")

    assert_contains(
        "homepage",
        html["homepage"],
        ["Fusumi Careers", "Vị trí đang tuyển", "jobSearch", "departmentFilter", "locationFilter", "typeFilter"],
    )
    assert_contains("search", html["search"], ["Vị trí đang tuyển"])
    assert_contains("about", html["about"], ["Fusumi", "Xem vị trí đang tuyển"])
    assert_contains("process", html["process"], ["Quy trình", "Ứng tuyển ngay"])
    assert_contains("apply", html["apply"], ["Ứng tuyển", "Gửi CV qua email"])

    # Public pages should preserve canonical URLs.
    assert_canonical("homepage", pages["homepage"], html["homepage"])
    assert_canonical("about", pages["about"], html["about"])
    assert_canonical("process", pages["process"], html["process"])
    assert_canonical("apply", pages["apply"], html["apply"])

    home_parser = parse(html["homepage"])
    search_parser = parse(html["search"])
    home_jobs = home_parser.job_count
    search_jobs = search_parser.job_count
    if max(home_jobs, search_jobs) < args.min_jobs:
        fail(
            f"No sufficient job cards detected: homepage={home_jobs}, search={search_jobs}, "
            f"required>={args.min_jobs}"
        )
    print(f"OK job cards: homepage={home_jobs}, search={search_jobs}")

    # Runtime gadget is rendered server-side as source HTML even though its JS runs client-side.
    if "fusumi-careers-runtime" not in html["homepage"]:
        fail("homepage is missing Fusumi Careers Runtime gadget marker")
    print("OK runtime gadget marker on homepage")

    post_url = discover_post(base, [html["homepage"], html["search"]])
    if not post_url:
        fail("Could not discover a published job Post URL from homepage/search")

    post_html = fetch(post_url)
    post_parser = parse(post_html)
    assert_contains("job post", post_html, ["Ứng tuyển vị trí này", "JobPosting"])
    if "fusumi-careers-runtime" not in post_html:
        fail("job post is missing Fusumi Careers Runtime gadget marker")
    assert_canonical("job post", post_url, post_html)
    print(f"OK job post: {post_url}")

    # Verify the apply Page remains reachable with the exact query shape emitted by runtime.
    apply_query = urlencode({"vi-tri": "Smoke Test", "job": post_url})
    apply_url = pages["apply"] + "?" + apply_query
    apply_html = fetch(apply_url)
    assert_contains("apply flow", apply_html, ["Gửi CV qua email", "data-apply-position", "data-apply-email"])
    print(f"OK apply flow route: {apply_url}")

    # Runtime JSON-LD is injected client-side, so stdlib HTTP cannot execute it. We still require
    # the static JobPosting marker and runtime source marker above; browser-level execution is
    # covered manually until a headless-browser job is introduced.
    print("Live smoke test passed.")


if __name__ == "__main__":
    main()
