import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
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
  ShieldCheck,
  Bot,
  Compass,
  Check,
  Zap,
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

interface LoginPageProps {
  initialMode?: 'signin' | 'signup';
  onSuccess: (user: User, token: string) => void;
  onNavigateHome: () => void;
  onSwitchPersona: (role: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMode = 'signin',
  onSuccess,
  onNavigateHome,
  onSwitchPersona,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
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

  // 6-digit OTP input refs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update mode if initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Real-time password evaluation
  const pwCheck = checkPasswordRequirements(password);
  const pwStrength = calculatePasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 ? password === confirmPassword : true;

  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setIsForgotPassword(false);
    setIsOtpSent(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpCode('');
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

  // 1. Email Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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

  // 2. Email Sign Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
      setErrorMessage('Password does not meet the security requirements.');
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
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        mobile: normalizedPhone,
      });
      api.setToken(res.access_token);
      setSuccessMessage('Account created successfully! Welcome to NovaMind.');
      setTimeout(() => {
        onSuccess(res.user, res.access_token);
      }, 800);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('registered')) {
        setErrorMessage('An account with this email address already exists. Please Sign In.');
      } else {
        setErrorMessage(msg || 'Account registration failed. Please review your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Send Mobile OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const { normalized, error: phoneErr } = normalizeIndianMobile(mobile);
    if (phoneErr) {
      setErrorMessage(phoneErr);
      return;
    }

    if (mode === 'signup') {
      const nameErr = validateFullName(fullName);
      if (nameErr) {
        setErrorMessage(nameErr);
        return;
      }
      if (email.trim()) {
        const emailErr = validateEmail(email);
        if (emailErr) {
          setErrorMessage(emailErr);
          return;
        }
      }
    }

    try {
      setLoading(true);
      const res = await api.sendPhoneOtp(normalized);
      setIsOtpSent(true);
      setDevCodeHint(res.dev_code_hint || '123456');
      setSuccessMessage(res.message || 'OTP verification code sent successfully.');
      handleStartCooldown();
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please verify your phone number.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify Mobile OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    const { normalized, error: phoneErr } = normalizeIndianMobile(mobile);
    if (phoneErr) {
      setErrorMessage(phoneErr);
      return;
    }

    try {
      setLoading(true);
      let res;
      if (mode === 'signin') {
        res = await api.verifyPhoneSignIn(normalized, code);
      } else {
        res = await api.verifyPhoneSignUp({
          mobile: normalized,
          otp_code: code,
          full_name: fullName.trim(),
          email: email.trim() || undefined,
        });
      }
      api.setToken(res.access_token);
      setSuccessMessage('Verification successful! Logging you in...');
      setTimeout(() => {
        onSuccess(res.user, res.access_token);
      }, 700);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('No account')) {
        setErrorMessage('No account found for this mobile number. Please Sign Up.');
      } else if (msg.includes('Invalid') || msg.includes('expired')) {
        setErrorMessage('Invalid or expired OTP code. Please try again.');
      } else {
        setErrorMessage(msg || 'OTP verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password Recovery
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    try {
      setLoading(true);
      const res = await api.forgotPassword(email);
      setSuccessMessage(res.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send password reset request.');
    } finally {
      setLoading(false);
    }
  };

  // OTP 6-box input handlers
  const handleOtpBoxChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newCodeArr = otpCode.padEnd(6, ' ').split('');
      newCodeArr[index] = ' ';
      setOtpCode(newCodeArr.join('').trim());
      return;
    }

    const digit = cleanVal[cleanVal.length - 1];
    const newCodeArr = otpCode.padEnd(6, ' ').split('');
    newCodeArr[index] = digit;
    const finalCode = newCodeArr.join('').replace(/\s+$/, '');
    setOtpCode(finalCode);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (finalCode.replace(/\s/g, '').length === 6) {
      handleVerifyOtp(finalCode.replace(/\s/g, ''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && (!otpCode[index] || otpCode[index] === ' ')) {
      if (index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      setOtpCode(pasted);
      const targetIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[targetIdx]?.focus();
      if (pasted.length === 6) {
        handleVerifyOtp(pasted);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[25%] w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-[#0a0b12]/60 z-20">
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-white shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                NOVAMIND
              </span>
              <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Gov Saathi
              </span>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block">AI Innovation &amp; Structuring Platform</p>
          </div>
        </div>

        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 lg:py-12 z-10 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left Column: Platform Value & Hero Highlights (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold w-fit">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Next-Generation Innovation Ecosystem</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
              Turn Raw Thoughts into{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
                Executable Blueprints
              </span>
            </h1>

            <p className="text-sm text-gray-300 leading-relaxed">
              Join innovators, researchers, and builders who turn napkin concepts into structured 22-field execution models powered by our 50-agent Gemini swarm.
            </p>

            {/* Feature Points */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">5-Agent Idea Copilot</h4>
                  <p className="text-[11px] text-gray-400">Automated feasibility audits, moat analysis, and 3-phase execution roadmaps.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Gov Grants &amp; Scheme Matcher</h4>
                  <p className="text-[11px] text-gray-400">Grounding-verified matching with official central &amp; state innovation schemes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Enterprise Privacy &amp; Supabase Auth</h4>
                  <p className="text-[11px] text-gray-400">Decoupled profile synchronization, hashed credentials, and zero plain passwords.</p>
                </div>
              </div>
            </div>

            {/* Hackathon Quick Persona Shortcuts */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span> Quick Evaluator Personas
                </span>
                <span className="text-[10px] text-purple-300/80">One-Click Testing</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Want to test the platform instantly without entering credentials?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSwitchPersona('user')}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-gray-200 border border-white/10 transition-colors text-center"
                >
                  ⚡ Innovator
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchPersona('moderator')}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-semibold text-amber-200 border border-amber-500/30 transition-colors text-center"
                >
                  🛡️ Moderator
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchPersona('admin')}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-[11px] font-semibold text-cyan-200 border border-cyan-500/30 transition-colors text-center"
                >
                  👑 Admin
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md bg-[#121422]/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
              
              {/* Card Mode Tabs: Sign In vs Sign Up */}
              <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signin')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    mode === 'signin'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signup')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isForgotPassword
                    ? 'Reset Your Password'
                    : mode === 'signin'
                    ? 'Welcome Back to NovaMind'
                    : 'Create Your NovaMind Account'}
                </h2>
                <p className="text-xs text-gray-400">
                  {isForgotPassword
                    ? 'Enter your registered email to receive a password reset link.'
                    : mode === 'signin'
                    ? 'Sign in to access your ideas, copilot audits, and network.'
                    : 'Get started in under 30 seconds with email or mobile OTP.'}
                </p>
              </div>

              {/* Method Switcher: Email vs Mobile OTP (Hidden in Forgot Password mode) */}
              {!isForgotPassword && (
                <div className="flex items-center justify-center gap-2 border-b border-white/10 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('email');
                      setIsOtpSent(false);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      method === 'email'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email &amp; Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('phone');
                      setIsOtpSent(false);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      method === 'phone'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile Phone (OTP)</span>
                  </button>
                </div>
              )}

              {/* Alerts / Error & Success Messages */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* ------------------- VIEW: FORGOT PASSWORD ------------------- */}
              {isForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Registered Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-xs font-bold gradient-btn text-white shadow-lg shadow-purple-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <span>Send Recovery Link</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-center text-xs text-purple-400 hover:text-purple-300 transition-colors pt-2"
                  >
                    Back to Sign In
                  </button>
                </form>
              ) : method === 'email' ? (
                /* ------------------- VIEW: EMAIL AUTH (SIGN IN / SIGN UP) ------------------- */
                <form onSubmit={mode === 'signin' ? handleEmailSignIn : handleEmailSignUp} className="space-y-4">
                  
                  {/* Full Name (Sign Up only) */}
                  {mode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                        <span>Full Name</span>
                        <span className="text-[10px] text-gray-400 font-normal">Human name only</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Dr. Maya Lin"
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Optional Mobile Number (Sign Up only) */}
                  {mode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                        <span>Mobile Number</span>
                        <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-2.5 text-xs font-bold text-gray-400 flex items-center gap-1">
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="98765 43210"
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-16 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-300">Password</label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Meter & Live Checklist (Sign Up only) */}
                  {mode === 'signup' && password.length > 0 && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
                      {/* 4-tier Strength Meter Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                          <span className="text-gray-400">Password Strength:</span>
                          <span className={
                            pwStrength.label === 'Weak' ? 'text-red-400' :
                            pwStrength.label === 'Fair' ? 'text-amber-400' :
                            pwStrength.label === 'Good' ? 'text-blue-400' : 'text-emerald-400'
                          }>
                            {pwStrength.label}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              pwStrength.label === 'Weak' ? 'w-1/4 bg-red-500' :
                              pwStrength.label === 'Fair' ? 'w-2/4 bg-amber-500' :
                              pwStrength.label === 'Good' ? 'w-3/4 bg-blue-500' : 'w-full bg-emerald-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Live Checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <div className={`flex items-center gap-1.5 ${pwCheck.minLength ? 'text-emerald-400' : 'text-gray-400'}`}>
                          <Check className={`w-3 h-3 ${pwCheck.minLength ? 'text-emerald-400' : 'opacity-30'}`} />
                          <span>8+ characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${pwCheck.hasUpper ? 'text-emerald-400' : 'text-gray-400'}`}>
                          <Check className={`w-3 h-3 ${pwCheck.hasUpper ? 'text-emerald-400' : 'opacity-30'}`} />
                          <span>Uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${pwCheck.hasLower ? 'text-emerald-400' : 'text-gray-400'}`}>
                          <Check className={`w-3 h-3 ${pwCheck.hasLower ? 'text-emerald-400' : 'opacity-30'}`} />
                          <span>Lowercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${pwCheck.hasNumber ? 'text-emerald-400' : 'text-gray-400'}`}>
                          <Check className={`w-3 h-3 ${pwCheck.hasNumber ? 'text-emerald-400' : 'opacity-30'}`} />
                          <span>At least 1 number</span>
                        </div>
                        <div className={`flex items-center gap-1.5 sm:col-span-2 ${pwCheck.hasSpecial ? 'text-emerald-400' : 'text-gray-400'}`}>
                          <Check className={`w-3 h-3 ${pwCheck.hasSpecial ? 'text-emerald-400' : 'opacity-30'}`} />
                          <span>Special symbol (!@#$%^&amp;*)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirm Password (Sign Up only) */}
                  {mode === 'signup' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-300">Confirm Password</label>
                        {confirmPassword.length > 0 && (
                          <span className={`text-[10px] font-semibold ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                            {passwordsMatch ? '✓ Matches' : '✗ Do not match'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-xs font-bold gradient-btn text-white shadow-lg shadow-purple-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{mode === 'signin' ? 'Signing in...' : 'Creating Account...'}</span>
                      </>
                    ) : (
                      <span>{mode === 'signin' ? 'Sign In to NovaMind' : 'Complete Registration'}</span>
                    )}
                  </button>
                </form>
              ) : (
                /* ------------------- VIEW: MOBILE PHONE OTP ------------------- */
                <div className="space-y-4">
                  {!isOtpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      {mode === 'signup' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-300">Full Name</label>
                          <div className="relative">
                            <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="e.g. Dr. Maya Lin"
                              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-300">Indian Mobile Number</label>
                        <div className="relative">
                          <div className="absolute left-3 top-2.5 text-xs font-bold text-cyan-400 flex items-center gap-1">
                            <span>🇮🇳</span>
                            <span>+91</span>
                          </div>
                          <input
                            type="tel"
                            required
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="98765 43210"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-16 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
                          />
                        </div>
                      </div>

                      {mode === 'signup' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                            <span>Email Address</span>
                            <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@domain.com"
                              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Dispatching OTP...</span>
                          </>
                        ) : (
                          <span>Send Verification Code</span>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* 6-digit OTP Input View */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">
                          Code sent to: <strong className="text-white">{mobile}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setOtpCode('');
                            setErrorMessage(null);
                          }}
                          className="text-[11px] text-cyan-400 hover:underline"
                        >
                          Change mobile number
                        </button>
                      </div>

                      {/* Dev code hint callout */}
                      {devCodeHint && (
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                          <span>💡 Instant Dev Verification Code:</span>
                          <span className="font-mono font-bold text-white bg-purple-600/40 px-2 py-0.5 rounded">
                            {devCodeHint}
                          </span>
                        </div>
                      )}

                      {/* 6 Individual Digit Inputs */}
                      <div className="flex items-center justify-between gap-2">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otpCode[idx] && otpCode[idx] !== ' ' ? otpCode[idx] : ''}
                            onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            onPaste={handleOtpPaste}
                            className="w-12 h-13 text-center text-lg font-bold bg-white/5 border border-white/15 focus:border-cyan-400 focus:bg-cyan-500/5 rounded-xl text-white outline-none transition-all shadow-inner"
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={loading || otpCode.replace(/\s/g, '').length !== 6}
                        className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white shadow-lg shadow-cyan-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Code...</span>
                          </>
                        ) : (
                          <span>Verify &amp; Enter Platform</span>
                        )}
                      </button>

                      {/* Resend Cooldown */}
                      <div className="text-center text-xs text-gray-400">
                        {resendCooldown > 0 ? (
                          <span>Resend OTP in <strong className="text-white">{resendCooldown}s</strong></span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOtp()}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
                          >
                            Resend Verification Code
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Quick Switch & Terms */}
              <div className="pt-2 border-t border-white/10 text-center space-y-2">
                <p className="text-xs text-gray-400">
                  {mode === 'signin' ? (
                    <>
                      Don't have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('signup')}
                        className="font-bold text-purple-400 hover:text-purple-300 underline"
                      >
                        Sign Up now
                      </button>
                    </>
                  ) : (
                    <>
                      Already registered on NovaMind?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('signin')}
                        className="font-bold text-purple-400 hover:text-purple-300 underline"
                      >
                        Sign In here
                      </button>
                    </>
                  )}
                </p>

                <p className="text-[10px] text-gray-500 leading-relaxed">
                  By continuing, you agree to NovaMind's Terms of Service and Privacy Policy. All passwords are encrypted with bcrypt; Supabase identities are decoupled.
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/10 text-center text-xs text-gray-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-6xl w-full mx-auto">
        <div>
          NovaMind © 2026. Empowered by Google Gemini 3.8 Flash &amp; Gov Saathi.
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <button onClick={onNavigateHome} className="hover:text-white transition-colors">Platform Feed</button>
          <span>•</span>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">API Docs</a>
          <span>•</span>
          <a href="http://localhost:5000/api/gateway/status" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">System Telemetry</a>
        </div>
      </footer>
    </div>
  );
};
