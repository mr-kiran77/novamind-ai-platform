import sys
import io
import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_db
from app.services.auth_service import auth_service

client = TestClient(app)

def setup_module():
    init_db()

def get_auth_token_for_user(prefix: str = "test_profile_user"):
    import uuid
    unique_suffix = uuid.uuid4().hex[:6]
    username = f"{prefix}_{unique_suffix}"
    mobile = f"+19{uuid.uuid4().int % 100000000:08d}"
    user = auth_service.register_user(
        mobile=mobile,
        username=username,
        password="InitialPassword123!",
        display_name="Test Innovator",
        bio="Building the future of neurotechnology.",
        location="San Francisco, CA",
        skills=["AI", "Biotech"],
        interests=["Neurotech", "CleanTech"]
    )
    token = auth_service.create_access_token({
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"]
    })
    return token, user

def test_user_settings_lifecycle():
    token, user = get_auth_token_for_user("settings_user_1")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch settings (should auto-initialize defaults)
    res = client.get("/api/users/me/settings", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user_id"] == user["id"]
    assert data["theme"] in ["dark", "light", "system"]
    assert data["notify_collaborations"] is True
    assert data["notify_copilot"] is True
    assert data["ai_tone"] == "balanced"

    # 2. Update settings
    update_payload = {
        "theme": "light",
        "notify_collaborations": False,
        "notify_polls": True,
        "notify_reactions": False,
        "notify_copilot": True,
        "auto_run_copilot": False,
        "default_jurisdiction": "European Union",
        "ai_tone": "analytical"
    }
    res_up = client.put("/api/users/me/settings", json=update_payload, headers=headers)
    assert res_up.status_code == 200, res_up.text
    updated = res_up.json()
    assert updated["theme"] == "light"
    assert updated["notify_collaborations"] is False
    assert updated["auto_run_copilot"] is False
    assert updated["default_jurisdiction"] == "European Union"
    assert updated["ai_tone"] == "analytical"

    # 3. Invalid theme rejection
    res_inv = client.put("/api/users/me/settings", json={"theme": "neon-rainbow"}, headers=headers)
    assert res_inv.status_code == 400

def test_profile_update_and_public_view():
    token, user = get_auth_token_for_user("profile_view_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Update profile details
    update_data = {
        "display_name": "Dr. Alex Vance Updated",
        "bio": "Specialist in quantum computing algorithms and quantum cryptography.",
        "location": "Boston, MA",
        "occupation": "Principal Quantum Scientist",
        "education": "Ph.D. Quantum Physics, Harvard",
        "skills": ["Quantum", "Qiskit", "Python", "Physics"],
        "interests": ["SpaceTech", "QuantumTech"],
        "links": ["https://github.com/alexvance"],
        "is_private": True
    }
    res = client.put("/api/users/me", json=update_data, headers=headers)
    assert res.status_code == 200, res.text
    user_res = res.json()
    assert user_res["display_name"] == "Dr. Alex Vance Updated"
    assert user_res["location"] == "Boston, MA"
    assert user_res["is_private"] == 1 or user_res["is_private"] is True

    # Public profile fetch by username
    res_pub = client.get(f"/api/users/{user['username']}")
    assert res_pub.status_code == 200, res_pub.text
    pub_data = res_pub.json()
    assert pub_data["profile"]["username"] == user["username"]
    assert pub_data["profile"]["display_name"] == "Dr. Alex Vance Updated"

def test_password_change_flow():
    token, user = get_auth_token_for_user("pw_test_user")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Reject mismatched new password
    res_mismatch = client.post("/api/users/me/change-password", json={
        "current_password": "InitialPassword123!",
        "new_password": "NewSecretPassword456!",
        "confirm_password": "DifferentSecretPassword!"
    }, headers=headers)
    assert res_mismatch.status_code == 400
    assert "not match" in res_mismatch.json()["detail"].lower()

    # 2. Reject incorrect current password
    res_wrong_curr = client.post("/api/users/me/change-password", json={
        "current_password": "WrongCurrentPassword999!",
        "new_password": "NewSecretPassword456!",
        "confirm_password": "NewSecretPassword456!"
    }, headers=headers)
    assert res_wrong_curr.status_code == 400
    assert "incorrect" in res_wrong_curr.json()["detail"].lower() or "does not match" in res_wrong_curr.json()["detail"].lower()

    # 3. Successful password update
    res_success = client.post("/api/users/me/change-password", json={
        "current_password": "InitialPassword123!",
        "new_password": "BrandNewPassword789!",
        "confirm_password": "BrandNewPassword789!"
    }, headers=headers)
    assert res_success.status_code == 200
    assert res_success.json()["status"] == "success"

    # Verify new password works in login
    login_res = client.post("/api/auth/login", json={
        "login_identifier": user["username"],
        "password": "BrandNewPassword789!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_sessions_management():
    token, user = get_auth_token_for_user("session_user")
    headers = {"Authorization": f"Bearer {token}"}

    # List active sessions
    res = client.get("/api/users/me/sessions", headers=headers)
    assert res.status_code == 200, res.text
    sessions = res.json()["sessions"]
    assert len(sessions) >= 1
    session_id = sessions[0]["id"]

    # Revoke all other sessions
    res_rev_others = client.post("/api/users/me/sessions/revoke-all-others", headers=headers)
    assert res_rev_others.status_code == 200

def test_avatar_upload_and_removal():
    token, user = get_auth_token_for_user("avatar_user")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid file extension rejection
    fake_txt = io.BytesIO(b"Not an image file content")
    res_bad = client.post(
        "/api/users/me/avatar",
        files={"file": ("malicious.exe", fake_txt, "application/octet-stream")},
        headers=headers
    )
    assert res_bad.status_code == 400

    # 2. Valid image upload
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82")
    res_good = client.post(
        "/api/users/me/avatar",
        files={"file": ("avatar.png", fake_png, "image/png")},
        headers=headers
    )
    assert res_good.status_code == 200, res_good.text
    avatar_data = res_good.json()
    assert "/static/uploads/" in avatar_data["avatar_url"]

    # 3. Avatar removal
    res_rm = client.delete("/api/users/me/avatar", headers=headers)
    assert res_rm.status_code == 200
    assert "dicebear" in res_rm.json()["avatar_url"]

def test_feedback_submission():
    token, user = get_auth_token_for_user("feedback_user")
    headers = {"Authorization": f"Bearer {token}"}

    fb_payload = {
        "category": "feature",
        "rating": 5,
        "message": "Love the Idea Copilot legal and tax grounding feature! Would love export to PDF."
    }
    res = client.post("/api/users/me/feedback", json=fb_payload, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "success"

def test_multistep_account_deletion():
    # Create isolated user for deletion
    username = "to_be_deleted_user"
    mobile = "+19998887766"
    reg_user = auth_service.register_user(
        mobile=mobile,
        username=username,
        password="DeletePass123!",
        display_name="Farewell User"
    )
    token = auth_service.create_access_token({"sub": reg_user["id"], "username": username, "role": "user"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Reject without typing "DELETE"
    res_bad_phrase = client.request("DELETE", "/api/users/me", json={
        "password": "DeletePass123!",
        "confirm_phrase": "NO"
    }, headers=headers)
    assert res_bad_phrase.status_code == 400

    # 2. Reject with wrong password
    res_bad_pw = client.request("DELETE", "/api/users/me", json={
        "password": "WrongPassword999!",
        "confirm_phrase": "DELETE"
    }, headers=headers)
    assert res_bad_pw.status_code == 400

    # 3. Successful account deletion
    res_del = client.request("DELETE", "/api/users/me", json={
        "password": "DeletePass123!",
        "confirm_phrase": "DELETE"
    }, headers=headers)
    assert res_del.status_code == 200
    assert "permanently removed" in res_del.json()["message"]

    # Verify user no longer exists
    assert auth_service.get_user_by_id(reg_user["id"]) is None

if __name__ == "__main__":
    setup_module()
    tests = [
        ("User Settings Lifecycle", test_user_settings_lifecycle),
        ("Profile Update & Public View", test_profile_update_and_public_view),
        ("Password Change Flow", test_password_change_flow),
        ("Sessions Management", test_sessions_management),
        ("Avatar Upload & Removal", test_avatar_upload_and_removal),
        ("Feedback Submission", test_feedback_submission),
        ("Multi-step Account Deletion", test_multistep_account_deletion),
    ]

    print("\n" + "="*60)
    print("RUNNING USER PROFILE & SETTINGS TEST SUITE")
    print("="*60)
    passed = 0
    for name, test_fn in tests:
        try:
            test_fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name} - {e}")
            import traceback
            traceback.print_exc()

    print("="*60)
    print(f"Summary: {passed}/{len(tests)} tests passed successfully!")
    print("="*60 + "\n")
    if passed != len(tests):
        sys.exit(1)
