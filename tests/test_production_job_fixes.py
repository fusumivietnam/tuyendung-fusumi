from pathlib import Path
import unittest

from scripts.check_job_authoring import inspect


ROOT = Path(__file__).resolve().parents[1]
FIXES = ROOT / "production-fixes" / "issue-62"


class ProductionJobFixTests(unittest.TestCase):
    def test_accounting_job_repair_passes_authoring_contract(self):
        html = (FIXES / "ke-toan-noi-bo.html").read_text(encoding="utf-8")
        issues = inspect(
            "Kế toán nội bộ",
            ["PB: Kế toán", "ĐĐ: Hà Nội", "HT: Full-time"],
            html,
        )
        self.assertEqual([], issues)
        self.assertNotIn("<style", html.lower())
        self.assertNotIn("[01 nhân sự]", html)

    def test_sales_job_repair_passes_authoring_contract(self):
        html = (FIXES / "nvkd-mien-trung.html").read_text(encoding="utf-8")
        issues = inspect(
            "Nhân viên kinh doanh thị trường",
            ["PB: Kinh doanh", "ĐĐ: Miền Trung", "HT: Full-time"],
            html,
        )
        self.assertEqual([], issues)
        self.assertNotIn("Cập nhật theo kế hoạch tuyển dụng", html)
        self.assertIn("<th>Địa điểm</th>", html)
        self.assertIn("<th>Hình thức</th>", html)
        self.assertIn("<th>Số lượng</th>", html)


if __name__ == "__main__":
    unittest.main()
