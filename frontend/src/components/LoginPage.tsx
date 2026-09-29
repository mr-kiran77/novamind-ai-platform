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
  Check,
  Zap,
  MessageSquare,
  PhoneCall,
  Smartphone,
  AtSign,
  X,
  HelpCircle,
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
  onReplayIntro?: () => void;
  isAuthenticated?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMode = 'signin',
  onSuccess,
  onNavigateHome,
  onSwitchPersona,
  onReplayIntro,
  isAuthenticated = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Sign In Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signInWithOtp, setSignInWithOtp] = useState(false);

  // New User Onboarding (Sign Up) States
  const [mobile, setMobile] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'call'>('whatsapp');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Pop-up Modal State for New User Identity & Password Creation
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 6-digit OTP input refs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const usernameCheckTimeout = useRef<any>(null);

  // Sync mode if initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Handle switching between Sign In & Create Account
  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setIsForgotPassword(false);
    setIsOtpSent(false);
    setSignInWithOtp(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpCode('');
  };

  // Cooldown countdown timer
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

  // Debounced live username availability check
  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setCustomUsername(clean);

    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    if (!clean || clean.length < 3) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }

    setUsernameStatus('checking');
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const res = await api.checkUsername(clean);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus('taken');
          setUsernameSuggestions(res.suggestions || []);
        }
      } catch (err) {
        setUsernameStatus('idle');
      }
    }, 400);
  };

  // Auto-generate persona / suggest unique ID
  const handleAutoSuggestPersona = async () => {
    try {
      const persona = await api.suggestPersona();
      setCustomUsername(persona.username);
      setUsernameStatus('available');
      if (!fullName) setFullName(persona.display_name);
    } catch (e) {
      const fallback = `novadev_${Math.floor(1000 + Math.random() * 9000)}`;
      setCustomUsername(fallback);
      setUsernameStatus('available');
    }
  };

  // 1. Existing User: Sign In with Universal Identifier (ID, Email, or Phone) + Password
  const handleUniversalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setErrorMessage('Please enter your NovaMind ID (@username), Email, or Mobile number.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.loginWithCredentials(identifier, loginPassword);
      if (rememberMe) {
        localStorage.setItem('novamind_token', res.access_token);
        localStorage.setItem('novamind_user', JSON.stringify(res.user));
      } else {
        sessionStorage.setItem('novamind_token', res.access_token);
        sessionStorage.setItem('novamind_user', JSON.stringify(res.user));
      }
      api.setToken(res.access_token);
      setSuccessMessage(`Welcome back, ${res.user.display_name || res.user.username}! Redirecting to portal...`);
      setTimeout(() => {
        onSuccess(res.user, res.access_token);
      }, 700);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('No account found') || msg.includes('not found')) {
        setErrorMessage(`No account found for "${identifier}". If you are new to NovaMind, please choose "Create Account".`);
      } else if (msg.includes('Incorrect password')) {
        setErrorMessage('Incorrect password. Please verify and try again, or click "Forgot Password".');
      } else if (msg.includes('suspended') || msg.includes('banned')) {
        setErrorMessage('This account has been suspended by administration.');
      } else {
        setErrorMessage(msg || 'Sign in failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. New User / OTP Mode: Send OTP via WhatsApp, SMS, or Voice Call
  const handleSendOtp = async (e?: React.FormEvent, selectedChannel?: 'whatsapp' | 'sms' | 'call') => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const ch = selectedChannel || channel;
    const { normalized, error: phoneErr } = normalizeIndianMobile(mobile);
    if (phoneErr) {
      setErrorMessage(phoneErr);
      return;
    }

    try {
      setLoading(true);
      const res = await api.sendPhoneOtp(normalized, ch);
      setIsOtpSent(true);
      setDevCodeHint(res.dev_code_hint || '123456');
      
      const channelLabel = ch === 'whatsapp' ? 'WhatsApp' : ch === 'call' ? 'Voice Call' : 'SMS';
      setSuccessMessage(`OTP verification code dispatched via ${channelLabel} to ${normalized}`);
      handleStartCooldown();

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch OTP. Please verify your mobile number.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).replace(/\s/g, '');
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    const { normalized, error: phoneErr } = normalizeIndianMobile(mobile);
    if (phoneErr) {
      setErrorMessage(phoneErr);
      return;
    }

    try {
      setLoading(true);

      // If user is doing Instant Phone Sign In (existing user)
      if (signInWithOtp) {
        const res = await api.verifyPhoneSignIn(normalized, code);
        api.setToken(res.access_token);
        if (rememberMe) {
          localStorage.setItem('novamind_token', res.access_token);
          localStorage.setItem('novamind_user', JSON.stringify(res.user));
        }
        setSuccessMessage('Mobile verified! Entering NovaMind...');
        setTimeout(() => {
          onSuccess(res.user, res.access_token);
        }, 700);
        return;
      }

      // New User Flow: Validate OTP ownership, then show the Identity & Password Creation Pop-up Modal!
      await api.verifyOtpOnly(normalized, code);
      setSuccessMessage('Mobile ownership confirmed! Now create your NovaMind ID & Password.');
      
      // Auto-suggest a starter username if not set yet
      if (!customUsername) {
        const base = `user_${normalized.slice(-4)}`;
        setCustomUsername(base);
        setUsernameStatus('checking');
        api.checkUsername(base).then((res) => {
          setUsernameStatus(res.available ? 'available' : 'taken');
        });
      }

      // Open the Pop-up Modal!
      setIsIdModalOpen(true);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('No account')) {
        setErrorMessage('No account found with this mobile number. Please click "Create Account" to register.');
      } else if (msg.includes('Invalid') || msg.includes('Incorrect') || msg.includes('expired')) {
        setErrorMessage('Invalid or expired OTP code. Please enter the valid 6-digit code or request a new one.');
      } else {
        setErrorMessage(msg || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. Step 3: Complete Registration from the Pop-up Modal
  const handleCompleteRegistrationModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameErr = validateFullName(fullName);
    if (nameErr) {
      setErrorMessage(nameErr);
      return;
    }

    const cleanUser = customUsername.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage('Please create a valid NovaMind ID with at least 3 letters, numbers, or underscores.');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMessage(`NovaMind ID '@${cleanUser}' is already taken. Please choose another.`);
      return;
    }

    if (email.trim()) {
      const emailErr = validateEmail(email.trim());
      if (emailErr) {
        setErrorMessage(emailErr);
        return;
      }
    }

    const pwCheck = checkPasswordRequirements(signupPassword);
    if (!pwCheck.isValid) {
      setErrorMessage('Password does not satisfy the security requirements (8+ chars, upper, lower, digit, symbol).');
      return;
    }

    if (signupPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter confirm password.');
      return;
    }

    const { normalized } = normalizeIndianMobile(mobile);
    const code = otpCode.replace(/\s/g, '');

    try {
      setModalLoading(true);
      const res = await api.verifyPhoneSignUp({
        mobile: normalized,
        otp_code: code,
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        username: cleanUser,
        password: signupPassword,
      });

      api.setToken(res.access_token);
      localStorage.setItem('novamind_token', res.access_token);
      localStorage.setItem('novamind_user', JSON.stringify(res.user));

      setSuccessMessage('🎉 Identity created successfully! Welcome to NovaMind.');
      setIsIdModalOpen(false);

      setTimeout(() => {
        onSuccess(res.user, res.access_token);
      }, 700);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('taken')) {
        setErrorMessage(msg);
      } else {
        setErrorMessage(msg || 'Failed to complete registration. Please check your inputs.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // 5. Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailErr = validateEmail(forgotEmail);
    if (emailErr) {
      setErrorMessage(emailErr);
      return;
    }

    try {
      setLoading(true);
      const res = await api.forgotPassword(forgotEmail);
      setSuccessMessage(res.message || 'Password reset link sent to your registered email.');
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

  // Password evaluation for Modal
  const modalPwCheck = checkPasswordRequirements(signupPassword);
  const modalPwStrength = calculatePasswordStrength(signupPassword);
  const modalPasswordsMatch = confirmPassword.length > 0 ? signupPassword === confirmPassword : true;

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[25%] w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 lg:px-12 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-[#0a0b12]/70 z-20">
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

        <div className="flex items-center gap-2.5">
          {onReplayIntro && (
            <button
              onClick={onReplayIntro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all shadow-sm"
              title="Watch Futuristic Cosmic Intro Animation"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">Cosmic Intro</span>
            </button>
          )}

          {isAuthenticated ? (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Feed</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-purple-300/80 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline font-medium">Authentication Gate Active</span>
            </div>
          )}
        </div>
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
              Verify your mobile, create your unique NovaMind ID, and access our 50-agent Gemini swarm to structure ideas into 22-field execution roadmaps.
            </p>

            {/* Feature Points */}
            <div className="space-y-3.5 pt-1">
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
                  <h4 className="text-xs font-bold text-white">Multi-Channel OTP Verification</h4>
                  <p className="text-[11px] text-gray-400">Instant code delivery via WhatsApp, SMS, or automated voice call.</p>
                </div>
              </div>
            </div>

            {/* Quick Evaluator Personas */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span> Quick Evaluator Personas
                </span>
                <span className="text-[10px] text-purple-300/80">1-Click Fast Pass</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Evaluating the project? Click below to instantly log in as a ready persona:
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
            <div className="w-full max-w-md bg-[#121422]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
              
              {/* Card Mode Tabs: Sign In vs Create Account */}
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
                    ? (signInWithOtp ? 'Sign In via Mobile OTP' : 'Sign In to NovaMind')
                    : 'Authorize Mobile & Join'}
                </h2>
                <p className="text-xs text-gray-400">
                  {isForgotPassword
                    ? 'Enter your registered email to receive password recovery instructions.'
                    : mode === 'signin'
                    ? (signInWithOtp
                        ? 'Enter your registered mobile to sign in without a password.'
                        : 'Enter your unique ID, email, or mobile number and password.')
                    : 'Verify your phone via WhatsApp, SMS, or Voice Call to create your custom ID.'}
                </p>
              </div>

              {/* Alerts / Feedback */}
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

              {/* ------------------- VIEW A: FORGOT PASSWORD ------------------- */}
              {isForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Registered Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
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
                        <span>Sending Instructions...</span>
                      </>
                    ) : (
                      <span>Send Recovery Instructions</span>
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
              ) : mode === 'signin' && !signInWithOtp ? (
                /* ------------------- VIEW B: UNIVERSAL SIGN IN (ID / EMAIL / PHONE + PASSWORD) ------------------- */
                <form onSubmit={handleUniversalSignIn} className="space-y-4">
                  
                  {/* Universal Identifier Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span>NovaMind ID, Email, or Mobile</span>
                      <span className="text-[10px] text-purple-300/80">Universal</span>
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="@username, email, or +91 mobile"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-300">Password</label>
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Instant OTP switch */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-0"
                      />
                      <span>Remember Me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setSignInWithOtp(true);
                        setIsOtpSent(false);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium flex items-center gap-1"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Use Phone OTP</span>
                    </button>
                  </div>

                  {/* Sign In Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-xs font-bold gradient-btn text-white shadow-lg shadow-purple-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <span>Sign In to NovaMind</span>
                    )}
                  </button>
                </form>
              ) : (
                /* ------------------- VIEW C: NEW USER REGISTRATION / PHONE OTP ONBOARDING ------------------- */
                <div className="space-y-4">
                  {!isOtpSent ? (
                    <form onSubmit={(e) => handleSendOtp(e)} className="space-y-4">
                      
                      {/* Indian Mobile Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                          <span>Authorized Mobile Number</span>
                          <span className="text-[10px] text-cyan-400">10-Digit Mobile</span>
                        </label>
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

                      {/* Delivery Channel Picker: WhatsApp, SMS, or Voice Call */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-300">
                          Receive 6-Digit OTP via:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setChannel('whatsapp')}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all ${
                              channel === 'whatsapp'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setChannel('sms')}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all ${
                              channel === 'sms'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                            }`}
                          >
                            <Smartphone className="w-4 h-4 text-cyan-400" />
                            <span>SMS Text</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setChannel('call')}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all ${
                              channel === 'call'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                            }`}
                          >
                            <PhoneCall className="w-4 h-4 text-amber-400" />
                            <span>Voice Call</span>
                          </button>
                        </div>
                      </div>

                      {/* Return to Password Login if in OTP sign in mode */}
                      {signInWithOtp && (
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => setSignInWithOtp(false)}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            Sign In with Password instead
                          </button>
                        </div>
                      )}

                      {/* Submit Send OTP */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Connecting Provider...</span>
                          </>
                        ) : (
                          <span>Send Verification OTP</span>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* ------------------- STEP 2: 6-DIGIT OTP VERIFICATION ------------------- */
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">
                          Dispatched via <strong className="text-cyan-300 uppercase">{channel}</strong> to <strong className="text-white">{mobile}</strong>
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
                          Change mobile
                        </button>
                      </div>

                      {/* Fast-Pass Dev Hint for Evaluators */}
                      {devCodeHint && (
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span>💡 Instant Test Code:</span>
                            <span className="font-mono font-bold text-white bg-purple-600/40 px-2 py-0.5 rounded">
                              {devCodeHint}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOtpCode(devCodeHint);
                              handleVerifyOtp(devCodeHint);
                            }}
                            className="text-[11px] text-cyan-400 hover:underline font-semibold"
                          >
                            Auto-Fill &amp; Verify
                          </button>
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

                      {/* Verify Button */}
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
                          <span>{signInWithOtp ? 'Verify & Enter Platform' : 'Verify & Setup Your ID →'}</span>
                        )}
                      </button>

                      {/* Resend Cooldown & Channel Switcher */}
                      <div className="text-center text-xs text-gray-400 space-y-1.5 pt-1">
                        {resendCooldown > 0 ? (
                          <p>Resend available in <strong className="text-white">{resendCooldown}s</strong></p>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSendOtp(undefined, 'whatsapp')}
                              className="text-emerald-400 hover:underline font-semibold"
                            >
                              Resend on WhatsApp
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleSendOtp(undefined, 'sms')}
                              className="text-cyan-400 hover:underline font-semibold"
                            >
                              Resend SMS
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleSendOtp(undefined, 'call')}
                              className="text-amber-400 hover:underline font-semibold"
                            >
                              Call Me
                            </button>
                          </div>
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
                      New to NovaMind?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('signup')}
                        className="font-bold text-purple-400 hover:text-purple-300 underline"
                      >
                        Create an Account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('signin')}
                        className="font-bold text-purple-400 hover:text-purple-300 underline"
                      >
                        Sign In with ID &amp; Password
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

      {/* ------------------- STEP 3: THE POP-UP MODAL (CREATE ID & PASSWORD) ------------------- */}
      {isIdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#101222] border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-white">
            
            {/* Modal Close Button */}
            <button
              onClick={() => setIsIdModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mobile Verified: {mobile}</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white">
                Create Your NovaMind Identity
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Choose your custom NovaMind ID (`@username`) and create a secure password to unlock full access to the innovation feed and AI copilot.
              </p>
            </div>

            {/* Error in modal */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Form inside Pop-up */}
            <form onSubmit={handleCompleteRegistrationModal} className="space-y-4">
              
              {/* Field 1: Custom NovaMind ID / Username */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-1">
                    <span>Your Unique NovaMind ID</span>
                    <span className="text-[10px] text-purple-300">(Login ID)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSuggestPersona}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Suggest ID</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-xs font-bold text-purple-400">@</div>
                  <input
                    type="text"
                    required
                    value={customUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="my_innovator_id"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-28 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                  />
                  <div className="absolute right-3 top-2.5 flex items-center">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                    )}
                    {usernameStatus === 'available' && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="text-[10px] font-bold text-red-400">Taken</span>
                    )}
                  </div>
                </div>

                {/* Suggestions if username is taken */}
                {usernameSuggestions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] text-gray-400">
                    <span>Try:</span>
                    {usernameSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setCustomUsername(sug);
                          setUsernameStatus('available');
                          setUsernameSuggestions([]);
                        }}
                        className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Field 2: Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-200">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                  />
                </div>
              </div>

              {/* Field 3: Email Address (Optional for notifications/recovery) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-200 flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aarav@domain.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                  />
                </div>
              </div>

              {/* Field 4: Password with Live Strength */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-200">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Checklist & Bar in Pop-up */}
              {signupPassword.length > 0 && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-gray-400">Strength:</span>
                    <span className={
                      modalPwStrength.label === 'Weak' ? 'text-red-400' :
                      modalPwStrength.label === 'Fair' ? 'text-amber-400' :
                      modalPwStrength.label === 'Good' ? 'text-blue-400' : 'text-emerald-400'
                    }>
                      {modalPwStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        modalPwStrength.label === 'Weak' ? 'w-1/4 bg-red-500' :
                        modalPwStrength.label === 'Fair' ? 'w-2/4 bg-amber-500' :
                        modalPwStrength.label === 'Good' ? 'w-3/4 bg-blue-500' : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400 pt-1">
                    <span className={modalPwCheck.minLength ? 'text-emerald-400' : ''}>• 8+ chars</span>
                    <span className={modalPwCheck.hasUpper ? 'text-emerald-400' : ''}>• Uppercase</span>
                    <span className={modalPwCheck.hasLower ? 'text-emerald-400' : ''}>• Lowercase</span>
                    <span className={modalPwCheck.hasNumber ? 'text-emerald-400' : ''}>• Number</span>
                    <span className={`col-span-2 ${modalPwCheck.hasSpecial ? 'text-emerald-400' : ''}`}>• Special symbol (!@#$)</span>
                  </div>
                </div>
              )}

              {/* Field 5: Confirm Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-200">Confirm Password</label>
                  {confirmPassword.length > 0 && (
                    <span className={`text-[10px] font-semibold ${modalPasswordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                      {modalPasswordsMatch ? '✓ Passwords match' : '✗ Do not match'}
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

              {/* Final Submit Button in Modal */}
              <button
                type="submit"
                disabled={modalLoading || usernameStatus === 'taken' || !modalPwCheck.isValid || !modalPasswordsMatch}
                className="w-full py-3.5 rounded-xl text-xs font-bold gradient-btn text-white shadow-lg shadow-purple-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {modalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Your Identity...</span>
                  </>
                ) : (
                  <span>Complete Setup &amp; Access NovaMind 🚀</span>
                )}
              </button>
            </form>

          </div>
        </div>
      )}

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
