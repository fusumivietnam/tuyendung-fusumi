import unittest
from scripts.sync_recruitment_funnel import combine, sheet_counts


class PrivateSyncTests(unittest.TestCase):
    def test_combine_only_job_urls_and_aggregates(self):
        url = "https://tuyendung.fusumi.vn/2026/10/job.html"
        rows = combine([(url+"?utm=a", 100), ("https://evil.com/2026/10/other.html", 200)],
                       [(url, 7)], [(url, 3)])
        self.assertEqual(rows, [{"job_url": url, "page_views": 100, "apply_clicks": 7,
                                  "applications": 3, "click_through_rate": .07}])

    def test_sheet_rejects_pii_columns_and_requires_aggregate_header(self):
        class FakeResponse:
            def raise_for_status(self): pass
            def json(self): return {"values": [["Họ và tên", "Email"], ["A", "a@example.com"]]}
        class FakeSession:
            def get(self, *_args, **_kwargs): return FakeResponse()
        with self.assertRaises(ValueError):
            sheet_counts(FakeSession(), "sheet-id", "Summary!A:B")

    def test_sheet_aggregates_only_url_and_count(self):
        class FakeResponse:
            def raise_for_status(self): pass
            def json(self): return {"values": [["job_url", "applications"], ["https://tuyendung.fusumi.vn/2026/10/job.html", 2]]}
        class FakeSession:
            def get(self, *_args, **_kwargs): return FakeResponse()
        self.assertEqual(sheet_counts(FakeSession(), "sheet-id", "Summary!A:B")[0][1], 2)


if __name__ == "__main__":
    unittest.main()
