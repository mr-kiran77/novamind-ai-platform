// Frontend authentication validation utilities

export interface PasswordCheckResult {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
}

/**
 * Validates human full name.
 * Allows: Alphabetic characters, spaces, hyphens, apostrophes (e.g. John Doe, O'Connor, Mary-Jane, Mohammed Raza).
 * Rejects: Numbers, special characters, emoji, URLs, excessive spaces.
 */
export function validateFullName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return 'Please enter a valid name.';
  }
  if (trimmed.length < 2 || trimmed.length > 70) {
    return 'Please enter a valid name using letters and spaces.';
  }
  if (/[\d@#$%^&*()_+=\[\]{}|\\/<>~`!?;:]/.test(trimmed) || trimmed.includes('http')) {
    return 'Please enter a valid name using letters and spaces.';
  }
  const nameRegex = /^[A-Za-z\u00C0-\u024F]+(?:[.' -]+[A-Za-z\u00C0-\u024F]+)*\.?$/;
  if (!nameRegex.test(trimmed)) {
    return 'Please enter a valid name using letters and spaces.';
  }
  return null;
}

/**
 * Validates email address format.
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return 'Please enter a valid email address.';
  }
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (!emailRegex.test(trimmed) || trimmed.includes('..')) {
    return 'Please enter a valid email address.';
  }
  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'Please enter a valid email address.';
  const domain = parts[1];
  if (!domain.includes('.') || domain.split('.').pop()!.length < 2) {
    return 'Please enter a valid email address.';
  }
  return null;
}

/**
 * Normalizes Indian mobile number to +91XXXXXXXXXX format.
 * Accepts: +91 98765 43210, +919876543210, 9876543210, 09876543210.
 */
export function normalizeIndianMobile(mobile: string): { normalized: string; error: string | null } {
  const cleaned = mobile.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) {
    return { normalized: '', error: 'Please enter a valid Indian mobile number.' };
  }
  let digits = cleaned;
  if (cleaned.startsWith('+91')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    digits = cleaned.slice(1);
  }

  // Must be 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { normalized: '', error: 'Please enter a valid Indian mobile number.' };
  }
  return { normalized: `+91${digits}`, error: null };
}

/**
 * Checks all 5 password requirements.
 */
export function checkPasswordRequirements(password: string): PasswordCheckResult {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isValid = minLength && hasUpper && hasLower && hasNumber && hasSpecial;

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid,
  };
}

/**
 * Calculates password strength meter.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Weak', color: 'bg-gray-600' };
  }
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-cyan-500' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
}
