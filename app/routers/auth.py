from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any
from app.models.schemas import (
    OTPRequest, OTPVerify, UserRegister, UserLogin,
    PasswordResetRequest, PasswordResetConfirm, TokenResponse,
    SignUpRequest, SignInEmailRequest, PhoneOTPRequest,
    PhoneOTPSignInVerify, PhoneOTPSignUpVerify, ForgotPasswordRequest
)
from app.services.auth_service import auth_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Modern Sign Up / Sign In Endpoints
@router.post("/signup/email", response_model=TokenResponse)
def signup_email(data: SignUpRequest):
    try:
        user = auth_service.register_email_user(
            full_name=data.full_name,
            email=data.email,
            password=data.password,
            mobile=data.mobile
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    token = auth_service.create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/signin/email", response_model=TokenResponse)
def signin_email(data: SignInEmailRequest):
    try:
        user = auth_service.authenticate_email_user(
            email=data.email,
            password=data.password
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    token = auth_service.create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/otp/send")
def send_otp(data: PhoneOTPRequest):
    try:
        return auth_service.send_phone_otp(data.mobile, channel=data.channel or "sms")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/otp/verify-signin", response_model=TokenResponse)
def verify_otp_signin(data: PhoneOTPSignInVerify):
    try:
        user = auth_service.verify_phone_otp_signin(data.mobile, data.otp_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    token = auth_service.create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/otp/verify-signup", response_model=TokenResponse)
def verify_otp_signup(data: PhoneOTPSignUpVerify):
    try:
        user = auth_service.verify_phone_otp_signup(
            mobile=data.mobile,
            otp_code=data.otp_code,
            full_name=data.full_name,
            email=data.email,
            username=data.username,
            password=data.password
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    token = auth_service.create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    try:
        return auth_service.request_password_reset(data.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/otp/request")
def request_otp(data: OTPRequest):
    return auth_service.request_otp(data.mobile)

@router.post("/otp/verify")
def verify_otp(data: OTPVerify):
    is_valid = auth_service.verify_otp(data.mobile, data.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP verification code")
    return {"status": "success", "message": "OTP verified successfully"}

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister):
    is_valid = auth_service.verify_otp(data.mobile, data.otp_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Valid OTP verification required before registration")
    try:
        user = auth_service.register_user(
            mobile=data.mobile,
            username=data.username,
            password=data.password,
            display_name=data.display_name,
            avatar_url=data.avatar_url,
            bio=data.bio,
            interests=data.interests,
            skills=data.skills,
            location=data.location,
            education=data.education,
            occupation=data.occupation,
            links=data.links
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = auth_service.create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin):
    identifier = (data.login_identifier or data.mobile or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Please enter your Unique ID, Email, or Mobile number")

    # Look up by unique username (ID), email, or mobile number
    user = (
        auth_service.get_user_by_username(identifier)
        or auth_service.get_user_by_email(identifier)
        or auth_service.get_user_by_mobile(identifier)
    )
    if not user:
        raise HTTPException(status_code=400, detail=f"No account found for '{identifier}'. Please check your ID or sign up.")
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Your account has been suspended by administration")
    if not auth_service.verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password. Please verify and try again.")
        
    token = auth_service.create_access_token({"sub": user["id"], "username": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/suggest-persona")
def suggest_persona():
    """Generates a random, futuristic imaginary persona for 100% pseudonymous privacy."""
    return auth_service.generate_imaginary_profile()

@router.get("/check-username")
def check_username(username: str):
    """Checks whether a unique ID is available."""
    is_avail = auth_service.check_username_available(username)
    suggestions = auth_service.suggest_unique_usernames(username) if not is_avail else []
    return {"available": is_avail, "username": username, "suggestions": suggestions}

@router.post("/password-reset/request")
def reset_request(data: PasswordResetRequest):
    user = auth_service.get_user_by_mobile(data.mobile)
    if not user:
        raise HTTPException(status_code=404, detail="No registered account found with this mobile number")
    return auth_service.request_otp(data.mobile)

@router.post("/password-reset/confirm")
def reset_confirm(data: PasswordResetConfirm):
    if not auth_service.verify_otp(data.mobile, data.otp_code):
        raise HTTPException(status_code=400, detail="Invalid OTP code for password reset")
    user = auth_service.get_user_by_mobile(data.mobile)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_hash = auth_service.hash_password(data.new_password)
    from app.database import get_db
    with get_db() as conn:
        conn.cursor().execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))
    return {"status": "success", "message": "Password updated successfully. Please login."}

@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout(user: Dict[str, Any] = Depends(get_current_user)):
    return {"status": "success", "message": "Logged out successfully"}

@router.post("/logout-all")
def logout_all(user: Dict[str, Any] = Depends(get_current_user)):
    auth_service.revoke_all_sessions(user["id"])
    return {"status": "success", "message": "All active sessions revoked"}

@router.post("/demo-switch")
def demo_switch(role: str = "user"):
    """Instant role switcher for hackathon judges and evaluators."""
    from app.database import get_db
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE role = ? LIMIT 1", (role,))
        user = cursor.fetchone()
        if not user:
            cursor.execute("SELECT * FROM users LIMIT 1")
            user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="No demo users seeded yet")

    full_user = auth_service.get_user_by_id(user["id"])
    token = auth_service.create_access_token({"sub": full_user["id"], "username": full_user["username"], "role": full_user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": full_user}
