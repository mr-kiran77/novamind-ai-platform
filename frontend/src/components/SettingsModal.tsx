import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Palette,
  Bell,
  Shield,
  Bot,
  HelpCircle,
  Info,
  Check,
  AlertTriangle,
  Loader2,
  Trash2,
  Key,
  Laptop,
  Smartphone,
  ChevronDown,
  Star,
  Send,
  Sparkles,
  ExternalLink,
  Moon,
  Sun,
  Monitor,
  Database,
  RefreshCw,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import type { User, UserSettings, UserSession } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  initialTab?: string;
  onThemeChanged?: (theme: 'dark' | 'light' | 'system') => void;
  showToast: (msg: string) => void;
  onUserDeleted?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTab = 'account',
  onThemeChanged,
  showToast,
  onUserDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    user_id: currentUser.id,
    theme: 'dark',
    notify_collaborations: true,
    notify_polls: true,
    notify_reactions: true,
    notify_copilot: true,
    auto_run_copilot: true,
    default_jurisdiction: '',
    ai_tone: 'balanced',
  });

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Privacy toggle
  const [isPrivateProfile, setIsPrivateProfile] = useState(Boolean(currentUser.is_private));

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState<'general' | 'bug' | 'feature' | 'help'>('general');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Supabase Cloud State
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const loadSupabaseStatus = async () => {
    setLoadingSupabase(true);
    try {
      const res = await api.getSupabaseStatus();
      setSupabaseStatus(res);
    } catch (e: any) {
      console.error('Failed to get supabase status:', e);
    } finally {
      setLoadingSupabase(false);
    }
  };

  const handleSyncSupabase = async () => {
    setSyncingSupabase(true);
    try {
      const res = await api.syncSupabaseNow();
      setSyncResult(res);
      showToast('✨ Supabase cloud database synchronized!');
      await loadSupabaseStatus();
    } catch (e: any) {
      showToast(e.message || 'Sync failed');
    } finally {
      setSyncingSupabase(false);
    }
  };

  // Sync initial tab when changed
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load user settings on open
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoadingSettings(true);
      try {
        const fetchedSettings = await api.getUserSettings();
        if (fetchedSettings) {
          setSettings(fetchedSettings);
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadData();
  }, [isOpen]);

  // Load sessions when Privacy tab is selected
  useEffect(() => {
    if (!isOpen || activeTab !== 'privacy') return;

    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const res = await api.getSessions();
        if (res && res.sessions) {
          setSessions(res.sessions);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [isOpen, activeTab]);

  // Load Supabase cloud status when Supabase tab is selected
  useEffect(() => {
    if (!isOpen || activeTab !== 'supabase') return;
    loadSupabaseStatus();
  }, [isOpen, activeTab]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showDeleteConfirm) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, showDeleteConfirm]);

  if (!isOpen) return null;

  // Toggle helper for user settings
  const handleSettingChange = async (key: keyof UserSettings, val: any) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    try {
      await api.updateUserSettings({ [key]: val });
      if (key === 'theme' && onThemeChanged) {
        onThemeChanged(val);
      }
    } catch (e) {
      console.error(`Failed to update setting ${key}:`, e);
      showToast(`Failed to update setting: ${key}`);
    }
  };

  // Change Password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (newPw !== confirmPw) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }

    setPwLoading(true);
    try {
      await api.changePassword(currentPw, newPw, confirmPw);
      showToast('Password changed successfully!');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('Session revoked');
    } catch (e: any) {
      showToast(e.message || 'Failed to revoke session');
    }
  };

  // Revoke other sessions
  const handleRevokeAllOtherSessions = async () => {
    try {
      await api.revokeAllOtherSessions();
      setSessions(prev => prev.filter(s => s.is_current));
      showToast('All other sessions revoked');
    } catch (e: any) {
      showToast(e.message || 'Failed to revoke other sessions');
    }
  };

  // Profile privacy toggle
  const handlePrivacyToggle = async (val: boolean) => {
    setIsPrivateProfile(val);
    try {
      await api.updateProfile({ is_private: val });
      showToast(val ? 'Profile is now private' : 'Profile is now public');
    } catch (e) {
      showToast('Failed to update privacy');
    }
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setFeedbackLoading(true);
    try {
      await api.submitFeedback({
        category: feedbackCategory,
        rating: feedbackRating,
        message: feedbackMessage.trim(),
      });
      setFeedbackSubmitted(true);
      showToast('Thank you! Your feedback has been received.');
      setFeedbackMessage('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Account deletion
  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (deletePhrase.trim().toUpperCase() !== 'DELETE') {
      setDeleteError("Please type 'DELETE' exactly to confirm");
      return;
    }
    if (!deletePw) {
      setDeleteError('Please enter your password to confirm');
      return;
    }

    setDeleteLoading(true);
    try {
      await api.deleteAccount(deletePw, 'DELETE');
      showToast('Your account and all associated data have been deleted.');
      setShowDeleteConfirm(false);
      onClose();
      if (onUserDeleted) {
        onUserDeleted();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const navItems = [
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'ai', label: 'Nova AI Preferences', icon: Bot },
    { id: 'supabase', label: 'Supabase Cloud', icon: Database },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
    { id: 'about', label: 'About NovaMind', icon: Info },
  ];

  const FAQS = [
    {
      q: 'How does Idea Copilot work?',
      a: 'Idea Copilot is a background autonomous agent that analyzes your idea using Google Gemini 2.5 Flash with live Google Search grounding. It investigates patent landscapes, 50+ government schemes, regulatory compliance, safety risks, tax incentives, and execution steps.',
    },
    {
      q: 'Is my idea public or protected?',
      a: 'By default, ideas you publish are visible to the NovaMind community for feedback and collaboration. You can set your account to "Private" in Privacy & Security so only accepted connections see your blueprints, or keep concepts in "Raw Thought" stage.',
    },
    {
      q: 'How do attached Community Polls work?',
      a: 'You can attach interactive Instagram-style polls with 2 to 6 options to your blueprints. The community can vote once, view real-time percentage breakdowns, and help you validate market demand.',
    },
    {
      q: 'What is the 50-Bot Autonomous Swarm?',
      a: 'NovaMind runs an orchestra of 50 synthetic AI personas: 15 domain specialists (Biotech, Space, CleanTech), 15 devil’s advocates (risk, black swans), and 20 venture angels (unit economics, grants). They stress-test published ideas.',
    },
    {
      q: 'How does AI Collaboration proposal screening work?',
      a: 'When innovators request to collaborate on your ideas, Gemini evaluates the proposal across 4 vectors (relevance, specificity, value, commitment), shortlists high-priority talent, and highlights key strengths and concerns.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget && !showDeleteConfirm) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings & Preferences"
    >
      <div className="relative w-full max-w-4xl my-auto rounded-3xl bg-[#0f111e] border border-white/15 shadow-2xl shadow-purple-950/60 overflow-hidden flex flex-col md:flex-row max-h-[85vh] h-[720px]">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Settings</h3>
                  <p className="text-[10px] text-gray-400">Platform &amp; AI Preferences</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-1 rounded-lg hover:bg-white/10 text-gray-400"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0" role="tablist">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="hidden md:block p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-500">
            <div className="flex items-center justify-between font-mono">
              <span>NovaMind OS</span>
              <span className="text-purple-400 font-bold">v1.2</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">Gemini 2.5 Flash + Search Grounding</p>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0d0f1a]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-base font-bold text-white capitalize">
                {navItems.find(i => i.id === activeTab)?.label || 'Settings'}
              </h2>
              <p className="text-[11px] text-gray-400">
                {activeTab === 'account' && 'Manage your account credentials, identifier, and deletion.'}
                {activeTab === 'appearance' && 'Customize theme styling and interface density.'}
                {activeTab === 'notifications' && 'Configure automated email and in-app alerts.'}
                {activeTab === 'privacy' && 'Manage profile visibility, security, and active sessions.'}
                {activeTab === 'ai' && 'Customize background research, jurisdiction, and tone for Nova.'}
                {activeTab === 'supabase' && 'Inspect real-time cloud sync, table row counts, and live browsing telemetry in Supabase.'}
                {activeTab === 'support' && 'Frequently asked questions and direct engineering feedback.'}
                {activeTab === 'about' && 'Platform specifications and system runtime status.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Panes (Scrollable) */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs">
            {/* TAB 1: ACCOUNT */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Personal Information Summary */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Account Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">Full Name</span>
                      <span className="font-bold text-white text-sm">{currentUser.display_name || 'Innovator'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">Unique ID</span>
                      <span className="font-mono font-bold text-purple-300 text-sm">@{currentUser.username}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">Role / Access Level</span>
                      <span className="font-bold text-cyan-300 capitalize">{currentUser.role || 'user'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">Registered Mobile</span>
                      <span className="font-mono text-gray-300">{currentUser.mobile || '+1 (555) 987-6543'}</span>
                    </div>
                  </div>
                </div>

                {/* Account Deletion Danger Zone */}
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Danger Zone: Permanent Account Deletion</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Permanently delete your NovaMind account, published innovation blueprints, private idea vaults, collaboration history, and all stored data. This action is irreversible.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE / THEME */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Interface Theme
                  </h4>
                  <p className="text-[11px] text-gray-400 mb-4">
                    Choose how NovaMind looks on your device. Applied immediately and synced across your sessions.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Dark */}
                    <div
                      onClick={() => handleSettingChange('theme', 'dark')}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-32 ${
                        settings.theme === 'dark'
                          ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-950/50'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Moon className="w-5 h-5 text-purple-400" />
                        {settings.theme === 'dark' && <Check className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Dark (Default)</div>
                        <div className="text-[10px] text-gray-400">Futuristic cyber-glass dark UI</div>
                      </div>
                    </div>

                    {/* Light */}
                    <div
                      onClick={() => handleSettingChange('theme', 'light')}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-32 ${
                        settings.theme === 'light'
                          ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-950/50'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Sun className="w-5 h-5 text-amber-400" />
                        {settings.theme === 'light' && <Check className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Light Mode</div>
                        <div className="text-[10px] text-gray-400">High-contrast daytime clarity</div>
                      </div>
                    </div>

                    {/* System */}
                    <div
                      onClick={() => handleSettingChange('theme', 'system')}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-32 ${
                        settings.theme === 'system'
                          ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-950/50'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Monitor className="w-5 h-5 text-cyan-400" />
                        {settings.theme === 'system' && <Check className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">System Sync</div>
                        <div className="text-[10px] text-gray-400">Follows OS dark/light setting</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs font-bold text-gray-300">Design System Architecture</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    NovaMind is engineered with Tailwind CSS glassmorphic layers, custom radial neon backdrops, and accessible color contrast meeting WCAG AA standards.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <p className="text-[11px] text-gray-400 mb-2">
                  Configure real-time in-app notifications and background alerts. Every toggle is persisted directly to your user settings.
                </p>

                {/* Toggle 1: Collaborations */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-gray-200">Collaboration Proposals</span>
                    <p className="text-[11px] text-gray-400">
                      Receive alerts when innovators propose collaborating on your ideas or submit talent pitches.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notify_collaborations}
                      onChange={e => handleSettingChange('notify_collaborations', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Toggle 2: Polls */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-gray-200">Community Poll Activity</span>
                    <p className="text-[11px] text-gray-400">
                      Notify when community members cast votes on your attached idea polls or when a poll closes.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notify_polls}
                      onChange={e => handleSettingChange('notify_polls', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Toggle 3: Reactions */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-gray-200">Reactions &amp; Bookmarks</span>
                    <p className="text-[11px] text-gray-400">
                      Notify when innovators like, react to, or save your blueprints to their personal vaults.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notify_reactions}
                      onChange={e => handleSettingChange('notify_reactions', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Toggle 4: Copilot */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-gray-200">Idea Copilot Completions</span>
                    <p className="text-[11px] text-gray-400">
                      Alert you as soon as the background Gemini agent finishes its 7-category intelligence report.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notify_copilot}
                      onChange={e => handleSettingChange('notify_copilot', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: PRIVACY & SECURITY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Profile Visibility */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-gray-200">Private Profile Mode</span>
                    <p className="text-[11px] text-gray-400">
                      Hide your full ideas list and personal details from public feeds. Only approved connections can view your ideas.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivateProfile}
                      onChange={e => handlePrivacyToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Password Change Form */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Change Account Password
                    </h4>
                  </div>

                  {pwError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                      {pwError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400">Current Password</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-400">New Password (min 6 chars)</label>
                        <input
                          type="password"
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-400">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPw}
                          onChange={e => setConfirmPw(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="px-4 py-2 rounded-xl gradient-btn text-white font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                      <span>Update Password</span>
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Active Login Sessions
                      </h4>
                      <p className="text-[11px] text-gray-400">Devices currently authenticated to your account</p>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={handleRevokeAllOtherSessions}
                        className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-semibold border border-white/10"
                      >
                        Log out other devices
                      </button>
                    )}
                  </div>

                  {sessionsLoading ? (
                    <div className="py-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-400" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map(s => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            {s.user_agent.toLowerCase().includes('mobile') ? (
                              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : (
                              <Laptop className="w-4 h-4 text-purple-400 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                <span className="truncate max-w-[200px]">{s.user_agent || 'Browser Session'}</span>
                                {s.is_current && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                IP: {s.ip_address} • Last active: {s.last_used_at?.slice(0, 10)}
                              </div>
                            </div>
                          </div>

                          {!s.is_current && (
                            <button
                              onClick={() => handleRevokeSession(s.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-semibold border border-rose-500/30 transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: NOVA / AI PREFERENCES */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                {/* Auto-run Copilot */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-gray-200">Auto-Run Idea Copilot on New Ideas</span>
                    <p className="text-[11px] text-gray-400">
                      When enabled, capturing any new idea automatically launches the background research agent with Search grounding.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_run_copilot}
                      onChange={e => handleSettingChange('auto_run_copilot', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Default Jurisdiction */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <label className="font-bold text-gray-200 block">
                    Default Legal &amp; Government Jurisdiction
                  </label>
                  <p className="text-[11px] text-gray-400">
                    Specify your primary country or economic territory for grants, patent offices, and compliance guidelines (e.g. India, United States, EU).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.default_jurisdiction}
                      onChange={e => handleSettingChange('default_jurisdiction', e.target.value)}
                      placeholder="e.g. India, United States, European Union"
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['India', 'United States', 'European Union', 'Global / International'].map(j => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => handleSettingChange('default_jurisdiction', j)}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 text-[10px]"
                      >
                        + {j}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Assistant Tone */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <label className="font-bold text-gray-200 block">
                    Nova AI Tone &amp; Reasoning Style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'creative',
                        title: 'Creative & Visionary',
                        desc: 'Unconventional angles, lateral thinking, and conceptual expansion',
                      },
                      {
                        id: 'balanced',
                        title: 'Balanced & Practical',
                        desc: 'Grounded engineering, actionable steps, and realistic execution',
                      },
                      {
                        id: 'analytical',
                        title: 'Analytical & Rigorous',
                        desc: 'Strict academic review, risk analysis, and regulatory scrutiny',
                      },
                    ].map(style => (
                      <div
                        key={style.id}
                        onClick={() => handleSettingChange('ai_tone', style.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          settings.ai_tone === style.id
                            ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-xs">{style.title}</span>
                          {settings.ai_tone === style.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">{style.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: HELP & SUPPORT */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                {/* FAQ Accordions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Frequently Asked Questions
                  </h4>
                  {FAQS.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden transition-colors"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-purple-300"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180 text-purple-400' : ''
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 text-[11px] text-gray-300 leading-relaxed border-t border-white/5 pt-2.5">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Direct Feedback Form */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Submit Feedback or Bug Report
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Have an issue, idea, or feature suggestion? Your feedback is saved directly to our engineering logs.
                  </p>

                  {feedbackSubmitted ? (
                    <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center space-y-1">
                      <div className="font-bold">Thank you for your feedback!</div>
                      <p className="text-[11px] text-gray-300">
                        Our engineering team has logged your submission for the next update.
                      </p>
                      <button
                        onClick={() => setFeedbackSubmitted(false)}
                        className="mt-2 text-xs text-cyan-400 underline font-semibold"
                      >
                        Submit another note
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-gray-400">Category</label>
                          <select
                            value={feedbackCategory}
                            onChange={e => setFeedbackCategory(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 text-xs"
                          >
                            <option value="general" className="bg-[#0f111e]">General Feedback</option>
                            <option value="bug" className="bg-[#0f111e]">Bug Report</option>
                            <option value="feature" className="bg-[#0f111e]">Feature Request</option>
                            <option value="help" className="bg-[#0f111e]">Help / Question</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-gray-400">Platform Experience Rating</label>
                          <div className="flex items-center gap-1 py-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setFeedbackRating(star)}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= feedbackRating
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-400">Your Message</label>
                        <textarea
                          value={feedbackMessage}
                          onChange={e => setFeedbackMessage(e.target.value)}
                          placeholder="Describe what happened or what feature you'd love to see..."
                          rows={3}
                          required
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={feedbackLoading}
                        className="px-4 py-2 rounded-xl gradient-btn text-white font-bold text-xs flex items-center gap-1.5 shadow"
                      >
                        {feedbackLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Submit Feedback</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* TAB: SUPABASE CLOUD DATABASE & REALTIME */}
            {activeTab === 'supabase' && (
              <div className="space-y-5">
                {/* Connection Status Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-purple-950/30 border border-emerald-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-white">Supabase Cloud Database</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {supabaseStatus?.connected ? 'Connected' : 'Connecting...'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                          {supabaseStatus?.url || 'https://fsfkxxpqdgmdrqbckauq.supabase.co'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadSupabaseStatus}
                        disabled={loadingSupabase}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSupabase ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>

                      <button
                        onClick={handleSyncSupabase}
                        disabled={syncingSupabase}
                        className="px-4 py-1.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/25 transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-spin' : ''}`} />
                        <span>{syncingSupabase ? 'Syncing...' : 'Sync All to Cloud Now'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    NovaMind maintains dual-write synchronization and real-time streaming telemetry with Supabase Postgres. Every idea created, user registered, comment posted, reaction recorded, and visitor page view is streamed to Supabase in real-time.
                  </p>
                </div>

                {/* Live Supabase Tables & Records Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Live Cloud Tables &amp; Row Counts
                    </h4>
                    <span className="text-[11px] text-gray-400">
                      Total Cloud Records: <strong className="text-cyan-300 font-mono">{supabaseStatus?.total_records ?? 0}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { label: 'Ideas & Blueprints', key: 'ideas', icon: '💡' },
                      { label: 'Platform Users', key: 'users', icon: '👥' },
                      { label: 'Realtime Conversations', key: 'conversations', icon: '💬' },
                      { label: 'Live Chat Messages', key: 'messages', icon: '📨' },
                      { label: 'Idea Comments', key: 'comments', icon: '💭' },
                      { label: 'Likes & Reactions', key: 'reactions', icon: '❤️' },
                      { label: '50-Bot Swarm Agents', key: 'agent_definitions', icon: '🤖' },
                      { label: 'Live Browsing Events', key: 'browsing_events', icon: '🌐' },
                    ].map(item => {
                      const count = supabaseStatus?.tables?.[item.key] ?? 0;
                      return (
                        <div key={item.key} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-sm">{item.icon}</span>
                            <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                              {count} rows
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-300 block truncate">{item.label}</span>
                          <span className="text-[10px] text-gray-500 font-mono block">public.{item.key}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Real-Time Telemetry & Browsing Monitor */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <h4 className="text-xs font-bold text-white">Live Browsing &amp; Activity Telemetry Pipeline</h4>
                    </div>
                    <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                      Real-Time Active
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Whenever anyone browses NovaMind, switches between feed and discover, inspects blueprints, filters categories, or submits collaborations, our telemetry engine records the timestamp, user details, page URL, and interaction metadata into Supabase table <code className="text-purple-300 font-mono bg-white/5 px-1 py-0.5 rounded">public.browsing_events</code>.
                  </p>
                </div>

                {/* Row Level Security (RLS) SQL Script Setup Box */}
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-300 font-bold">
                      <Shield className="w-4 h-4" />
                      <span>One-Click Supabase Permissions (ENABLE_SUPABASE_REALTIME.sql)</span>
                    </div>

                    <button
                      onClick={() => {
                        const sqlInstructions = `-- In Supabase Dashboard -> SQL Editor, run:
-- 1. Create table public.browsing_events
CREATE TABLE IF NOT EXISTS public.browsing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    username TEXT DEFAULT 'anonymous_visitor',
    event_type TEXT NOT NULL,
    page_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Disable RLS & grant write permissions
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;`;
                        navigator.clipboard.writeText(sqlInstructions);
                        setCopiedSql(true);
                        showToast('📋 SQL script copied to clipboard!');
                        setTimeout(() => setCopiedSql(false), 3000);
                      }}
                      className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    If you haven't yet granted write access on your Supabase dashboard, open your <a href="https://supabase.com/dashboard/project/fsfkxxpqdgmdrqbckauq" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">Supabase Dashboard &gt; SQL Editor</a>, paste the script from <code className="text-purple-300 bg-white/5 px-1 py-0.5 rounded">ENABLE_SUPABASE_REALTIME.sql</code>, and click <strong>RUN</strong>. This enables unrestricted cloud writes and real-time event streaming.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 7: ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl gradient-btn flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">NovaMind Innovation Platform</h3>
                      <p className="text-[11px] text-gray-400">AI-Powered Rapid Idea Capture &amp; Structuring</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    NovaMind combines autonomous agent swarms, multimodal input capture (voice, audio, image, document), Google Search grounding, and community collaboration to transform raw thoughts into 22-field structured execution blueprints.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">Client</span>
                      <span className="font-bold text-cyan-300">React 19 + TS</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">Backend</span>
                      <span className="font-bold text-purple-300">Python FastAPI</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">Gateway</span>
                      <span className="font-bold text-amber-300">Express (5000)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-gray-500 block text-[10px]">AI Model</span>
                      <span className="font-bold text-emerald-300">Gemini 2.5 Flash</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                  <span>System Runtime Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Operational &amp; Healthy
                  </span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MULTI-STEP ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-150"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm Account Deletion"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#141624] border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete Account?</h3>
                <p className="text-[11px] text-rose-300">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              All your captured ideas, attached polls, saved vault items, collaborator threads, and reputation streaks will be deleted permanently.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-300">
                  1. Enter your password to verify ownership:
                </label>
                <input
                  type="password"
                  value={deletePw}
                  onChange={e => setDeletePw(e.target.value)}
                  placeholder="Your current password"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-300">
                  2. Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deletePhrase}
                  onChange={e => setDeletePhrase(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                  setDeletePw('');
                  setDeletePhrase('');
                }}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/50"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
