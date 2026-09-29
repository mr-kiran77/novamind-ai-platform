import uuid
import jwt
import bcrypt
import json
import re
import random
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from app.config import settings
from app.database import get_db
from app.supabase_client import get_supabase
from app.utils.validation import (
    validate_full_name,
    validate_email_address,
    normalize_indian_mobile,
    validate_password_strength
)

IMAGINARY_ADJECTIVES = [
    "Quantum", "Cosmic", "Cyber", "Starlight", "Solar", "Lunar", "Neural", "Aero",
    "Hyper", "Vortex", "Echo", "Prism", "Apex", "Flux", "Nova", "Infinite", "Kinetic"
]
IMAGINARY_NOUNS = [
    "Architect", "Pioneer", "Inventor", "Voyager", "Alchemist", "Crafter", "Explorer",
    "Spark", "Forge", "Catalyst", "Builder", "Seeker", "Navigator", "Synthesizer"
]

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False

    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        now = datetime.now(timezone.utc)
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            
        jti = str(uuid.uuid4())
        to_encode.update({"exp": expire, "iat": now, "jti": jti})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except jwt.PyJWTError:
            return None

    @staticmethod
    def request_otp(mobile: str) -> Dict[str, Any]:
        """Generates an OTP code for mobile authentication."""
        clean_mobile = mobile.strip()
        code = settings.DEV_OTP_DEFAULT_CODE
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)).isoformat()
        
        with get_db() as conn:
            cursor = conn.cursor()
            # Clear previous active OTPs for this number
            cursor.execute("DELETE FROM otps WHERE mobile = ?", (clean_mobile,))
            otp_id = str(uuid.uuid4())
            cursor.execute("""
            INSERT INTO otps (id, mobile, code, expires_at, verified, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
            """, (otp_id, clean_mobile, code, expires_at, datetime.now(timezone.utc).isoformat()))
            
        return {
            "mobile": clean_mobile,
            "message": "OTP generated successfully",
            "dev_code_hint": code if settings.DEV_OTP_AUTO_FILL else None,
            "expires_in_minutes": settings.OTP_EXPIRY_MINUTES
        }

    @staticmethod
    def verify_otp(mobile: str, code: str, allow_recent_verified: bool = True) -> bool:
        clean_mobile = mobile.strip()
        if settings.DEV_OTP_AUTO_FILL and code.strip() == settings.DEV_OTP_DEFAULT_CODE:
            return True

        try:
            norm_mobile = normalize_indian_mobile(clean_mobile)
        except Exception:
            norm_mobile = clean_mobile

        with get_db() as conn:
            cursor = conn.cursor()
            if allow_recent_verified:
                cursor.execute("""
                SELECT id, expires_at, verified FROM otps
                WHERE (mobile = ? OR mobile = ?) AND code = ?
                ORDER BY created_at DESC LIMIT 1
                """, (clean_mobile, norm_mobile, code.strip()))
            else:
                cursor.execute("""
                SELECT id, expires_at, verified FROM otps
                WHERE (mobile = ? OR mobile = ?) AND code = ? AND verified = 0
                ORDER BY created_at DESC LIMIT 1
                """, (clean_mobile, norm_mobile, code.strip()))
            row = cursor.fetchone()
            if not row:
                return False
                
            expires_at = datetime.fromisoformat(row["expires_at"])
            if datetime.now(timezone.utc) > expires_at:
                return False
                
            cursor.execute("UPDATE otps SET verified = 1 WHERE id = ?", (row["id"],))
            return True

    @staticmethod
    def get_user_by_mobile(mobile: str) -> Optional[Dict[str, Any]]:
        clean_mobile = mobile.strip()
        try:
            norm_mobile = normalize_indian_mobile(clean_mobile)
        except Exception:
            norm_mobile = clean_mobile

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE mobile = ? OR mobile = ?", (clean_mobile, norm_mobile))
            user = cursor.fetchone()
            if not user:
                cursor.execute("SELECT * FROM profiles WHERE phone = ? OR phone = ?", (clean_mobile, norm_mobile))
                prof = cursor.fetchone()
                if prof:
                    user = AuthService.get_user_by_id(prof["user_id"])
            if user:
                user["interests"] = json.loads(user.get("interests") or "[]")
                user["skills"] = json.loads(user.get("skills") or "[]")
                user["links"] = json.loads(user.get("links") or "[]")
                user["badges"] = json.loads(user.get("badges") or "[]")
            return user

    @staticmethod
    def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        clean = username.lower().strip().lstrip("@")
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(username) = ?", (clean,))
            user = cursor.fetchone()
            if user:
                user["interests"] = json.loads(user.get("interests") or "[]")
                user["skills"] = json.loads(user.get("skills") or "[]")
                user["links"] = json.loads(user.get("links") or "[]")
                user["badges"] = json.loads(user.get("badges") or "[]")
            return user

    @staticmethod
    def check_username_available(username: str) -> bool:
        clean = username.lower().strip().lstrip("@")
        if not clean or len(clean) < 3:
            return False
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM users WHERE LOWER(username) = ?", (clean,))
            return cursor.fetchone() is None

    @staticmethod
    def suggest_unique_usernames(base: str = "") -> list:
        import random
        clean = re.sub(r"[^a-zA-Z0-9]", "", base.lower()) if base else "innovator"
        if len(clean) < 3:
            clean = "innovator"
        
        suffixes = ["dev", "spark", "creator", "tech", "forge", "nova", "mind", "hub", "craft"]
        suggestions = []
        
        with get_db() as conn:
            cursor = conn.cursor()
            for _ in range(6):
                cand = f"{clean}_{random.choice(suffixes)}_{random.randint(10, 99)}"
                cursor.execute("SELECT 1 FROM users WHERE LOWER(username) = ?", (cand,))
                if not cursor.fetchone() and cand not in suggestions:
                    suggestions.append(cand)
                if len(suggestions) >= 3:
                    break
        return suggestions

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if user:
                user["interests"] = json.loads(user.get("interests") or "[]")
                user["skills"] = json.loads(user.get("skills") or "[]")
                user["links"] = json.loads(user.get("links") or "[]")
                user["badges"] = json.loads(user.get("badges") or "[]")
            return user

    @staticmethod
    def generate_imaginary_profile() -> Dict[str, str]:
        """Generates a futuristic, pseudonymous imaginary persona with random details."""
        adj = random.choice(IMAGINARY_ADJECTIVES)
        noun = random.choice(IMAGINARY_NOUNS)
        num = random.randint(10, 99)
        display_name = f"{adj} {noun}"
        base_user = f"{adj.lower()}_{noun.lower()}_{num}"
        
        with get_db() as conn:
            cursor = conn.cursor()
            cand = base_user
            idx = 1
            while True:
                cursor.execute("SELECT 1 FROM users WHERE username = ?", (cand,))
                if not cursor.fetchone():
                    break
                cand = f"{base_user}_{idx}"
                idx += 1

        avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={cand}"
        return {
            "display_name": display_name,
            "username": cand,
            "avatar_url": avatar,
            "bio": f"Pseudonymous {adj} innovator exploring frontier technology concepts."
        }

    @staticmethod
    def register_user(
        mobile: str,
        username: str = None,
        password: str = "",
        display_name: str = None,
        avatar_url: str = "",
        bio: str = "",
        interests: list = None,
        skills: list = None,
        location: str = "",
        education: str = "",
        occupation: str = "",
        links: list = None
    ) -> Dict[str, Any]:
        # If user did not provide an ID or name, assign a rich imaginary persona!
        if not username or not username.strip() or not display_name or not display_name.strip():
            persona = AuthService.generate_imaginary_profile()
            if not username or not username.strip():
                username = persona["username"]
            if not display_name or not display_name.strip():
                display_name = persona["display_name"]
            if not avatar_url:
                avatar_url = persona["avatar_url"]
            if not bio:
                bio = persona["bio"]

        with get_db() as conn:
            cursor = conn.cursor()
            # Check unique mobile constraint
            cursor.execute("SELECT id FROM users WHERE mobile = ?", (mobile,))
            if cursor.fetchone():
                raise ValueError("Mobile number already registered. Please login with your ID & password.")
                
            cursor.execute("SELECT id FROM users WHERE username = ?", (username.lower().strip(),))
            if cursor.fetchone():
                raise ValueError(f"ID '@{username}' is already taken. Please choose another or click 'Suggest ID'.")

            user_id = str(uuid.uuid4())
            pw_hash = AuthService.hash_password(password)
            now = datetime.now(timezone.utc).isoformat()
            
            initial_badges = json.dumps([{"name": "Early Pioneer", "icon": "🚀", "awarded_at": now}])

            cursor.execute("""
            INSERT INTO users (
                id, mobile, username, display_name, password_hash, role,
                avatar_url, bio, interests, skills, location, education,
                occupation, links, reputation_score, current_streak,
                longest_streak, last_active_date, badges, is_verified,
                is_suspended, is_banned, is_private, created_at
            ) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, 50, 1, 1, ?, ?, 1, 0, 0, 0, ?)
            """, (
                user_id, mobile, username.lower().strip(), display_name, pw_hash,
                avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={username}",
                bio, json.dumps(interests or []), json.dumps(skills or []),
                location, education, occupation, json.dumps(links or []),
                now[:10], initial_badges, now
            ))
            
        new_user = AuthService.get_user_by_id(user_id)
        try:
            from app.services.supabase_sync import supabase_sync
            import threading
            if new_user:
                threading.Thread(target=supabase_sync.sync_user, args=(new_user,), daemon=True).start()
                threading.Thread(
                    target=supabase_sync.track_browsing_event,
                    kwargs={
                        "page_url": "/signup",
                        "event_type": "user_registered",
                        "user_id": user_id,
                        "username": username,
                        "metadata": {"mobile": mobile, "display_name": display_name}
                    },
                    daemon=True
                ).start()
        except Exception:
            pass
        return new_user

    @staticmethod
    def revoke_all_sessions(user_id: str):
        with get_db() as conn:
            conn.cursor().execute("UPDATE sessions SET is_revoked = 1 WHERE user_id = ?", (user_id,))

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        clean = (email or "").lower().strip()
        if not clean:
            return None
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (clean,))
            user = cursor.fetchone()
            if not user:
                cursor.execute("SELECT * FROM profiles WHERE LOWER(email) = ?", (clean,))
                prof = cursor.fetchone()
                if prof:
                    user = AuthService.get_user_by_id(prof["user_id"])
            if user:
                user["interests"] = json.loads(user.get("interests") or "[]")
                user["skills"] = json.loads(user.get("skills") or "[]")
                user["links"] = json.loads(user.get("links") or "[]")
                user["badges"] = json.loads(user.get("badges") or "[]")
            return user

    @staticmethod
    def sync_user_profile(
        user_id: str,
        full_name: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        avatar_url: str = "",
        bio: str = "",
        role: str = "user",
        preferred_language: str = "en"
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM profiles WHERE user_id = ?", (user_id,))
            existing = cursor.fetchone()
            if existing:
                cursor.execute("""
                UPDATE profiles
                SET full_name = ?, email = COALESCE(?, email), phone = COALESCE(?, phone),
                    avatar_url = COALESCE(?, avatar_url), bio = COALESCE(?, bio),
                    role = COALESCE(?, role), preferred_language = ?, updated_at = ?
                WHERE user_id = ?
                """, (full_name, email, phone, avatar_url, bio, role, preferred_language, now, user_id))
            else:
                profile_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO profiles (
                    id, user_id, full_name, email, phone, preferred_language,
                    avatar_url, bio, role, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (profile_id, user_id, full_name, email, phone, preferred_language, avatar_url, bio, role, now, now))
                
            cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
            return cursor.fetchone()

    @staticmethod
    def register_email_user(
        full_name: str,
        email: str,
        password: str,
        mobile: Optional[str] = None
    ) -> Dict[str, Any]:
        valid_name = validate_full_name(full_name)
        valid_email = validate_email_address(email)
        validate_password_strength(password)
        valid_mobile = normalize_indian_mobile(mobile) if mobile and mobile.strip() else None

        if AuthService.get_user_by_email(valid_email):
            raise ValueError("An account with this email already exists. Please sign in.")

        if valid_mobile and AuthService.get_user_by_mobile(valid_mobile):
            raise ValueError("An account with this mobile number already exists.")

        supabase_uid = None
        client = get_supabase()
        if client:
            try:
                signup_payload = {
                    "email": valid_email,
                    "password": password,
                    "options": {
                        "data": {
                            "full_name": valid_name,
                            "phone": valid_mobile or ""
                        }
                    }
                }
                res = client.auth.sign_up(signup_payload)
                if res and res.user:
                    supabase_uid = res.user.id
            except Exception as e:
                err_str = str(e).lower()
                if "already registered" in err_str or "already exists" in err_str:
                    raise ValueError("An account with this email already exists. Please sign in.")

        user_id = supabase_uid or str(uuid.uuid4())
        pw_hash = AuthService.hash_password(password)
        now = datetime.now(timezone.utc).isoformat()
        username_base = valid_email.split("@")[0].lower()
        clean_user = re.sub(r"[^a-zA-Z0-9_]", "", username_base)
        if len(clean_user) < 3:
            clean_user = "user"
        username = clean_user
        idx = 1
        with get_db() as conn:
            cursor = conn.cursor()
            while True:
                cursor.execute("SELECT 1 FROM users WHERE LOWER(username) = ?", (username,))
                if not cursor.fetchone():
                    break
                username = f"{clean_user}_{idx}"
                idx += 1

            avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"
            initial_badges = json.dumps([{"name": "Early Pioneer", "icon": "🚀", "awarded_at": now}])

            mobile_val = valid_mobile if valid_mobile else f"email_{user_id}"
            cursor.execute("""
            INSERT INTO users (
                id, mobile, username, display_name, password_hash, role,
                avatar_url, bio, interests, skills, location, education,
                occupation, links, reputation_score, current_streak,
                longest_streak, last_active_date, badges, is_verified,
                is_suspended, is_banned, is_private, created_at, email
            ) VALUES (?, ?, ?, ?, ?, 'user', ?, '', '[]', '[]', '', '', '', '[]', 50, 1, 1, ?, ?, 1, 0, 0, 0, ?, ?)
            """, (
                user_id, mobile_val, username, valid_name, pw_hash,
                avatar_url, now[:10], initial_badges, now, valid_email
            ))

        AuthService.sync_user_profile(
            user_id=user_id,
            full_name=valid_name,
            email=valid_email,
            phone=valid_mobile or "",
            avatar_url=avatar_url,
            role="user"
        )
        return AuthService.get_user_by_id(user_id)

    @staticmethod
    def authenticate_email_user(email: str, password: str) -> Dict[str, Any]:
        valid_email = validate_email_address(email)
        supabase_auth_success = False
        supabase_user = None

        client = get_supabase()
        if client:
            try:
                res = client.auth.sign_in_with_password({"email": valid_email, "password": password})
                if res and res.user:
                    supabase_auth_success = True
                    supabase_user = res.user
            except Exception as e:
                err_str = str(e).lower()
                if "invalid login credentials" in err_str:
                    pass

        user = AuthService.get_user_by_email(valid_email)
        if not user:
            if supabase_auth_success and supabase_user:
                return AuthService.register_email_user(
                    full_name=supabase_user.user_metadata.get("full_name") or valid_email.split("@")[0],
                    email=valid_email,
                    password=password,
                    mobile=supabase_user.phone
                )
            raise ValueError("No account was found with these details.")

        if user.get("is_banned"):
            raise ValueError("Your account has been suspended by administration.")

        if not (supabase_auth_success or AuthService.verify_password(password, user["password_hash"])):
            raise ValueError("Incorrect email or password. Please try again.")

        return user

    @staticmethod
    def send_phone_otp(mobile: str, channel: str = "sms") -> Dict[str, Any]:
        try:
            clean_mobile = normalize_indian_mobile(mobile)
        except Exception:
            clean_mobile = (mobile or "").strip()

        clean_channel = (channel or "sms").lower().strip()
        if clean_channel not in ["sms", "whatsapp", "call"]:
            clean_channel = "sms"

        # Dispatch external Supabase OTP asynchronously in background so response is immediate (<5ms)
        client = get_supabase()
        if client:
            try:
                import threading
                def _bg_supabase_otp():
                    try:
                        client.auth.sign_in_with_otp({"phone": clean_mobile})
                    except Exception:
                        pass
                threading.Thread(target=_bg_supabase_otp, daemon=True).start()
            except Exception:
                pass

        res = AuthService.request_otp(clean_mobile)
        if clean_channel == "whatsapp":
            res["message"] = f"OTP verification code sent via WhatsApp to {clean_mobile}"
        elif clean_channel == "call":
            res["message"] = f"Voice Call with OTP verification initiated to {clean_mobile}"
        else:
            res["message"] = f"OTP verification code sent via SMS to {clean_mobile}"
        res["channel"] = clean_channel
        return res

    @staticmethod
    def verify_phone_otp_signin(mobile: str, otp_code: str) -> Dict[str, Any]:
        clean_mobile = normalize_indian_mobile(mobile)
        is_valid = AuthService.verify_otp(clean_mobile, otp_code)
        if not is_valid:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT expires_at FROM otps WHERE mobile = ? ORDER BY created_at DESC LIMIT 1", (clean_mobile,))
                row = cursor.fetchone()
                if row:
                    exp = datetime.fromisoformat(row["expires_at"])
                    if datetime.now(timezone.utc) > exp:
                        raise ValueError("This OTP has expired. Please request a new one.")
            raise ValueError("Incorrect OTP. Please check the code and try again.")

        user = AuthService.get_user_by_mobile(clean_mobile)
        if not user:
            raise ValueError("No account was found with these details.")
        return user

    @staticmethod
    def verify_phone_otp_signup(
        mobile: str,
        otp_code: str,
        full_name: str,
        email: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        clean_mobile = normalize_indian_mobile(mobile)
        valid_name = validate_full_name(full_name)
        valid_email = validate_email_address(email) if email and email.strip() else None

        if AuthService.get_user_by_mobile(clean_mobile):
            raise ValueError("An account with this mobile number already exists. Please sign in.")
        if valid_email and AuthService.get_user_by_email(valid_email):
            raise ValueError("An account with this email already exists. Please sign in.")

        is_valid = AuthService.verify_otp(clean_mobile, otp_code, allow_recent_verified=True)
        if not is_valid:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT expires_at FROM otps WHERE mobile = ? ORDER BY created_at DESC LIMIT 1", (clean_mobile,))
                row = cursor.fetchone()
                if row:
                    exp = datetime.fromisoformat(row["expires_at"])
                    if datetime.now(timezone.utc) > exp:
                        raise ValueError("This OTP has expired. Please request a new one.")
            raise ValueError("Incorrect OTP. Please check the code and try again.")

        # Check unique username / ID if provided
        final_username = None
        if username and username.strip():
            clean_user = username.lower().strip().lstrip("@")
            if not AuthService.check_username_available(clean_user):
                raise ValueError(f"ID '@{clean_user}' is already taken. Please choose another.")
            final_username = clean_user

        final_password = str(uuid.uuid4())
        if password and password.strip():
            validate_password_strength(password)
            final_password = password

        user = AuthService.register_user(
            mobile=clean_mobile,
            username=final_username,
            display_name=valid_name,
            password=final_password
        )
        if valid_email:
            with get_db() as conn:
                conn.cursor().execute("UPDATE users SET email = ? WHERE id = ?", (valid_email, user["id"]))
            user["email"] = valid_email

        AuthService.sync_user_profile(
            user_id=user["id"],
            full_name=valid_name,
            email=valid_email or "",
            phone=clean_mobile,
            avatar_url=user["avatar_url"],
            role="user"
        )
        return user

    @staticmethod
    def request_password_reset(email: str) -> Dict[str, Any]:
        valid_email = validate_email_address(email)
        client = get_supabase()
        if client:
            try:
                client.auth.reset_password_for_email(valid_email)
            except Exception:
                pass
        return {
            "status": "success",
            "message": "Password reset instructions have been sent to your email."
        }

auth_service = AuthService()

