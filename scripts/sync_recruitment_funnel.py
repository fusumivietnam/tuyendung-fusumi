#!/usr/bin/env python3
"""Pull aggregate GA4 and non-PII Google Sheet counts into an offline funnel dashboard.

Only job URL and aggregated counts are fetched. No respondent details or raw data are stored.
"""
import argparse
import csv
import json
import os
from collections import defaultdict
from pathlib import Path

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

from scripts.report_recruitment_funnel import normalize_url, render_dashboard


SCOPES = ["https://www.googleapis.com/auth/analytics.readonly",
          "https://www.googleapis.com/auth/spreadsheets.readonly"]


def google_session(credentials_json):
    info = json.loads(credentials_json)
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return AuthorizedSession(creds)


def ga4_report(session, property_id, dimension, event_name, start_date, end_date):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    payload = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "dimensions": [{"name": dimension}, {"name": "eventName"}],
        "metrics": [{"name": "eventCount"}],
        "dimensionFilter": {"filter": {"fieldName": "eventName",
                                       "stringFilter": {"value": event_name}}},
        "limit": 100000,
    }
    response = session.post(url, json=payload, timeout=45)
    response.raise_for_status()
    data = response.json()
    if int(data.get("rowCount", 0)) > len(data.get("rows", [])):
        raise ValueError("GA4 returned truncated rows; refusing incomplete dashboard")
    return [(row["dimensionValues"][0]["value"], int(row["metricValues"][0]["value"]))
            for row in data.get("rows", [])]


def sheet_counts(session, spreadsheet_id, sheet_range):
    from urllib.parse import quote
    path = quote(sheet_range, safe="")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{path}"
    response = session.get(url, params={"valueRenderOption": "UNFORMATTED_VALUE"}, timeout=45)
    response.raise_for_status()
    values = response.json().get("values", [])
    if not values or [str(x).strip().lower() for x in values[0][:2]] != ["job_url", "applications"]:
        raise ValueError("Summary sheet must have headers job_url,applications and NO applicant PII")
    result = []
    for row in values[1:]:
        if len(row) < 2:
            continue
        count = row[1]
        if isinstance(count, bool) or not str(count).isdigit():
            raise ValueError("applications must be a nonnegative integer")
        result.append((str(row[0]), int(count)))
    return result


def combine(page_views, apply_clicks, applications):
    metrics = defaultdict(lambda: {"page_views": 0, "apply_clicks": 0, "applications": 0})
    for key, entries in (("page_views", page_views), ("apply_clicks", apply_clicks),
                         ("applications", applications)):
        for raw_url, count in entries:
            url = normalize_url(raw_url)
            from urllib.parse import urlsplit
            path = urlsplit(url).path
            if not (path.endswith(".html") and len(path.split("/")) >= 4 and
                    path.split("/")[1].isdigit() and len(path.split("/")[1]) == 4 and
                    path.split("/")[2].isdigit() and len(path.split("/")[2]) == 2):
                continue
            if count < 0:
                raise ValueError("Negative event/application counts are not permitted")
            metrics[url][key] += count
    return [
        dict(job_url=url, **metrics[url],
             click_through_rate=(round(metrics[url]["apply_clicks"]/metrics[url]["page_views"], 4)
                                 if metrics[url]["page_views"] else ""))
        for url in sorted(metrics)
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-date", required=True, help="GA4 start date YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="GA4 end date YYYY-MM-DD")
    parser.add_argument("--output-dir", default="funnel-output")
    args = parser.parse_args()
    credentials = os.environ["FUSUMI_GOOGLE_SERVICE_ACCOUNT_JSON"]
    property_id = os.environ["FUSUMI_GA4_PROPERTY_ID"]
    spreadsheet_id = os.environ["FUSUMI_FUNNEL_SHEET_ID"]
    sheet_range = os.environ.get("FUSUMI_FUNNEL_SHEET_RANGE", "Summary!A:B")
    session = google_session(credentials)
    views = ga4_report(session, property_id, "pageLocation", "page_view",
                       args.start_date, args.end_date)
    # This GA4 event-scoped custom dimension MUST be registered and populated.
    clicks = ga4_report(session, property_id, "customEvent:job_url", "fusumi_apply_click",
                        args.start_date, args.end_date)
    responses = sheet_counts(session, spreadsheet_id, sheet_range)
    rows = combine(views, clicks, responses)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    with (output / "funnel-summary.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle,
                                fieldnames=["job_url", "page_views", "apply_clicks",
                                            "applications", "click_through_rate"])
        writer.writeheader()
        writer.writerows(rows)
    (output / "funnel-dashboard.html").write_text(render_dashboard(rows), encoding="utf-8")
    print(f"Produced {len(rows)} aggregated jobs; no respondent records exported.")


if __name__ == "__main__":
    main()
