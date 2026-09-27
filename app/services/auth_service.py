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
    def verify_otp(mobile: str, code: str) -> bool:
        clean_mobile = mobile.strip()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id, expires_at, verified FROM otps
            WHERE mobile = ? AND code = ? AND verified = 0
            ORDER BY created_at DESC LIMIT 1
            """, (clean_mobile, code.strip()))
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
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE mobile = ?", (mobile.strip(),))
            user = cursor.fetchone()
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
            
        return AuthService.get_user_by_id(user_id)

    @staticmethod
    def revoke_all_sessions(user_id: str):
        with get_db() as conn:
            conn.cursor().execute("UPDATE sessions SET is_revoked = 1 WHERE user_id = ?", (user_id,))

auth_service = AuthService()
