import unittest

from fastapi.testclient import TestClient

from app.demo_data import synthetic_sessions
from app.main import app
from app.signal_processing import trend_for_metric


class TrendEngineTests(unittest.TestCase):
    def test_demo_history_confirms_lower_amplitude_trend(self):
        trend = trend_for_metric(synthetic_sessions("test-profile"), "amplitude_decay_ratio")
        self.assertTrue(trend["baseline_ready"])
        self.assertTrue(trend["confirmed"])
        self.assertEqual(trend["direction"], "lower")

    def test_dashboard_and_export(self):
        client = TestClient(app)
        profile = "test-api-profile"
        response = client.post(f"/api/demo/seed/{profile}")
        self.assertEqual(response.status_code, 200)
        dashboard = client.get(f"/api/dashboard/{profile}?task_type=tapping").json()
        self.assertEqual(len(dashboard["sessions"]), 12)
        export = client.get(f"/api/export/{profile}")
        self.assertIn("Not a diagnosis", export.text)


if __name__ == "__main__":
    unittest.main()
