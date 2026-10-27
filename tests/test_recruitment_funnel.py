import csv
import tempfile
import unittest
from pathlib import Path
from scripts.report_recruitment_funnel import aggregate, normalize_url


class RecruitmentFunnelTests(unittest.TestCase):
    def test_canonical_url_drops_query_and_fragment(self):
        self.assertEqual(normalize_url("http://TUYENDUNG.FUSUMI.VN/a.html?utm_source=x#apply"),
                         "https://tuyendung.fusumi.vn/a.html")
        self.assertEqual(normalize_url("not-a-url"), "")

    def test_aggregate_distinguishes_clicks_and_submissions(self):
        with tempfile.TemporaryDirectory() as directory:
            events = Path(directory) / "events.csv"
            responses = Path(directory) / "responses.csv"
            with events.open("w", encoding="utf-8", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=["job_url", "event_name", "event_count"])
                writer.writeheader()
                writer.writerow({"job_url": "https://tuyendung.fusumi.vn/job.html", "event_name": "page_view", "event_count": 100})
                writer.writerow({"job_url": "https://tuyendung.fusumi.vn/job.html?utm_source=x", "event_name": "fusumi_apply_click", "event_count": 12})
            with responses.open("w", encoding="utf-8", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=["URL tin tuyển dụng", "Email"])
                writer.writeheader()
                for email in ("private1@example.com", "private2@example.com"):
                    writer.writerow({"URL tin tuyển dụng": "https://tuyendung.fusumi.vn/job.html", "Email": email})
            rows = aggregate(events, responses)
            self.assertEqual(rows, [{"job_url": "https://tuyendung.fusumi.vn/job.html", "page_views": 100,
                                     "apply_clicks": 12, "applications": 2, "click_through_rate": 0.12}])
            self.assertNotIn("Email", rows[0])


if __name__ == "__main__":
    unittest.main()
