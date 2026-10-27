#!/usr/bin/env python3
"""Aggregate recruitment funnel exports without processing applicant PII."""
import argparse
import csv
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


def normalize_url(value):
    value = (value or "").strip()
    if not value:
        return ""
    parts = urlsplit(value)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return ""
    return urlunsplit(("https", parts.netloc.lower(), parts.path.rstrip("/") or "/", "", ""))


def read_csv(path):
    with Path(path).open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def number(value):
    try:
        result = int(str(value or "").replace(",", "").strip())
        return max(0, result)
    except ValueError:
        raise ValueError(f"Invalid count: {value!r}") from None


def aggregate(events_path, responses_path):
    metrics = defaultdict(lambda: {"job_url": "", "page_views": 0, "apply_clicks": 0, "applications": 0})
    for row in read_csv(events_path):
        url = normalize_url(row.get("job_url", ""))
        if not url:
            continue
        item = metrics[url]
        item["job_url"] = url
        event = (row.get("event_name") or "").strip()
        count = number(row.get("event_count") or "0")
        if event == "page_view":
            item["page_views"] += count
        elif event == "fusumi_apply_click":
            item["apply_clicks"] += count
    for row in read_csv(responses_path):
        url = normalize_url(row.get("URL tin tuyển dụng") or row.get("job_url") or "")
        if not url:
            continue
        item = metrics[url]
        item["job_url"] = url
        item["applications"] += 1
    return [dict(metrics[url], click_through_rate=(round(metrics[url]["apply_clicks"] / metrics[url]["page_views"], 4) if metrics[url]["page_views"] else "")) for url in sorted(metrics)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--events", required=True, help="GA4 aggregated export CSV: job_url,event_name,event_count")
    parser.add_argument("--responses", required=True, help="Google Forms CSV containing URL tin tuyển dụng")
    parser.add_argument("--output", required=True, help="Aggregated report CSV (no applicant personal data)")
    args = parser.parse_args()
    rows = aggregate(args.events, args.responses)
    with Path(args.output).open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["job_url", "page_views", "apply_clicks", "applications", "click_through_rate"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} job-level summary rows in {args.output}")


if __name__ == "__main__":
    main()
