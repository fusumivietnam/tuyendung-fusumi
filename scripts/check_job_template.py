#!/usr/bin/env python3
"""Validate the canonical Fusumi job-post template contract."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "templates" / "mau-tin-tuyen-dung.md"

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

FORBIDDEN_PUBLISHED_PLACEHOLDERS = [
    "[EMAIL_TUYEN_DUNG]",
    "[SO_DIEN_THOAI]",
]


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> None:
    if not TEMPLATE.exists():
        fail(f"missing template: {TEMPLATE.relative_to(ROOT)}")

    text = TEMPLATE.read_text(encoding="utf-8")

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

    print("Job template contract validation passed.")
    print("- canonical metadata table is present")
    print("- required label prefixes are documented")
    print("- deadline lifecycle rules are documented")
    print("- legacy contact placeholders are absent")


if __name__ == "__main__":
    main()
