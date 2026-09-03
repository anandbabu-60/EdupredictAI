"""
==========================================================================
EDUPREDICT AI — ML PIPELINE, AUTH & HISTORY REST API TEST SUITE
Automated verification for model inference, auth, and user history isolation.
==========================================================================
"""

import sys
import unittest
import json
import sqlite3
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app import app, normalize_input_data, evaluate_single_prediction, REQUIRED_FEATURES, model, DB_PATH


class TestEduPredictSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Set up Flask test client and ensure model is loaded."""
        cls.client = app.test_client()
        cls.app_context = app.app_context()
        cls.app_context.push()

    # ==========================================================================
    # ML & MODEL INFERENCE TESTS
    # ==========================================================================

    def test_01_model_loaded(self):
        """Verify that the Scikit-learn model pipeline is loaded and valid."""
        self.assertIsNotNone(model, "ML model should be loaded in app.py")
        self.assertTrue(hasattr(model, "predict"), "Model must implement predict() method")

    def test_02_health_endpoint(self):
        """Test /api/health endpoint returns ok/healthy status and db connected."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn(data["status"], ["ok", "healthy"])
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["database"], "connected")

    def test_03_model_info_and_feature_importance(self):
        """Test /api/model/info endpoint returns metrics and feature importance."""
        response = self.client.get("/api/model/info")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertIn("model_metrics", data)
        self.assertIn("feature_importance", data)
        self.assertGreater(data["model_metrics"]["metrics"]["r2_score"], 0.85)

    def test_04_model_benchmark_endpoint(self):
        """Test /api/model/benchmark endpoint."""
        response = self.client.get("/api/model/benchmark")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertIn("Linear Regression", data["benchmarks"])
        self.assertIn("Random Forest", data["benchmarks"])

    def test_05_prediction_frontend_payload(self):
        """Test single prediction using frontend form field names."""
        payload = {
            "studentName": "Alex Rivera",
            "gradeClass": "B.Tech CSE - 6th Sem",
            "Gender": "Male",
            "Hours_Studied": 22,
            "Attendance": 92,
            "Previous_Scores": 88,
            "Parental_Involvement": "High",
            "Extracurricular_Activities": "Yes",
            "Internet_Access": "Yes"
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "success")
        pred = data["prediction"]
        self.assertGreater(pred["predicted_score"], 70.0)
        self.assertIn(pred["performance_category"], ["Good", "Excellent"])

    def test_06_prediction_at_risk_student(self):
        """Test prediction for an at-risk student input."""
        payload = {
            "studentName": "Jordan Miller",
            "gradeClass": "B.Tech CSE",
            "Gender": "Male",
            "Hours_Studied": 3,
            "Attendance": 55,
            "Previous_Scores": 42,
            "Parental_Involvement": "Low",
            "Extracurricular_Activities": "No",
            "Internet_Access": "No"
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        pred = data["prediction"]
        self.assertLess(pred["predicted_score"], 60.0)
        self.assertIn(pred["performance_category"], ["Needs Improvement", "Average"])
        self.assertIn(pred["risk_level"], ["High Risk", "Critical Risk"])

    def test_07_prediction_full_19_features(self):
        """Test single prediction with explicit 19-feature dataset format."""
        payload = {
            "Hours_Studied": 18.0,
            "Attendance": 88.0,
            "Parental_Involvement": "High",
            "Access_to_Resources": "High",
            "Extracurricular_Activities": "Yes",
            "Sleep_Hours": 7.5,
            "Previous_Scores": 85.0,
            "Motivation_Level": "High",
            "Internet_Access": "Yes",
            "Tutoring_Sessions": 3,
            "Family_Income": "High",
            "Teacher_Quality": "High",
            "School_Type": "Private",
            "Peer_Influence": "Positive",
            "Physical_Activity": 8.0,
            "Learning_Disabilities": "No",
            "Parental_Education_Level": "Postgraduate",
            "Distance_from_Home": "Near",
            "Gender": "Female"
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertGreater(data["exam_score"], 70.0)

    def test_08_batch_prediction(self):
        """Test /api/predict/batch endpoint with multiple students."""
        batch_payload = [
            {
                "studentName": "Student A",
                "studyTime": 25,
                "attendance": 95,
                "previousScore": 90,
                "parentSupport": "High"
            },
            {
                "studentName": "Student B",
                "studyTime": 5,
                "attendance": 60,
                "previousScore": 50,
                "parentSupport": "Low"
            }
        ]
        response = self.client.post("/api/predict/batch", json=batch_payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["total_processed"], 2)

    def test_09_boundary_conditions(self):
        """Verify scores stay strictly within 0-100% boundary."""
        high_res = evaluate_single_prediction({
            "Hours_Studied": 50.0, "Attendance": 100.0, "Parental_Involvement": "High",
            "Access_to_Resources": "High", "Extracurricular_Activities": "Yes", "Sleep_Hours": 8.0,
            "Previous_Scores": 100.0, "Motivation_Level": "High", "Internet_Access": "Yes",
            "Tutoring_Sessions": 10, "Family_Income": "High", "Teacher_Quality": "High",
            "School_Type": "Private", "Peer_Influence": "Positive", "Physical_Activity": 20.0,
            "Learning_Disabilities": "No", "Parental_Education_Level": "Postgraduate",
            "Distance_from_Home": "Near", "Gender": "Female"
        }, {})
        self.assertTrue(0.0 <= high_res["predicted_score"] <= 100.0)

    # ==========================================================================
    # AUTHENTICATION & SQLITE DATABASE TESTS
    # ==========================================================================

    def test_10_database_file_exists(self):
        """Verify persistent SQLite database exists on disk."""
        self.assertTrue(DB_PATH.exists(), f"Database file must exist at {DB_PATH}")

    def test_11_auth_register_success(self):
        """TEST 1: Register a new account crossbrowser@test.com."""
        payload = {
            "name": "Cross Browser User",
            "email": "crossbrowser@test.com",
            "password": "TestPassword123"
        }
        response = self.client.post("/api/auth/register", json=payload)
        if response.status_code == 201:
            data = json.loads(response.data)
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["message"], "Account created successfully")
        else:
            self.assertEqual(response.status_code, 409)

    def test_12_auth_login_browser_a(self):
        """TEST 2: Login in Browser A with crossbrowser@test.com."""
        payload = {
            "email": "crossbrowser@test.com",
            "password": "TestPassword123"
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "crossbrowser@test.com")

    def test_13_auth_login_browser_b_cross_browser(self):
        """TEST 3: Login in completely independent session (Browser B) with same credentials."""
        browser_b_client = app.test_client()
        payload = {
            "email": "crossbrowser@test.com",
            "password": "TestPassword123"
        }
        response = browser_b_client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user"]["email"], "crossbrowser@test.com")

    def test_14_auth_login_wrong_password(self):
        """TEST 4: Wrong password returns 401 Unauthorized."""
        payload = {
            "email": "crossbrowser@test.com",
            "password": "WrongPassword999"
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "error")
        self.assertEqual(data["message"], "Invalid email or password.")

    def test_15_auth_login_non_existent_email(self):
        """TEST 5: Non-existent email returns 401 Unauthorized."""
        payload = {
            "email": "nonexistent_user_xyz@unknown.org",
            "password": "AnyPassword123"
        }
        response = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "error")
        self.assertEqual(data["message"], "Invalid email or password.")

    def test_16_auth_duplicate_registration_conflict(self):
        """TEST 6: Duplicate registration of same email returns 409 Conflict."""
        payload = {
            "name": "Duplicate User",
            "email": "crossbrowser@test.com",
            "password": "AnotherPassword456"
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 409)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "error")
        self.assertEqual(data["message"], "An account with this email already exists.")

    def test_17_user_from_screenshot_registered(self):
        """Verify registration and login for user from screenshot."""
        payload = {
            "name": "Padmanabhuni Anand Babu",
            "email": "test_anand_user@gmail.com",
            "password": "password123"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertIn(res.status_code, [201, 409])

        login_res = self.client.post("/api/auth/login", json={
            "email": "test_anand_user@gmail.com",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 200)
        data = json.loads(login_res.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user"]["email"], "test_anand_user@gmail.com")

    def test_18_auth_me_with_token_auto_login(self):
        """TEST 7: /api/auth/me auto-login verification with valid session token."""
        login_res = self.client.post("/api/auth/login", json={
            "email": "crossbrowser@test.com",
            "password": "TestPassword123"
        })
        token = json.loads(login_res.data)["token"]

        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        data = json.loads(me_res.data)
        self.assertEqual(data["status"], "success")
        self.assertTrue(data["authenticated"])
        self.assertEqual(data["user"]["email"], "crossbrowser@test.com")

    def test_19_auth_me_unauthenticated(self):
        """TEST 8: /api/auth/me unauthenticated check."""
        fresh_client = app.test_client()
        me_res = fresh_client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)
        data = json.loads(me_res.data)
        self.assertFalse(data["authenticated"])

    def test_20_auth_logout(self):
        """TEST 9: /api/auth/logout destroys session token."""
        login_res = self.client.post("/api/auth/login", json={
            "email": "crossbrowser@test.com",
            "password": "TestPassword123"
        })
        token = json.loads(login_res.data)["token"]

        logout_res = self.client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_res.status_code, 200)

        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        data = json.loads(me_res.data)
        self.assertFalse(data["authenticated"])

    # ==========================================================================
    # PREDICTION HISTORY & MULTI-USER ISOLATION TESTS
    # ==========================================================================

    def test_21_user_a_register_and_predict(self):
        """TEST 10: Register User A and make 1st prediction (Saved to DB)."""
        reg_res = self.client.post("/api/auth/register", json={
            "name": "User Alpha",
            "email": "usera_history@university.edu",
            "password": "SecurePassword123"
        })
        self.assertIn(reg_res.status_code, [201, 409])

        # Login User A
        login_res = self.client.post("/api/auth/login", json={
            "email": "usera_history@university.edu",
            "password": "SecurePassword123"
        })
        token = json.loads(login_res.data)["token"]

        # Make prediction with User A token
        pred_res = self.client.post("/api/predict", json={
            "studentName": "Sophia Chen",
            "gradeClass": "B.Tech CSE - 6th Sem",
            "Hours_Studied": 28,
            "Attendance": 98,
            "Previous_Scores": 95,
            "Parental_Involvement": "High",
            "Gender": "Female"
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(pred_res.status_code, 200)
        data = json.loads(pred_res.data)
        self.assertTrue(data["success"])
        self.assertIsNotNone(data["id"])

    def test_22_user_a_history_and_second_prediction(self):
        """TEST 11: Make 2nd prediction and verify history list and statistics."""
        login_res = self.client.post("/api/auth/login", json={
            "email": "usera_history@university.edu",
            "password": "SecurePassword123"
        })
        token = json.loads(login_res.data)["token"]

        # 2nd prediction
        self.client.post("/api/predict", json={
            "studentName": "David Miller",
            "gradeClass": "B.Tech CSE - 4th Sem",
            "Hours_Studied": 16,
            "Attendance": 85,
            "Previous_Scores": 78,
            "Parental_Involvement": "Medium",
            "Gender": "Male"
        }, headers={"Authorization": f"Bearer {token}"})

        # Query history
        hist_res = self.client.get("/api/predictions", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(hist_res.status_code, 200)
        data = json.loads(hist_res.data)
        self.assertEqual(data["status"], "success")
        self.assertGreaterEqual(data["total"], 2)
        self.assertIn("stats", data)
        self.assertGreater(data["stats"]["average_score"], 50.0)

    def test_23_user_a_get_prediction_details(self):
        """TEST 12: View Details endpoint GET /api/predictions/<id>."""
        login_res = self.client.post("/api/auth/login", json={
            "email": "usera_history@university.edu",
            "password": "SecurePassword123"
        })
        token = json.loads(login_res.data)["token"]

        hist_res = self.client.get("/api/predictions", headers={"Authorization": f"Bearer {token}"})
        first_pred = json.loads(hist_res.data)["predictions"][0]
        pred_id = first_pred["id"]

        detail_res = self.client.get(f"/api/predictions/{pred_id}", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(detail_res.status_code, 200)
        d_data = json.loads(detail_res.data)
        self.assertEqual(d_data["status"], "success")
        self.assertEqual(d_data["prediction"]["id"], pred_id)

    def test_24_user_b_multi_user_isolation(self):
        """TEST 13: User B cannot see User A's predictions."""
        # Register User B
        self.client.post("/api/auth/register", json={
            "name": "User Beta",
            "email": "userb_isolation@university.edu",
            "password": "SecurePassword123"
        })

        login_res_b = self.client.post("/api/auth/login", json={
            "email": "userb_isolation@university.edu",
            "password": "SecurePassword123"
        })
        token_b = json.loads(login_res_b.data)["token"]

        # User B queries history -> should be 0
        hist_b = self.client.get("/api/predictions", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(hist_b.status_code, 200)
        data_b = json.loads(hist_b.data)
        self.assertEqual(data_b["total"], 0)
        self.assertEqual(len(data_b["predictions"]), 0)

    def test_25_user_a_delete_prediction(self):
        """TEST 14: Delete a prediction record from history."""
        login_res = self.client.post("/api/auth/login", json={
            "email": "usera_history@university.edu",
            "password": "SecurePassword123"
        })
        token = json.loads(login_res.data)["token"]

        hist_res = self.client.get("/api/predictions", headers={"Authorization": f"Bearer {token}"})
        init_total = json.loads(hist_res.data)["total"]
        target_id = json.loads(hist_res.data)["predictions"][0]["id"]

        # Delete
        del_res = self.client.delete(f"/api/predictions/{target_id}", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(del_res.status_code, 200)

        # Re-query
        hist_res_2 = self.client.get("/api/predictions", headers={"Authorization": f"Bearer {token}"})
        new_total = json.loads(hist_res_2.data)["total"]
        self.assertEqual(new_total, init_total - 1)

    # ==========================================================================
    # FORGOT / RESET PASSWORD TESTS
    # ==========================================================================

    def test_26_reset_password_success(self):
        """TEST 15: Reset password for existing user and log in with new credentials."""
        # 1. Register test reset user
        self.client.post("/api/auth/register", json={
            "name": "Reset Test User",
            "email": "reset_test@university.edu",
            "password": "OldPassword123"
        })

        # 2. Reset password to NewSecretPassword999
        reset_res = self.client.post("/api/auth/reset-password", json={
            "email": "reset_test@university.edu",
            "new_password": "NewSecretPassword999"
        })
        self.assertEqual(reset_res.status_code, 200)
        data = json.loads(reset_res.data)
        self.assertEqual(data["status"], "success")

        # 3. Old password should fail
        old_login = self.client.post("/api/auth/login", json={
            "email": "reset_test@university.edu",
            "password": "OldPassword123"
        })
        self.assertEqual(old_login.status_code, 401)

        # 4. New password should succeed
        new_login = self.client.post("/api/auth/login", json={
            "email": "reset_test@university.edu",
            "password": "NewSecretPassword999"
        })
        self.assertEqual(new_login.status_code, 200)
        self.assertIn("token", json.loads(new_login.data))

    def test_27_reset_password_nonexistent_email(self):
        """TEST 16: Reset password for non-existent email returns 404."""
        reset_res = self.client.post("/api/auth/reset-password", json={
            "email": "completely_unknown_user_999@test.com",
            "new_password": "SomePassword123"
        })
        self.assertEqual(reset_res.status_code, 404)
        data = json.loads(reset_res.data)
        self.assertEqual(data["status"], "error")

    def test_28_reset_password_too_short(self):
        """TEST 17: Short password (<6 chars) returns 400 Bad Request."""
        reset_res = self.client.post("/api/auth/reset-password", json={
            "email": "reset_test@university.edu",
            "new_password": "123"
        })
        self.assertEqual(reset_res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
