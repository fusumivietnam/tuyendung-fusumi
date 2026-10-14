#!/usr/bin/env python3

import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from scripts import check_live_site


class LiveSiteProbeTests(unittest.TestCase):
    def test_rate_limit_backoff_is_short_and_bounded(self) -> None:
        self.assertEqual(check_live_site.retry_wait(1, rate_limited=True), 2.0)
        self.assertEqual(check_live_site.retry_wait(2, rate_limited=True), 4.0)
        self.assertEqual(check_live_site.retry_wait(3, rate_limited=True), 6.0)
        self.assertEqual(check_live_site.retry_wait(1, "60", rate_limited=True), 10.0)
        self.assertEqual(check_live_site.retry_wait(1, "invalid", rate_limited=True), 2.0)

    @patch("scripts.check_live_site.time.sleep")
    @patch("scripts.check_live_site.urlopen")
    def test_persistent_429_stops_after_three_attempts(self, mocked_urlopen, mocked_sleep) -> None:
        mocked_urlopen.side_effect = HTTPError(
            "https://tuyendung.fusumi.vn/",
            429,
            "Too Many Requests",
            None,
            None,
        )

        with self.assertRaises(check_live_site.RateLimited):
            check_live_site.fetch("https://tuyendung.fusumi.vn/")

        self.assertEqual(mocked_urlopen.call_count, 3)
        self.assertEqual([call.args[0] for call in mocked_sleep.call_args_list], [2.0, 4.0])

    def test_defaults_are_fast_fail_safe(self) -> None:
        self.assertEqual(check_live_site.DEFAULT_RETRIES, 3)
        self.assertEqual(check_live_site.DEFAULT_TIMEOUT, 12.0)
        self.assertEqual(check_live_site.MAX_RETRY_AFTER, 10.0)


if __name__ == "__main__":
    unittest.main()
