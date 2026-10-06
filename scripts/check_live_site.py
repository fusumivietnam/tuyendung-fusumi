#!/usr/bin/env python3
"""Smoke-test the deployed Fusumi Blogger site using Python stdlib only."""

from __future__ import annotations

from html.parser import HTMLParser
import argparse
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

DEFAULT_SITE = "https://tuyendung.fusumi.vn/"
USER_AGENT = "FusumiCareersSmokeTest/1.0 (+https://github.com/fusumivietnam/tuyendung-fusumi)"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.job_count = 0
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = dict(attrs)
        classes = (data.get("class") or "").split()
        if "job" in classes:
            self.job_count += 1
        if tag == "a" and data.get("href"):
            self.links.append(data["href"] or "")


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def fetch(url: str, retries: int = 3) -> str:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
            with urlopen(request, timeout=20) as response:
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


def discover_post(base_url: str, html_pages: list[str]) -> str | None:
    host = urlparse(base_url).netloc
    pattern = re.compile(r"/\d{4}/\d{2}/[^?#]+\.html(?:[?#].*)?$")
    for html in html_pages:
        for href in parse(html).links:
            absolute = urljoin(base_url, href)
            parsed = urlparse(absolute)
            if parsed.netloc == host and pattern.search(parsed.path):
                return absolute.split("#", 1)[0]
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

    assert_contains("homepage", html["homepage"], ["Fusumi Careers", "Vị trí đang tuyển"])
    assert_contains("search", html["search"], ["Vị trí đang tuyển"])
    assert_contains("about", html["about"], ["Fusumi"])
    assert_contains("process", html["process"], ["Quy trình"])
    assert_contains("apply", html["apply"], ["Ứng tuyển"])

    home_jobs = parse(html["homepage"]).job_count
    search_jobs = parse(html["search"]).job_count
    if max(home_jobs, search_jobs) < args.min_jobs:
        fail(
            f"No sufficient job cards detected: homepage={home_jobs}, search={search_jobs}, "
            f"required>={args.min_jobs}"
        )
    print(f"OK job cards: homepage={home_jobs}, search={search_jobs}")

    post_url = discover_post(base, [html["homepage"], html["search"]])
    if not post_url:
        fail("Could not discover a published job Post URL from homepage/search")

    post_html = fetch(post_url)
    assert_contains("job post", post_html, ["Ứng tuyển vị trí này"])
    if "JobPosting" not in post_html and "schema.org/JobPosting" not in post_html:
        fail("Published job Post is missing JobPosting schema marker")
    print(f"OK job post: {post_url}")
    print("Live smoke test passed.")


if __name__ == "__main__":
    main()
