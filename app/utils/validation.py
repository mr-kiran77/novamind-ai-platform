import re
from typing import Optional

def validate_full_name(name: str) -> str:
    """
    Validates human full names.
    Allows: Alphabetic characters, spaces, hyphens, apostrophes (e.g. John Doe, O'Connor, Mary-Jane).
    Rejects: Numbers, special characters, emoji, URLs, excessive spaces.
    """
    cleaned = re.sub(r'\s+', ' ', (name or '').strip())
    if not cleaned or len(cleaned) < 2 or len(cleaned) > 70:
        raise ValueError("Please enter a valid name using letters and spaces.")
    if re.search(r'[\d@#$%^&*()_+=\[\]{}|\\/<>~`!?;:]', cleaned) or 'http' in cleaned:
        raise ValueError("Please enter a valid name using letters and spaces.")
    if not re.match(r"^[A-Za-z\u00C0-\u024F]+(?:[.' -]+[A-Za-z\u00C0-\u024F]+)*\.?$", cleaned):
        raise ValueError("Please enter a valid name using letters and spaces.")
    return cleaned

def validate_email_address(email: str) -> str:
    """
    Validates email addresses with standard RFC formatting.
    Rejects obviously invalid formats: example, example@, @example.com, example@gmail, hello..test@example.com.
    """
    cleaned = (email or '').strip().lower()
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not cleaned or not re.match(email_regex, cleaned) or '..' in cleaned:
        raise ValueError("Please enter a valid email address.")
    domain = cleaned.split('@')[-1]
    if '.' not in domain or len(domain.split('.')[-1]) < 2:
        raise ValueError("Please enter a valid email address.")
    return cleaned

def normalize_indian_mobile(mobile: str) -> str:
    """
    Normalizes Indian mobile numbers into standard +91XXXXXXXXXX format.
    Accepts: +91 XXXXX XXXXX, +919876543210, 9876543210, 09876543210.
    Rejects: Alphabetic characters, invalid lengths, invalid country prefixes.
    """
    cleaned = re.sub(r'[\s\-\(\)]', '', (mobile or '').strip())
    if cleaned.startswith('+91'):
        digits = cleaned[3:]
    elif cleaned.startswith('91') and len(cleaned) == 12:
        digits = cleaned[2:]
    elif cleaned.startswith('0') and len(cleaned) == 11:
        digits = cleaned[1:]
    else:
        digits = cleaned
    
    if not re.match(r"^[6-9]\d{9}$", digits):
        raise ValueError("Please enter a valid Indian mobile number.")
    return f"+91{digits}"

def validate_password_strength(password: str) -> str:
    """
    Validates password strength:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r'[0-9]', password):
        raise ValueError("Password must contain at least one number.")
    if not re.search(r'[^A-Za-z0-9]', password):
        raise ValueError("Password must contain at least one special character.")
    return password
