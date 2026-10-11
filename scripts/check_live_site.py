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
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 FusumiCareersSmokeTest/2.2"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.job_count = 0
        self.links: list[str] = []
        self.ids: set[str] = set()
        self.canonical: str | None = None

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


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def fetch(url: str, retries: int = 5) -> str:
    """Fetch one public page with conservative Blogger 429 backoff."""
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            request = Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "vi,en;q=0.8",
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
        except HTTPError as exc:
            last_error = exc
            if exc.code == 429 and attempt < retries:
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                try:
                    wait = int(retry_after) if retry_after else min(5 * (2 ** (attempt - 1)), 30)
                except ValueError:
                    wait = min(5 * (2 ** (attempt - 1)), 30)
                print(f"WARN Blogger rate-limited {url}; retrying in {wait}s (attempt {attempt}/{retries})")
                time.sleep(wait)
                continue
            if attempt < retries:
                time.sleep(min(attempt * 3, 10))
        except (URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(min(attempt * 3, 10))
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


def discover_post(base_url: str, html: str) -> str | None:
    host = urlparse(base_url).netloc
    pattern = re.compile(r"/\d{4}/\d{2}/[^?#]+\.html$")
    for href in parse(html).links:
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.netloc == host and pattern.search(parsed.path):
            return absolute.split("#", 1)[0].split("?", 1)[0]
    return None


def assert_home_links(base: str, html: str) -> None:
    links = {normalize_url(urljoin(base, href)) for href in parse(html).links}
    required = {
        normalize_url(urljoin(base, "p/ve-fusumi.html")),
        normalize_url(urljoin(base, "p/quy-trinh-tuyen-dung.html")),
        normalize_url(urljoin(base, "p/ung-tuyen.html")),
    }
    missing = sorted(required - links)
    if missing:
        fail(f"homepage is missing required Page link(s): {', '.join(missing)}")
    print("OK homepage Page links: Về Fusumi, Quy trình tuyển dụng, Ứng tuyển")


def assert_home_ids(html: str) -> PageParser:
    parsed = parse(html)
    required = {"viec-lam", "jobSearch", "departmentFilter", "locationFilter", "typeFilter"}
    missing = sorted(required - parsed.ids)
    if missing:
        fail(f"homepage is missing required element ID(s): {', '.join(missing)}")
    print("OK homepage selectors: #viec-lam + search/filter controls")
    return parsed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default=DEFAULT_SITE)
    parser.add_argument("--min-jobs", type=int, default=1)
    parser.add_argument("--pace", type=float, default=4.0, help="seconds between successful public requests")
    args = parser.parse_args()

    base = args.site.rstrip("/") + "/"

    homepage = fetch(base)
    if len(homepage.strip()) < 500:
        fail(f"homepage looks unexpectedly empty ({len(homepage)} bytes)")
    print(f"OK homepage: {base} ({len(homepage)} bytes)")

    home = assert_home_ids(homepage)
    assert_canonical("homepage", base, homepage)
    assert_home_links(base, homepage)

    if home.job_count < args.min_jobs:
        fail(f"Insufficient job cards on homepage: {home.job_count}, required>={args.min_jobs}")
    print(f"OK job cards: homepage={home.job_count}")

    if "fusumi-careers-runtime" not in homepage:
        fail("homepage is missing Fusumi Careers Runtime gadget marker")
    print("OK runtime gadget marker on homepage")

    post_url = discover_post(base, homepage)
    if not post_url:
        fail("Could not discover a published job Post URL from homepage")

    time.sleep(args.pace)

    post_html = fetch(post_url)
    assert_contains("job post", post_html, ["Ứng tuyển vị trí này", "JobPosting"])
    if "fusumi-careers-runtime" not in post_html:
        fail("job post is missing Fusumi Careers Runtime gadget marker")
    assert_canonical("job post", post_url, post_html)
    print(f"OK job post: {post_url}")

    time.sleep(args.pace)

    apply_base = urljoin(base, "p/ung-tuyen.html")
    apply_query = urlencode({"vi-tri": "Smoke Test", "job": post_url})
    apply_url = apply_base + "?" + apply_query
    apply_html = fetch(apply_url)
    assert_contains("apply flow", apply_html, ["Gửi CV qua email", "data-apply-position", "data-apply-email"])
    assert_canonical("apply page", apply_base, apply_html)
    print(f"OK apply flow route: {apply_url}")

    print("Live smoke test passed.")


if __name__ == "__main__":
    main()
