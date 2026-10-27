from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = [
    ROOT / ".github" / "workflows" / "ci.yml",
    ROOT / ".github" / "workflows" / "live-smoke-test.yml",
]


class PlaywrightCacheContractTests(unittest.TestCase):
    def test_workflows_share_pinned_playwright_cache_contract(self):
        for workflow in WORKFLOWS:
            text = workflow.read_text(encoding="utf-8")
            with self.subTest(workflow=workflow.name):
                self.assertIn("PLAYWRIGHT_VERSION: '1.63.0'", text)
                self.assertIn("npm install --no-save @playwright/test@${PLAYWRIGHT_VERSION}", text)
                self.assertIn("uses: actions/cache@v6", text)
                self.assertIn("path: ~/.cache/ms-playwright", text)
                self.assertIn(
                    "key: playwright-${{ runner.os }}-${{ env.PLAYWRIGHT_VERSION }}-chromium",
                    text,
                )
                self.assertNotIn("npx playwright install-deps chromium", text)
                self.assertIn("if: steps.playwright-cache.outputs.cache-hit != 'true'", text)
                self.assertIn("run: npx playwright install chromium", text)
                self.assertNotIn("npx playwright install --with-deps chromium", text)
                self.assertIn("uses: actions/checkout@v7", text)
                self.assertIn("uses: actions/setup-node@v7", text)
                self.assertIn("uses: actions/upload-artifact@v7", text)
                self.assertIn("node-version: '24'", text)


if __name__ == "__main__":
    unittest.main()
