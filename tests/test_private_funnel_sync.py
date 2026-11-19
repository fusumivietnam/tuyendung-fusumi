import unittest
from datetime import datetime
from zoneinfo import ZoneInfo

from scripts.sync_recruitment_funnel import combine, reporting_window, sheet_counts, required_config


class FakeSession:
    def __init__(self, values):
        self.values = values

    def get(self, *_args, **_kwargs):
        values = self.values

        class FakeResponse:
            def raise_for_status(self):
                pass

            def json(self):
                return {"values": values}
        return FakeResponse()


class PrivateSyncTests(unittest.TestCase):
    def test_combine_only_job_urls_and_aggregates(self):
        url = "https://tuyendung.fusumi.vn/2026/10/job.html"
        rows = combine([(url+"?utm=a", 100), ("https://evil.com/2026/10/other.html", 200)],
                       [(url, 7)], [(url, 3)])
        self.assertEqual(rows, [{"job_url": url, "page_views": 100, "apply_clicks": 7,
                                  "applications": 3, "click_through_rate": .07}])

    def test_required_config_rejects_missing_or_invalid_property(self):
        with self.assertRaisesRegex(ValueError, "Missing configuration"):
            required_config({})
        env = {"FUSUMI_GA4_PROPERTY_ID": "invalid",
               "FUSUMI_FUNNEL_SHEET_ID": "fixture"}
        with self.assertRaisesRegex(ValueError, "numeric"):
            required_config(env)
        env["FUSUMI_GA4_PROPERTY_ID"] = "123"
        self.assertEqual(required_config(env), env)

    def test_keyless_authentication_contract(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[1]
        workflow = (root / ".github/workflows/private-funnel-dashboard.yml").read_text()
        script = (root / "scripts/sync_recruitment_funnel.py").read_text()
        self.assertIn("google-github-actions/auth@v3", workflow)
        self.assertIn("id-token: write", workflow)
        self.assertIn("github.event.repository.private == true", workflow)
        self.assertIn("github.ref == 'refs/heads/main'", workflow)
        self.assertIn("vars.GCP_WIF_PROVIDER", workflow)
        self.assertIn("vars.GCP_SERVICE_ACCOUNT", workflow)
        self.assertIn("google.auth.default(scopes=SCOPES)", script)
        self.assertNotIn("FUSUMI_GOOGLE_SERVICE_ACCOUNT_JSON", workflow + script)

    def test_reporting_window_in_vietnam_time(self):
        now = datetime(2026, 11, 15, 18, 30, tzinfo=ZoneInfo("UTC"))
        self.assertEqual(reporting_window(now), ("2026-11-09", "2026-11-15"))

    def test_sheet_rejects_pii_columns(self):
        session = FakeSession([["Họ và tên", "Email"], ["A", "a@example.com"]])
        with self.assertRaises(ValueError):
            sheet_counts(session, "sheet-id", "Summary!A:D", "2026-11-09", "2026-11-15")

    def test_sheet_rejects_mismatched_reporting_period(self):
        session = FakeSession([
            ["period_start", "period_end", "job_url", "applications"],
            ["2026-11-01", "2026-11-15", "https://tuyendung.fusumi.vn/2026/10/job.html", 2],
        ])
        with self.assertRaisesRegex(ValueError, "period does not match"):
            sheet_counts(session, "sheet-id", "Summary!A:D", "2026-11-09", "2026-11-15")

    def test_sheet_aggregates_matching_period(self):
        session = FakeSession([
            ["period_start", "period_end", "job_url", "applications"],
            ["2026-11-09", "2026-11-15", "https://tuyendung.fusumi.vn/2026/10/job.html", 2],
        ])
        actual = sheet_counts(session, "sheet-id", "Summary!A:D", "2026-11-09", "2026-11-15")
        self.assertEqual(actual[0][1], 2)

    def test_sheet_rejects_missing_period_and_extra_columns(self):
        with self.assertRaises(ValueError):
            sheet_counts(FakeSession([["period_start", "period_end", "job_url", "applications", "email"]]),
                         "id", "Summary!A:E", "2026-11-09", "2026-11-15")
        with self.assertRaisesRegex(ValueError, "No aggregate"):
            sheet_counts(FakeSession([["period_start", "period_end", "job_url", "applications"]]),
                         "id", "Summary!A:D", "2026-11-09", "2026-11-15")


if __name__ == "__main__":
    unittest.main()
