#!/usr/bin/env python3
"""Validate the Fusumi Blogger theme using only Python stdlib."""

from __future__ import annotations

from pathlib import Path
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
    if any(marker in text for marker in ("<<<<<<<", "=======", ">>>>>>>")):
        fail("Merge conflict marker found in theme")

    required_markers = [
        "b:defaultwidgetversion='2'",
        "b:layoutsVersion='3'",
        "b:responsive='true'",
        "xmlns:b='http://www.google.com/2005/gml/b'",
        "xmlns:data='http://www.google.com/2005/gml/data'",
        "xmlns:expr='http://www.google.com/2005/gml/expr'",
        "<b:skin>",
        "<b:template-skin>",
        "id='header'",
        "id='page_list_top'",
        "id='page_body'",
        "id='footer'",
        "id='jobSearch'",
        "id='departmentFilter'",
        "id='locationFilter'",
        "id='typeFilter'",
        "JobPosting",
        "PB:",
        "ĐĐ:",
        "HT:",
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

    required_sections = {"header", "page_list_top", "page_body", "footer"}
    missing_sections = sorted(required_sections.difference(section_ids))
    if missing_sections:
        fail("Missing required Blogger sections: " + ", ".join(missing_sections))

    required_widgets = {"Header1", "PageList1", "Blog1"}
    missing_widgets = sorted(required_widgets.difference(widget_ids))
    if missing_widgets:
        fail("Missing required native Blogger widgets: " + ", ".join(missing_widgets))

    blog_widgets = [node for node in root.iter(f"{{{B_NS}}}widget") if node.get("type") == "Blog"]
    if len(blog_widgets) != 1:
        fail(f"Expected exactly 1 native Blogger Blog widget, found {len(blog_widgets)}")

    widget_types = {node.get("type") for node in root.iter(f"{{{B_NS}}}widget")}
    for widget_type in ("Header", "PageList", "Blog"):
        if widget_type not in widget_types:
            fail(f"Missing native Blogger widget type: {widget_type}")

    print("Theme validation passed.")
    print("Architecture: Blogger Layout v3, Header + PageList + single Blog widget")
    print(f"Sections: {', '.join(section_ids)}")
    print(f"Widgets: {', '.join(widget_ids)}")


if __name__ == "__main__":
    main()
