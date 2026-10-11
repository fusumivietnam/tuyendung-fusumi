#!/usr/bin/env python3
"""Validate source-level contracts for Fusumi Blogger runtime assets.

These checks complement the live HTTP smoke test. They intentionally avoid
executing Blogger or browser JavaScript so CI can detect accidental removal of
critical selectors, apply-flow parameters, and JobPosting generation logic.
"""

from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "templates" / "fusumi-careers-runtime.html"
FOOTER = ROOT / "templates" / "footer-contact.html"
CSS = ROOT / "blogger" / "fusumi-careers-custom.css"
PAGES = {
    "about": ROOT / "templates" / "page-ve-fusumi.html",
    "process": ROOT / "templates" / "page-quy-trinh-tuyen-dung.html",
    "apply": ROOT / "templates" / "page-ung-tuyen.html",
}


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def read(path: Path) -> str:
    if not path.is_file():
        fail(f"Missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def require(name: str, text: str, markers: list[str]) -> None:
    missing = [marker for marker in markers if marker not in text]
    if missing:
        fail(f"{name} missing contract marker(s): {', '.join(missing)}")


def main() -> None:
    runtime = read(RUNTIME)
    footer = read(FOOTER)
    css = read(CSS)
    pages = {name: read(path) for name, path in PAGES.items()}

    require(
        "runtime",
        runtime,
        [
            "id=\"fusumi-careers-runtime\"",
            "fusumi-jobposting-jsonld",
            "'@type':'JobPosting'",
            "bloggerPostMeta",
            "sanitizeDescription",
            "datePosted",
            "employmentType",
            "jobLocation",
            "enhanceApplyLinks",
            "enhanceApplyPage",
            "url.searchParams.set('vi-tri',title)",
            "url.searchParams.set('job',canonical)",
            "mailto:hr@fusumi.vn",
        ],
    )

    if "<style" in runtime.lower():
        fail("runtime gadget must not contain CSS/style blocks")

    require(
        "footer",
        footer,
        [
            "fusumi-footer-contact",
            "hr@fusumi.vn",
            "/p/ve-fusumi.html",
            "/p/quy-trinh-tuyen-dung.html",
            "/p/ung-tuyen.html",
        ],
    )
    if "<script" in footer.lower() or "<style" in footer.lower():
        fail("footer gadget must contain HTML only (no script/style)")

    require(
        "custom CSS",
        css,
        [
            ":root{",
            "--brand:#282568",
            "#viec-lam",
            ".jobs",
            ".fusumi-footer-contact",
            ".fusumi-apply-page",
            "@media(max-width:620px)",
        ],
    )
    if "<style" in css.lower():
        fail("custom CSS file must contain CSS only")

    require("about page", pages["about"], ["fusumi-page", "Xem vị trí đang tuyển"])
    require("process page", pages["process"], ["fusumi-process", "Ứng tuyển ngay"])
    require(
        "apply page",
        pages["apply"],
        ["fusumi-apply-page", "data-apply-position", "data-apply-email", "Gửi CV qua email"],
    )

    # Guard against accidentally restoring theme-inline CSS/JS into Page templates.
    for name, text in pages.items():
        if re.search(r"<script\b", text, flags=re.I):
            fail(f"{name} Page template must not contain runtime JavaScript")
        if re.search(r"<style\b", text, flags=re.I):
            fail(f"{name} Page template must not contain CSS")

    print("Runtime contract validation passed.")
    print("- CSS is centralized in blogger/fusumi-careers-custom.css")
    print("- Footer is HTML-only")
    print("- Runtime owns apply flow + JobPosting JSON-LD")
    print("- Static Page templates expose expected runtime hooks")


if __name__ == "__main__":
    main()
