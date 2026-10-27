#!/usr/bin/env python3
"""Aggregate recruitment funnel exports without processing applicant PII."""
import argparse
import csv
from html import escape
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



def render_dashboard(rows):
    """Produce standalone offline HTML without external JS or network requests."""
    views = sum(row["page_views"] for row in rows)
    clicks = sum(row["apply_clicks"] for row in rows)
    applications = sum(row["applications"] for row in rows)
    rate = f"{clicks / views:.1%}" if views else "—"
    table_rows = []
    for row in sorted(rows, key=lambda x: (-x["applications"], -x["page_views"], x["job_url"])):
        url = escape(row["job_url"], quote=True)
        name = escape(urlsplit(row["job_url"]).path.rstrip("/").split("/")[-1] or "Trang chủ")
        ctr = f'{row["click_through_rate"]:.1%}' if row["click_through_rate"] != "" else "—"
        table_rows.append(f'<tr><td><a href="{url}" rel="noopener noreferrer">{name}</a></td>'
                          f'<td>{row["page_views"]:,}</td><td>{row["apply_clicks"]:,}</td>'
                          f'<td>{row["applications"]:,}</td><td>{ctr}</td></tr>')
    body = "\\n".join(table_rows) or '<tr><td colspan="5">Chưa có dữ liệu tổng hợp.</td></tr>'
    return f"""<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'">
<title>Fusumi — Báo cáo hiệu quả tuyển dụng</title>
<style>body{{font:16px system-ui,sans-serif;color:#172033;background:#f7f7fc;max-width:1100px;margin:36px auto;padding:0 16px}}h1{{color:#282568}}.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px}}.kpi{{background:white;padding:20px;border-radius:12px;border:1px solid #ddd}}.kpi strong{{display:block;font-size:1.7rem;color:#282568}}table{{width:100%;border-collapse:collapse;background:white}}th,td{{padding:12px;border-bottom:1px solid #ddd;text-align:left}}.scroll{{overflow-x:auto}}a{{color:#282568;overflow-wrap:anywhere}}small{{color:#555}}th{{background:#eae9f6}}</style></head>
<body><h1>Fusumi — Hiệu quả tuyển dụng</h1><p>Báo cáo từ dữ liệu tổng hợp; không có thông tin cá nhân ứng viên.</p>
<div class="kpis"><div class="kpi">Lượt xem<strong>{views:,}</strong></div><div class="kpi">Lượt nhấp ứng tuyển<strong>{clicks:,}</strong></div><div class="kpi">Hồ sơ Form<strong>{applications:,}</strong></div><div class="kpi">Tỷ lệ click / xem<strong>{rate}</strong></div></div>
<h2>Theo vị trí</h2><div class="scroll"><table><thead><tr><th>Tin tuyển dụng</th><th>Lượt xem</th><th>Nhấp ứng tuyển</th><th>Hồ sơ Form</th><th>CTR</th></tr></thead><tbody>{body}</tbody></table></div>
<p><small>Nhấp ứng tuyển không đồng nghĩa hồ sơ thực nhận. Hồ sơ tính theo số phản hồi Form; không khử trùng lặp, không tính hồ sơ qua email. Chỉ đối chiếu dữ liệu cùng kỳ.</small></p></body></html>"""

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--events", required=True, help="GA4 aggregated export CSV: job_url,event_name,event_count")
    parser.add_argument("--responses", required=True, help="Google Forms CSV containing URL tin tuyển dụng")
    parser.add_argument("--output", required=True, help="Aggregated report CSV (no applicant personal data)")
    parser.add_argument("--html-output", help="Optional standalone offline HTML dashboard")
    args = parser.parse_args()
    rows = aggregate(args.events, args.responses)
    with Path(args.output).open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["job_url", "page_views", "apply_clicks", "applications", "click_through_rate"])
        writer.writeheader()
        writer.writerows(rows)
    if args.html_output:
        Path(args.html_output).write_text(render_dashboard(rows), encoding="utf-8")
    print(f"Generated {len(rows)} job-level summary rows in {args.output}")


if __name__ == "__main__":
    main()
