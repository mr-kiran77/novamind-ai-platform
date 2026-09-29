import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import {
  validateFullName,
  validateEmail,
  normalizeIndianMobile,
  checkPasswordRequirements,
  calculatePasswordStrength,
} from '../utils/validation';
import type { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [signinMethod, setSigninMethod] = useState<'email' | 'phone'>('email');
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!isOpen) return null;

  // Real-time password evaluation
  const pwCheck = checkPasswordRequirements(password);
  const pwStrength = calculatePasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 ? password === confirmPassword : true;

  // Reset form when switching modes
  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setIsForgotPassword(false);
    setIsOtpSent(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleStartCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 1. Sign In with Email
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.signInEmail({ email, password });
      api.setToken(res.access_token);
      onSuccess(res.user, res.access_token);
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('No account') || msg.includes('not found')) {
        setErrorMessage('No account was found with these details.');
      } else if (msg.includes('incorrect') || msg.includes('credentials') || msg.includes('password')) {
        setErrorMessage('Incorrect email or password. Please try again.');
      } else if (msg.includes('connect') || msg.includes('fetch')) {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
      } else {
        setErrorMessage(msg || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Sign Up with Email
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameErr = validateFullName(fullName);
    if (nameErr) {
      setErrorMessage(nameErr);
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    if (mobile.trim()) {
      const { error: phoneErr } = normalizeIndianMobile(mobile);
      if (phoneErr) {
        setErrorMessage(phoneErr);
        return;
      }
    }

    if (!pwCheck.isValid) {
      setErrorMessage('Password does not meet the required security rules.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const normalizedPhone = mobile.trim() ? normalizeIndianMobile(mobile).normalized : undefined;
      const res = await api.signUpEmail({
        full_name: fullName,
        email,
        mobile: normalizedPhone,
        password,
        confirm_password: confirmPassword,
      });
      api.setToken(res.access_token);
      onSuccess(res.user, res.access_token);
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('already registered')) {
        setErrorMessage('An account with this email already exists. Please sign in.');
      } else if (msg.includes('mobile') && msg.includes('exists')) {
        setErrorMessage('An account with this mobile number already exists.');
      } else if (msg.includes('connect') || msg.includes('fetch')) {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
      } else {
        setErrorMessage(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Send Phone OTP
  const handleSendOtp = async () => {
    setErrorMessage(null);
    const { normalized, error } = normalizeIndianMobile(mobile);
    if (error) {
      setErrorMessage(error);
      return;
    }

    try {
      setLoading(true);
      const res = await api.sendPhoneOtp(normalized);
      setIsOtpSent(true);
      setDevCodeHint(res.dev_code_hint || null);
      setSuccessMessage(`OTP sent to ${normalized}`);
      handleStartCooldown();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('too many') || msg.includes('rate limit')) {
        setErrorMessage('Too many attempts. Please wait before requesting another OTP.');
      } else if (msg.includes('connect') || msg.includes('fetch')) {
        setErrorMessage('Unable to connect. Please check your internet connection and try again.');
      } else {
        setErrorMessage(msg || 'Failed to send OTP. Please check the mobile number.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify Phone OTP (Sign In)
  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const { normalized, error } = normalizeIndianMobile(mobile);
    if (error) {
      setErrorMessage(error);
      return;
    }
    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.verifyPhoneSignIn(normalized, otpCode);
      api.setToken(res.access_token);
      onSuccess(res.user, res.access_token);
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('expired')) {
        setErrorMessage('This OTP has expired. Please request a new one.');
      } else if (msg.includes('incorrect') || msg.includes('invalid')) {
        setErrorMessage('Incorrect OTP. Please check the code and try again.');
      } else if (msg.includes('no account') || msg.includes('not found')) {
        setErrorMessage('No account was found with these details.');
      } else {
        setErrorMessage(msg || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. Verify Phone OTP (Sign Up)
  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameErr = validateFullName(fullName);
    if (nameErr) {
      setErrorMessage(nameErr);
      return;
    }

    const { normalized, error } = normalizeIndianMobile(mobile);
    if (error) {
      setErrorMessage(error);
      return;
    }

    if (email.trim()) {
      const emailErr = validateEmail(email);
      if (emailErr) {
        setErrorMessage(emailErr);
        return;
      }
    }

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.verifyPhoneSignUp({
        mobile: normalized,
        otp_code: otpCode,
        full_name: fullName,
        email: email.trim() || undefined,
      });
      api.setToken(res.access_token);
      onSuccess(res.user, res.access_token);
      onClose();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('registered')) {
        setErrorMessage('An account with this mobile number already exists.');
      } else if (msg.includes('expired')) {
        setErrorMessage('This OTP has expired. Please request a new one.');
      } else if (msg.includes('incorrect') || msg.includes('invalid')) {
        setErrorMessage('Incorrect OTP. Please check the code and try again.');
      } else {
        setErrorMessage(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 6. Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    try {
      setLoading(true);
      await api.forgotPassword(email);
      setSuccessMessage('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      setSuccessMessage('Password reset instructions have been sent to your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#10121d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">NovaMind Identity</h2>
              <p className="text-[11px] text-gray-400">Secure Innovation Hub Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector (Sign In vs Sign Up) */}
        {!isForgotPassword && (
          <div className="flex border-b border-white/10 bg-white/[0.02] p-1.5 gap-1.5">
            <button
              onClick={() => handleSwitchMode('signin')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleSwitchMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Notification / Toast Banner */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* FORGOT PASSWORD VIEW */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 mb-2 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <h3 className="text-sm font-bold text-white">Reset Your Password</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Enter your registered email address and we'll send password recovery instructions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Instructions'}
              </button>
            </form>
          ) : mode === 'signin' ? (
            /* SIGN IN VIEW */
            <div className="space-y-4">
              {signinMethod === 'email' ? (
                /* OPTION 1: Email Sign In */
                <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-300">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 mt-1"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-[#10121d] px-2 text-gray-400 font-semibold tracking-wider">OR</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSigninMethod('phone');
                      setIsOtpSent(false);
                      setErrorMessage(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Continue with Mobile Number</span>
                  </button>
                </form>
              ) : (
                /* OPTION 2: Mobile Number Sign In */
                <form onSubmit={handlePhoneSignIn} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Indian Mobile Number</label>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 flex items-center gap-1 text-xs text-gray-400 font-mono">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={mobile.replace(/^\+91/, '').trim()}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="98765 43210"
                        disabled={isOtpSent}
                        className="w-full pl-16 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono disabled:opacity-60"
                        required
                      />
                    </div>
                  </div>

                  {!isOtpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
                    </button>
                  ) : (
                    <div className="space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-300">Enter 6-Digit OTP</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setOtpCode('');
                          }}
                          className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                        >
                          Change mobile number
                        </button>
                      </div>

                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full text-center tracking-[0.5em] font-mono text-base py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                        autoFocus
                      />

                      {devCodeHint && (
                        <p className="text-[11px] text-amber-400 text-center font-mono">
                          Development auto-fill code: <span className="font-bold underline">{devCodeHint}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Didn't receive code?</span>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || loading}
                          onClick={handleSendOtp}
                          className="text-purple-400 hover:text-purple-300 font-semibold disabled:text-gray-600"
                        >
                          {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Sign In'}
                      </button>
                    </div>
                  )}

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-[#10121d] px-2 text-gray-400 font-semibold tracking-wider">OR</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSigninMethod('email');
                      setErrorMessage(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span>Continue with Email</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* SIGN UP VIEW */
            <div className="space-y-4">
              {signupMethod === 'email' ? (
                /* Email Registration */
                <form onSubmit={handleEmailSignUp} className="space-y-3">
                  {/* 1. Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* 2. Email Address */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* 3. Mobile Number (Optional on email sign up) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Mobile Number <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-2 flex items-center gap-1 text-xs text-gray-400 font-mono">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={mobile.replace(/^\+91/, '').trim()}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full pl-16 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {/* 4. Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400">Strength:</span>
                          <span className="font-bold text-gray-200">{pwStrength.label}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex gap-1">
                          <div className={`h-full flex-1 rounded-full ${pwStrength.score >= 1 ? pwStrength.color : 'bg-white/10'}`} />
                          <div className={`h-full flex-1 rounded-full ${pwStrength.score >= 2 ? pwStrength.color : 'bg-white/10'}`} />
                          <div className={`h-full flex-1 rounded-full ${pwStrength.score >= 3 ? pwStrength.color : 'bg-white/10'}`} />
                          <div className={`h-full flex-1 rounded-full ${pwStrength.score >= 4 ? pwStrength.color : 'bg-white/10'}`} />
                        </div>
                      </div>
                    )}

                    {/* Password Requirements Checklist */}
                    <div className="mt-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] space-y-1">
                      <div className="font-semibold text-gray-300 text-[10px] uppercase tracking-wider mb-1">
                        Password Requirements:
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwCheck.minLength ? 'text-emerald-400' : 'text-gray-500'}`}>
                        <span>{pwCheck.minLength ? '✓' : '○'}</span>
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwCheck.hasUpper ? 'text-emerald-400' : 'text-gray-500'}`}>
                        <span>{pwCheck.hasUpper ? '✓' : '○'}</span>
                        <span>One uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwCheck.hasLower ? 'text-emerald-400' : 'text-gray-500'}`}>
                        <span>{pwCheck.hasLower ? '✓' : '○'}</span>
                        <span>One lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwCheck.hasNumber ? 'text-emerald-400' : 'text-gray-500'}`}>
                        <span>{pwCheck.hasNumber ? '✓' : '○'}</span>
                        <span>One number</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwCheck.hasSpecial ? 'text-emerald-400' : 'text-gray-500'}`}>
                        <span>{pwCheck.hasSpecial ? '✓' : '○'}</span>
                        <span>One special character</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {!passwordsMatch && (
                      <p className="text-[11px] text-rose-400 mt-1 font-medium">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !pwCheck.isValid || !passwordsMatch}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </button>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-[#10121d] px-2 text-gray-400 font-semibold tracking-wider">OR</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod('phone');
                      setIsOtpSent(false);
                      setErrorMessage(null);
                    }}
                    className="w-full py-2 rounded-xl border border-white/15 hover:bg-white/5 text-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Register with Mobile OTP</span>
                  </button>
                </form>
              ) : (
                /* Mobile Phone Registration */
                <form onSubmit={handlePhoneSignUp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Indian Mobile Number</label>
                    <div className="relative">
                      <div className="absolute left-3 top-2 flex items-center gap-1 text-xs text-gray-400 font-mono">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={mobile.replace(/^\+91/, '').trim()}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="98765 43210"
                        disabled={isOtpSent}
                        className="w-full pl-16 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono disabled:opacity-60"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Email Address <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>

                  {!isOtpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 mt-1"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification OTP'}
                    </button>
                  ) : (
                    <div className="space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-300">Enter 6-Digit OTP</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setOtpCode('');
                          }}
                          className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                        >
                          Change mobile number
                        </button>
                      </div>

                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full text-center tracking-[0.5em] font-mono text-base py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                        autoFocus
                      />

                      {devCodeHint && (
                        <p className="text-[11px] text-amber-400 text-center font-mono">
                          Development auto-fill code: <span className="font-bold underline">{devCodeHint}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Didn't receive code?</span>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || loading}
                          onClick={handleSendOtp}
                          className="text-purple-400 hover:text-purple-300 font-semibold disabled:text-gray-600"
                        >
                          {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Complete Profile'}
                      </button>
                    </div>
                  )}

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-[#10121d] px-2 text-gray-400 font-semibold tracking-wider">OR</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod('email');
                      setErrorMessage(null);
                    }}
                    className="w-full py-2 rounded-xl border border-white/15 hover:bg-white/5 text-gray-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span>Register with Email &amp; Password</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
