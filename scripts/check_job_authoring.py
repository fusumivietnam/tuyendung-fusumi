#!/usr/bin/env python3
"""Pre-publish QA for a Fusumi Blogger job post.

Usage:
  python scripts/check_job_authoring.py \
    --title "Kế toán nội bộ" \
    --labels "PB: Kế toán" "ĐĐ: Hà Nội" "HT: Full-time" \
    --html-file draft.html

Exit code 0 means the draft satisfies the authoring contract. Exit code 1 prints
all detected issues so an editor can fix them before publishing.
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

REQUIRED_METADATA = ("Địa điểm", "Hình thức", "Số lượng")
OPTIONAL_METADATA = ("Thu nhập", "Hạn ứng tuyển")
REQUIRED_LABEL_PREFIXES = ("PB:", "ĐĐ:", "HT:")
DATE_PATTERNS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


class JobHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.rows: list[list[str]] = []
        self.current_row: list[str] | None = None
        self.current_cell: list[str] | None = None
        self.anchors: list[dict[str, str]] = []
        self.current_anchor: dict[str, str] | None = None
        self.forbidden_tags: list[str] = []
        self.text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        self.stack.append(tag)
        if tag in {"style", "script"}:
            self.forbidden_tags.append(tag)
        if tag == "tr":
            self.current_row = []
        elif tag in {"th", "td"} and self.current_row is not None:
            self.current_cell = []
        elif tag == "a":
            values = {key.lower(): value or "" for key, value in attrs}
            self.current_anchor = {"href": values.get("href", ""), "text": ""}

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"th", "td"} and self.current_cell is not None and self.current_row is not None:
            self.current_row.append(normalize("".join(self.current_cell)))
            self.current_cell = None
        elif tag == "tr" and self.current_row is not None:
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = None
        elif tag == "a" and self.current_anchor is not None:
            self.current_anchor["text"] = normalize(self.current_anchor["text"])
            self.anchors.append(self.current_anchor)
            self.current_anchor = None
        if self.stack:
            for index in range(len(self.stack) - 1, -1, -1):
                if self.stack[index] == tag:
                    del self.stack[index:]
                    break

    def handle_data(self, data: str) -> None:
        self.text_parts.append(data)
        if self.current_cell is not None:
            self.current_cell.append(data)
        if self.current_anchor is not None:
            self.current_anchor["text"] += data


def parse_metadata(parser: JobHTMLParser) -> dict[str, str]:
    result: dict[str, str] = {}
    known = set(REQUIRED_METADATA + OPTIONAL_METADATA)
    for row in parser.rows:
        if len(row) < 2:
            continue
        key = normalize(row[0]).rstrip(":")
        if key in known:
            result[key] = normalize(row[1])
    return result


def valid_date(value: str) -> bool:
    for pattern in DATE_PATTERNS:
        try:
            datetime.strptime(value, pattern)
            return True
        except ValueError:
            pass
    return False


def inspect(title: str, labels: list[str], html: str) -> list[str]:
    issues: list[str] = []
    title = normalize(title)
    labels = [normalize(label) for label in labels if normalize(label)]

    if not title:
        issues.append("Title đang trống.")

    parser = JobHTMLParser()
    try:
        parser.feed(html)
    except Exception as error:  # pragma: no cover - HTMLParser is deliberately tolerant
        issues.append(f"HTML không đọc được: {error}")
        return issues

    metadata = parse_metadata(parser)

    if any(re.match(r"^NHẬP\b", normalize(part), re.IGNORECASE) for part in parser.text_parts if normalize(part)):
        issues.append("Body vẫn còn placeholder bắt đầu bằng 'NHẬP'.")

    if parser.forbidden_tags:
        tags = ", ".join(sorted(set(parser.forbidden_tags)))
        issues.append(f"Body không được chứa thẻ kỹ thuật: {tags}.")

    for field in REQUIRED_METADATA:
        if not metadata.get(field):
            issues.append(f"Thiếu metadata bắt buộc: {field}.")

    quantity = metadata.get("Số lượng", "")
    if quantity:
        match = re.match(r"^(\d+)\b", quantity)
        if not match or int(match.group(1)) <= 0:
            issues.append("Số lượng phải bắt đầu bằng một số nguyên dương, ví dụ '1' hoặc '02 nhân sự'.")

    deadline = metadata.get("Hạn ứng tuyển", "")
    if deadline and not valid_date(deadline):
        issues.append("Hạn ứng tuyển phải là ngày thật theo YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY hoặc DD.MM.YYYY; nếu chưa có thì xóa hẳn hàng này.")

    location = metadata.get("Địa điểm", "")
    title_lower = title.casefold()
    location_lower = location.casefold()
    if location and location_lower in title_lower:
        issues.append("Title không được chứa địa điểm; chỉ dùng tên vị trí.")
    if re.search(r"\s[-–—]\s*(khu vực|hà nội|hồ chí minh|tp\.?\s*hcm|miền\s+(bắc|trung|nam))\b", title, re.IGNORECASE):
        issues.append("Title có vẻ đang gắn khu vực/địa điểm; chỉ dùng tên vị trí.")

    for prefix in REQUIRED_LABEL_PREFIXES:
        matches = [label for label in labels if label.startswith(prefix) and normalize(label[len(prefix):])]
        if len(matches) == 0:
            issues.append(f"Thiếu label bắt buộc {prefix} ...")
        elif len(matches) > 1:
            issues.append(f"Chỉ nên có một label nhóm {prefix}; hiện có {len(matches)}.")

    for anchor in parser.anchors:
        href = normalize(anchor.get("href", ""))
        text = normalize(anchor.get("text", ""))
        if "/p/ung-tuyen" in href or re.search(r"ứng tuyển", text, re.IGNORECASE):
            issues.append("Không chèn CTA/link Ứng tuyển trong body; Theme/Runtime sẽ cung cấp CTA chuẩn.")
            break

    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Kiểm tra draft tuyển dụng Fusumi trước khi Publish trên Blogger.")
    parser.add_argument("--title", required=True, help="Title của Blogger Post")
    parser.add_argument("--labels", nargs="+", required=True, help="Danh sách labels, ví dụ 'PB: Kế toán' 'ĐĐ: Hà Nội' 'HT: Full-time'")
    parser.add_argument("--html-file", type=Path, required=True, help="File chứa body HTML của draft")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.html_file.exists():
        print(f"ERROR: không tìm thấy file {args.html_file}", file=sys.stderr)
        return 1

    html = args.html_file.read_text(encoding="utf-8")
    issues = inspect(args.title, args.labels, html)
    if issues:
        print("Job authoring QA failed:")
        for issue in issues:
            print(f"- {issue}")
        return 1

    print("Job authoring QA passed.")
    print("- metadata contract is valid")
    print("- title/location contract is valid")
    print("- required label groups are present")
    print("- no unresolved placeholders or embedded technical code")
    print("- no body-level Apply CTA detected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
