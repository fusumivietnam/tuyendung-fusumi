import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "check_job_authoring.py"
spec = importlib.util.spec_from_file_location("check_job_authoring", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)


def html(metadata_rows: str, extra: str = "") -> str:
    return f"""
    <table><tbody>{metadata_rows}</tbody></table>
    <h2>Mô tả công việc</h2><p>Phụ trách nghiệp vụ chuyên môn và phối hợp với các bộ phận liên quan.</p>
    <h2>Yêu cầu</h2><p>Chủ động, trách nhiệm.</p>
    {extra}
    """


GOOD_ROWS = """
<tr><th>Địa điểm</th><td>Hà Nội</td></tr>
<tr><th>Hình thức</th><td>Full-time</td></tr>
<tr><th>Thu nhập</th><td>Thỏa thuận</td></tr>
<tr><th>Số lượng</th><td>02 nhân sự</td></tr>
<tr><th>Hạn ứng tuyển</th><td>31/12/2026</td></tr>
"""

LABELS = ["PB: Kế toán", "ĐĐ: Hà Nội", "HT: Full-time"]


class JobAuthoringQATest(unittest.TestCase):
    def test_valid_job_passes(self):
        self.assertEqual(module.inspect("Kế toán nội bộ", LABELS, html(GOOD_ROWS)), [])

    def test_deadline_can_be_omitted(self):
        rows = GOOD_ROWS.replace('<tr><th>Hạn ứng tuyển</th><td>31/12/2026</td></tr>', '')
        self.assertEqual(module.inspect("Kế toán nội bộ", LABELS, html(rows)), [])

    def test_detects_placeholders_invalid_quantity_and_date(self):
        rows = """
        <tr><th>Địa điểm</th><td>NHẬP ĐỊA ĐIỂM</td></tr>
        <tr><th>Hình thức</th><td>Full-time</td></tr>
        <tr><th>Số lượng</th><td>nhiều</td></tr>
        <tr><th>Hạn ứng tuyển</th><td>31/02/2026</td></tr>
        """
        issues = module.inspect("Kế toán nội bộ", LABELS, html(rows))
        joined = "\n".join(issues)
        self.assertIn("placeholder", joined)
        self.assertIn("Số lượng", joined)
        self.assertIn("Hạn ứng tuyển", joined)

    def test_detects_location_in_title_and_missing_labels(self):
        issues = module.inspect(
            "Nhân viên kinh doanh thị trường - Khu vực Hà Nội",
            ["PB: Kinh doanh"],
            html(GOOD_ROWS),
        )
        joined = "\n".join(issues)
        self.assertIn("Title", joined)
        self.assertIn("ĐĐ:", joined)
        self.assertIn("HT:", joined)

    def test_detects_embedded_code_and_apply_link(self):
        issues = module.inspect(
            "Kế toán nội bộ",
            LABELS,
            html(GOOD_ROWS, '<style>.x{}</style><a href="/p/ung-tuyen.html">Ứng tuyển ngay</a>'),
        )
        joined = "\n".join(issues)
        self.assertIn("style", joined)
        self.assertIn("CTA/link Ứng tuyển", joined)

    def test_detects_duplicate_label_group(self):
        issues = module.inspect(
            "Kế toán nội bộ",
            LABELS + ["ĐĐ: Miền Trung"],
            html(GOOD_ROWS),
        )
        self.assertTrue(any("Chỉ nên có một label nhóm ĐĐ:" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()
