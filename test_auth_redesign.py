import re
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_db
from app.services.auth_service import auth_service
from app.utils.validation import (
    validate_full_name,
    validate_email_address,
    normalize_indian_mobile,
    validate_password_strength,
)

client = TestClient(app)

def assert_raises(exc_type, func, *args, **kwargs):
    try:
        func(*args, **kwargs)
        raise AssertionError(f"Expected exception {exc_type.__name__} was not raised")
    except exc_type as e:
        return e

def setup_module():
    init_db()

def test_full_name_validation():
    # Valid names
    for valid in ["John Doe", "Mohammed Raza", "Mary Jane", "O'Connor", "Mary-Jane", "Dr. Alex Vance", "Jean-Luc Picard"]:
        cleaned = validate_full_name(valid)
        assert cleaned is not None

    # Invalid names
    for invalid in ["John123", "12345", "John@Doe", "John#123", "https://example.com", "  ", "A"]:
        exc = assert_raises(ValueError, validate_full_name, invalid)
        assert "valid name" in str(exc).lower()

def test_email_validation():
    # Valid emails
    for valid in ["example@gmail.com", "name@example.com", "user123@gmail.com", "alex.vance@govsaathi.in"]:
        cleaned = validate_email_address(valid)
        assert "@" in cleaned

    # Invalid emails
    for invalid in ["example", "example@", "@example.com", "example@gmail", "hello..test@example.com", "user@.com"]:
        exc = assert_raises(ValueError, validate_email_address, invalid)
        assert "valid email" in str(exc).lower()

def test_indian_mobile_validation():
    # Valid numbers
    for valid in ["+91 98765 43210", "+919876543210", "9876543210", "09876543210"]:
        normalized = normalize_indian_mobile(valid)
        assert normalized.startswith("+91")
        assert len(normalized) == 13

    # Invalid numbers
    for invalid in ["12345", "9876543210123", "abcdefghij", "+1 9876543210", "0123456789"]:
        exc = assert_raises(ValueError, normalize_indian_mobile, invalid)
        assert "indian mobile" in str(exc).lower()

def test_password_strength_validation():
    # Strong passwords
    for valid in ["GovSaathi@2026", "SecurePass#99", "NovaMind$2026!"]:
        assert validate_password_strength(valid) == valid

    # Weak passwords
    for weak in ["short", "nouppercase123!", "NOLOWERCASE123!", "NoNumberSpecial!", "NoSpecialChar123"]:
        assert_raises(ValueError, validate_password_strength, weak)


def test_sign_up_and_duplicate_handling():
    uid = uuid.uuid4().hex[:6]
    test_email = f"innovator_{uid}@example.com"
    test_mobile = f"+9198{uuid.uuid4().int % 100000000:08d}"
    password = "StrongPassword@2026"

    # 1. Reject password mismatch
    res_mismatch = client.post("/api/auth/signup/email", json={
        "full_name": "Kiran Kumar",
        "email": test_email,
        "mobile": test_mobile,
        "password": password,
        "confirm_password": "MismatchedPassword@2026"
    })
    assert res_mismatch.status_code == 422 or res_mismatch.status_code == 400

    # 2. Reject weak password
    res_weak = client.post("/api/auth/signup/email", json={
        "full_name": "Kiran Kumar",
        "email": test_email,
        "mobile": test_mobile,
        "password": "weak",
        "confirm_password": "weak"
    })
    assert res_weak.status_code == 422 or res_weak.status_code == 400

    # 3. Successful registration
    res_signup = client.post("/api/auth/signup/email", json={
        "full_name": "Kiran Kumar",
        "email": test_email,
        "mobile": test_mobile,
        "password": password,
        "confirm_password": password
    })
    assert res_signup.status_code == 200, res_signup.text
    data = res_signup.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_email
    assert data["user"]["display_name"] == "Kiran Kumar"

    # Verify profile created in profiles table
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (data["user"]["id"],))
        profile = cursor.fetchone()
        assert profile is not None
        assert profile["full_name"] == "Kiran Kumar"
        assert profile["email"] == test_email
        assert "password" not in profile  # No passwords in profiles table

    # 4. Duplicate email rejection
    res_dup_email = client.post("/api/auth/signup/email", json={
        "full_name": "Kiran Second",
        "email": test_email,
        "password": password,
        "confirm_password": password
    })
    assert res_dup_email.status_code == 400
    assert "already exists" in res_dup_email.json()["detail"].lower()

    # 5. Duplicate mobile rejection
    res_dup_phone = client.post("/api/auth/signup/email", json={
        "full_name": "Kiran Third",
        "email": f"different_{uid}@example.com",
        "mobile": test_mobile,
        "password": password,
        "confirm_password": password
    })
    assert res_dup_phone.status_code == 400
    assert "mobile number already exists" in res_dup_phone.json()["detail"].lower()

def test_sign_in_flows():
    uid = uuid.uuid4().hex[:6]
    test_email = f"signin_{uid}@example.com"
    password = "StrongPassword@2026"

    # Create user
    res_create = client.post("/api/auth/signup/email", json={
        "full_name": "Dr. Maya Lin",
        "email": test_email,
        "password": password,
        "confirm_password": password
    })
    assert res_create.status_code == 200

    # 1. Correct email/password
    res_signin = client.post("/api/auth/signin/email", json={
        "email": test_email,
        "password": password
    })
    assert res_signin.status_code == 200
    assert "access_token" in res_signin.json()

    # 2. Incorrect email/password
    res_wrong = client.post("/api/auth/signin/email", json={
        "email": test_email,
        "password": "WrongPassword@2026"
    })
    assert res_wrong.status_code == 400
    assert "incorrect" in res_wrong.json()["detail"].lower()

    # 3. Non-existent account
    res_nonexistent = client.post("/api/auth/signin/email", json={
        "email": f"ghost_{uid}@example.com",
        "password": password
    })
    assert res_nonexistent.status_code == 400
    assert "no account" in res_nonexistent.json()["detail"].lower()

def test_phone_otp_flows():
    uid = uuid.uuid4().hex[:6]
    test_mobile = f"+9198{uuid.uuid4().int % 100000000:08d}"

    # 1. Send OTP
    res_send = client.post("/api/auth/otp/send", json={"mobile": test_mobile})
    assert res_send.status_code == 200
    assert "otp sent" in res_send.json()["message"].lower()

    # 2. Incorrect OTP rejection
    res_wrong_otp = client.post("/api/auth/otp/verify-signup", json={
        "mobile": test_mobile,
        "otp_code": "000000",
        "full_name": "Mohammed Raza"
    })
    assert res_wrong_otp.status_code == 400
    assert "incorrect otp" in res_wrong_otp.json()["detail"].lower()

    # 3. Correct OTP Signup
    res_verify_signup = client.post("/api/auth/otp/verify-signup", json={
        "mobile": test_mobile,
        "otp_code": "123456",
        "full_name": "Mohammed Raza"
    })
    assert res_verify_signup.status_code == 200
    user_data = res_verify_signup.json()["user"]
    assert user_data["display_name"] == "Mohammed Raza"
    assert user_data["mobile"] == test_mobile

    # 4. Correct OTP Signin
    res_send2 = client.post("/api/auth/otp/send", json={"mobile": test_mobile})
    assert res_send2.status_code == 200
    res_verify_signin = client.post("/api/auth/otp/verify-signin", json={
        "mobile": test_mobile,
        "otp_code": "123456"
    })
    assert res_verify_signin.status_code == 200
    assert "access_token" in res_verify_signin.json()

def test_forgot_password_flow():
    # 1. Valid email
    res_forgot = client.post("/api/auth/forgot-password", json={"email": "developer@novamind.ai"})
    assert res_forgot.status_code == 200
    assert "instructions have been sent" in res_forgot.json()["message"].lower()

    # 2. Invalid email format
    res_invalid = client.post("/api/auth/forgot-password", json={"email": "not-an-email"})
    assert res_invalid.status_code == 422 or res_invalid.status_code == 400

if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING MODERN AUTH REDESIGN VERIFICATION TESTS")
    print("=" * 60)
    test_full_name_validation()
    print("  [PASS] Full Name Validation")
    test_email_validation()
    print("  [PASS] Email Address Validation")
    test_indian_mobile_validation()
    print("  [PASS] Indian Mobile Number Validation")
    test_password_strength_validation()
    print("  [PASS] Password Strength & Rule Checklist")
    test_sign_up_and_duplicate_handling()
    print("  [PASS] Sign Up Flow, Password Confirmation & Duplicate Rejection")
    test_sign_in_flows()
    print("  [PASS] Sign In Email Flow, Incorrect Password & Non-Existent Account")
    test_phone_otp_flows()
    print("  [PASS] Phone OTP Send, Resend & Sign In/Sign Up Verification")
    test_forgot_password_flow()
    print("  [PASS] Forgot Password Recovery Flow")
    print("=" * 60)
    print("ALL MODERN AUTHENTICATION TESTS PASSED 100%!")
    print("=" * 60)
