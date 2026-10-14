#!/usr/bin/env python3
"""Validate the canonical Fusumi job-post authoring templates."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN_TEMPLATE = ROOT / "templates" / "mau-tin-tuyen-dung.md"
BLOGGER_HTML_TEMPLATE = ROOT / "templates" / "mau-tin-tuyen-dung-blogger.html"

REQUIRED_MARKERS = [
    "| Địa điểm |",
    "| Hình thức |",
    "| Thu nhập |",
    "| Số lượng |",
    "| Hạn ứng tuyển |",
    "## Mô tả công việc",
    "## Yêu cầu",
    "## Quyền lợi",
    "## Thời gian làm việc",
    "## Cách ứng tuyển",
    "PB: Kinh doanh",
    "ĐĐ: Hà Nội",
    "HT: Full-time",
]

HTML_REQUIRED_MARKERS = [
    "<th>Địa điểm</th>",
    "<th>Hình thức</th>",
    "<th>Thu nhập</th>",
    "<th>Số lượng</th>",
    "<th>Hạn ứng tuyển</th>",
    "<h2>Mô tả công việc</h2>",
    "<h2>Yêu cầu</h2>",
    "<h2>Quyền lợi</h2>",
    "<h2>Thời gian làm việc</h2>",
    "<h2>Cách ứng tuyển</h2>",
]

FORBIDDEN_PUBLISHED_PLACEHOLDERS = [
    "[EMAIL_TUYEN_DUNG]",
    "[SO_DIEN_THOAI]",
]


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def validate_markdown() -> None:
    if not MARKDOWN_TEMPLATE.exists():
        fail(f"missing template: {MARKDOWN_TEMPLATE.relative_to(ROOT)}")

    text = MARKDOWN_TEMPLATE.read_text(encoding="utf-8")

    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]
    if missing:
        fail("job template missing contract marker(s): " + ", ".join(missing))

    if "# [TÊN VỊ TRÍ]" not in text:
        fail("job template title placeholder must remain '# [TÊN VỊ TRÍ]'")

    if not re.search(r"Hạn ứng tuyển.*DD/MM/YYYY|DD/MM/YYYY.*Hạn ứng tuyển", text, re.I | re.S):
        fail("job template must document the DD/MM/YYYY deadline format")

    if "xóa hẳn hàng `Hạn ứng tuyển`" not in text:
        fail("job template must instruct authors to remove unknown deadlines")

    if "Tiêu đề Post chỉ là tên vị trí" not in text:
        fail("job template must keep location out of the Post title")

    for placeholder in FORBIDDEN_PUBLISHED_PLACEHOLDERS:
        if placeholder in text:
            fail(f"legacy contact placeholder found in job template: {placeholder}")


def validate_blogger_html() -> None:
    if not BLOGGER_HTML_TEMPLATE.exists():
        fail(f"missing template: {BLOGGER_HTML_TEMPLATE.relative_to(ROOT)}")

    text = BLOGGER_HTML_TEMPLATE.read_text(encoding="utf-8")
    lower = text.lower()

    missing = [marker for marker in HTML_REQUIRED_MARKERS if marker not in text]
    if missing:
        fail("Blogger HTML template missing contract marker(s): " + ", ".join(missing))

    if "<style" in lower or "<script" in lower:
        fail("Blogger HTML template must not contain style/script blocks")

    if re.search(r"href\s*=", text, re.I):
        fail("Blogger HTML template must not hard-code links or Apply CTA hrefs")

    if re.search(r"\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b", text):
        fail("Blogger HTML template must not contain a concrete/placeholder date that lifecycle can parse")

    if not re.search(r"Hạn ứng tuyển.*XÓA HẲN", text, re.I | re.S):
        fail("Blogger HTML template must tell authors to delete the deadline row when unknown")

    if "NHẬP SỐ LƯỢNG" not in text:
        fail("Blogger HTML template must keep a non-numeric quantity placeholder")

    for placeholder in FORBIDDEN_PUBLISHED_PLACEHOLDERS:
        if placeholder in text:
            fail(f"legacy contact placeholder found in Blogger HTML template: {placeholder}")


def main() -> None:
    validate_markdown()
    validate_blogger_html()

    print("Job template contract validation passed.")
    print("- Markdown authoring guide is present")
    print("- Blogger HTML copy/paste template is present")
    print("- canonical metadata labels match runtime parsers")
    print("- Blogger HTML contains no style/script or hard-coded CTA href")
    print("- unknown deadline/quantity placeholders cannot be parsed as real data")
    print("- legacy contact placeholders are absent")


if __name__ == "__main__":
    main()
