#!/usr/bin/env python3
"""Validate the Fusumi Blogger theme using only Python stdlib."""

from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

THEME = Path("blogger/fusumi-careers-theme.xml")
B_NS = "http://www.google.com/2005/gml/b"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def unique_ids(root: ET.Element, tag: str) -> list[str]:
    values = [node.get("id") for node in root.iter(f"{{{B_NS}}}{tag}") if node.get("id")]
    duplicates = sorted({value for value in values if values.count(value) > 1})
    if duplicates:
        fail(f"Duplicate b:{tag} ids: {', '.join(duplicates)}")
    return values


def main() -> None:
    if not THEME.exists():
        fail(f"Missing {THEME}")

    text = THEME.read_text(encoding="utf-8")

    conflict_markers = ("<<<<<<<", "=======", ">>>>>>>")
    if any(marker in text for marker in conflict_markers):
        fail("Merge conflict marker found in theme")

    required_markers = [
        "xmlns:b='http://www.google.com/2005/gml/b'",
        "xmlns:data='http://www.google.com/2005/gml/data'",
        "xmlns:expr='http://www.google.com/2005/gml/expr'",
        "<b:skin>",
        "JobPosting",
        "PB:",
        "ĐĐ:",
        "HT:",
        "id='header-logo'",
        "id='header-menu'",
        "id='home-jobs'",
        "id='job-detail'",
        "id='page-archive'",
        "id='jobSearch'",
        "id='departmentFilter'",
        "id='locationFilter'",
        "id='typeFilter'",
        "Ứng tuyển vị trí này",
    ]
    missing = [marker for marker in required_markers if marker not in text]
    if missing:
        fail("Missing required theme markers: " + ", ".join(missing))

    try:
        root = ET.parse(THEME).getroot()
    except ET.ParseError as exc:
        fail(f"Invalid XML: {exc}")

    section_ids = unique_ids(root, "section")
    widget_ids = unique_ids(root, "widget")

    required_sections = {"header-logo", "header-menu", "home-jobs", "job-detail", "page-archive"}
    missing_sections = sorted(required_sections.difference(section_ids))
    if missing_sections:
        fail("Missing required Blogger sections: " + ", ".join(missing_sections))

    required_widgets = {"Image1", "LinkList1", "Blog1", "Blog2", "Blog3"}
    missing_widgets = sorted(required_widgets.difference(widget_ids))
    if missing_widgets:
        fail("Missing required Blogger widgets: " + ", ".join(missing_widgets))

    blog_widgets = [
        node for node in root.iter(f"{{{B_NS}}}widget") if node.get("type") == "Blog"
    ]
    if len(blog_widgets) != 3:
        fail(f"Expected exactly 3 Blogger Blog widgets, found {len(blog_widgets)}")

    image_widgets = [
        node for node in root.iter(f"{{{B_NS}}}widget") if node.get("type") == "Image"
    ]
    link_list_widgets = [
        node for node in root.iter(f"{{{B_NS}}}widget") if node.get("type") == "LinkList"
    ]
    if not image_widgets:
        fail("Expected at least one Blogger Image widget for header branding")
    if not link_list_widgets:
        fail("Expected at least one Blogger LinkList widget for header navigation")

    print("Theme validation passed.")
    print(f"Sections: {', '.join(section_ids)}")
    print(f"Widgets: {', '.join(widget_ids)}")


if __name__ == "__main__":
    main()
