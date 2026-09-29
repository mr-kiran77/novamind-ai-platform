import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Bot,
  Layers,
  Activity,
  Bookmark,
  Share2,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { IdeaCard } from './components/IdeaCard';
import { CollabModal } from './components/CollabModal';
import { CaptureModal } from './components/CaptureModal';
import { NovaDrawer } from './components/NovaDrawer';
import { IdeaJourneyModal } from './components/IdeaJourneyModal';
import { ShareModal } from './components/ShareModal';
import { DiscoverView } from './components/DiscoverView';
import { ModerationView } from './components/ModerationView';
import { ProfileModal } from './components/ProfileModal';
import { EditProfileModal } from './components/EditProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { CosmicIntro } from './components/CosmicIntro';
import { api } from './services/api';
import type { Idea, User } from './types';

const CATEGORIES = [
  'All',
  'CleanTech',
  'Biotech',
  'AI / ML',
  'Neurotech',
  'SpaceTech',
  'Robotics',
  'EdTech',
  'FinTech',
];

export function App() {
  const [currentTab, setCurrentTab] = useState<'feed' | 'discover' | 'trending' | 'moderation' | 'admin'>('feed');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlySaved, setOnlySaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Drawers state
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isNovaOpen, setIsNovaOpen] = useState(false);
  const [selectedIdeaForJourney, setSelectedIdeaForJourney] = useState<Idea | null>(null);
  const [selectedIdeaForCollab, setSelectedIdeaForCollab] = useState<Idea | null>(null);
  const [selectedIdeaForShare, setSelectedIdeaForShare] = useState<Idea | null>(null);

  // Profile, Settings & Auth Modals state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewProfileUsername, setViewProfileUsername] = useState<string | undefined>(undefined);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string>('account');
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'system'>('dark');

  // Auth Modal & Page Route State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin');
  const [currentRoute, setCurrentRoute] = useState<'app' | 'login' | 'signup'>('app');

  // Cinematic Website Intro Animation State
  const [showCosmicIntro, setShowCosmicIntro] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('intro') === 'true' || params.get('intro') === '1') return true;
    const hasSeenIntro = sessionStorage.getItem('novamind_intro_seen');
    return !hasSeenIntro;
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('novamind_intro_seen', 'true');
    setShowCosmicIntro(false);
  };

  const navigateTo = (route: 'app' | 'login' | 'signup') => {
    setCurrentRoute(route);
    if (route === 'login') {
      window.history.pushState({}, '', '/login');
    } else if (route === 'signup') {
      window.history.pushState({}, '', '/signup');
    } else {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toast notification
  const [toast, setToast] = useState<string | null>(null);

  // Active User State - Default to null so user ALWAYS sees the Login Page first on opening
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const isSessionActive = sessionStorage.getItem('novamind_session_active') === 'true';
      if (!isSessionActive) {
        return null;
      }
      const savedUser = localStorage.getItem('novamind_user') || sessionStorage.getItem('novamind_user');
      const token = localStorage.getItem('novamind_token') || sessionStorage.getItem('novamind_token');
      if (savedUser && token) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.warn('Could not parse stored session:', e);
    }
    return null;
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Theme application
  const applyTheme = (theme: 'dark' | 'light' | 'system') => {
    setCurrentTheme(theme);
    localStorage.setItem('novamind_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem('novamind_theme') as any) || 'dark';
    applyTheme(savedTheme);

    // Hydrate authenticated user session ONLY IF session is actively authenticated
    const isSessionActive = sessionStorage.getItem('novamind_session_active') === 'true';
    if (isSessionActive) {
      const savedUserStr = localStorage.getItem('novamind_user');
      const savedToken = localStorage.getItem('novamind_token');
      if (savedUserStr && savedToken) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.id) {
            setCurrentUser(parsed);
            api.setToken(savedToken);
          }
        } catch (e) {
          // ignore invalid saved user
        }
      }
    } else {
      setCurrentUser(null);
    }

    // Route synchronization: Default to Login page on initial open, and Landing page after authentication
    const syncRouteFromUrl = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const hasActiveSession = sessionStorage.getItem('novamind_session_active') === 'true';

      if (
        path === '/signup' ||
        path === '/register' ||
        hash === '#/signup' ||
        hash === '#/register' ||
        hash === '#signup' ||
        hash === '#register'
      ) {
        setCurrentRoute('signup');
      } else if (
        path === '/app' ||
        path === '/landing' ||
        path === '/dashboard' ||
        hash === '#/app' ||
        hash === '#landing'
      ) {
        if (hasActiveSession) {
          setCurrentRoute('app');
        } else {
          setCurrentRoute('login');
        }
      } else {
        // Root path '/' or '/login': Show Login page first if not actively authenticated, or Landing page if authenticated
        if (hasActiveSession) {
          setCurrentRoute('app');
        } else {
          setCurrentRoute('login');
        }
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    window.addEventListener('hashchange', syncRouteFromUrl);

    return () => {
      window.removeEventListener('popstate', syncRouteFromUrl);
      window.removeEventListener('hashchange', syncRouteFromUrl);
    };
  }, []);


  // Fetch Ideas
  const fetchIdeas = async (category?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getIdeas(category);
      if (data && data.ideas) {
        setIdeas(data.ideas);
      }
    } catch (err: any) {
      console.error('Failed to fetch ideas:', err);
      setError('Unable to load ideas from the backend server. Please verify the Python FastAPI backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas(selectedCategory);
  }, [selectedCategory]);

  const handleRoleSwitch = async (role: string) => {
    try {
      const res = await api.demoSwitch(role);
      if (res && res.user) {
        sessionStorage.setItem('novamind_session_active', 'true');
        setCurrentUser(res.user);
        if (res.access_token) {
          api.setToken(res.access_token);
          localStorage.setItem('novamind_token', res.access_token);
        }
        localStorage.setItem('novamind_user', JSON.stringify(res.user));
        showToast(`Switched persona to: ${res.user.display_name} (${res.user.role})`);
      }
    } catch (e) {
      let fallbackUser: User;
      if (role === 'moderator') {
        fallbackUser = {
          id: 'user_mod',
          username: 'alexvance',
          display_name: 'Alex Vance',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'moderator',
        };
      } else if (role === 'admin') {
        fallbackUser = {
          id: 'user_admin',
          username: 'sysadmin',
          display_name: 'Nova Admin',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          role: 'admin',
        };
      } else {
        fallbackUser = {
          id: 'user_1',
          username: 'drmayalin',
          display_name: 'Dr. Maya Lin',
          avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          role: 'user',
        };
      }
      sessionStorage.setItem('novamind_session_active', 'true');
      setCurrentUser(fallbackUser);
      localStorage.setItem('novamind_user', JSON.stringify(fallbackUser));
      showToast(`Switched active view role to: ${role}`);
    }
  };

  // Like Toggle
  const handleLike = async (ideaId: string) => {
    try {
      await api.likeIdea(ideaId);
      setIdeas(prev =>
        prev.map(i => {
          if (i.id === ideaId) {
            const isLiked = !i.is_liked;
            return {
              ...i,
              is_liked: isLiked,
              reaction_count: isLiked ? (i.reaction_count || 0) + 1 : Math.max(0, (i.reaction_count || 1) - 1),
            };
          }
          return i;
        })
      );
      showToast('❤️ Reaction recorded!');
    } catch (e: any) {
      showToast('❤️ Reaction recorded!');
    }
  };

  // Save / Bookmark Toggle
  const handleSave = async (ideaId: string) => {
    try {
      const res = await api.saveIdea(ideaId);
      const isSaved = res?.is_saved ?? true;
      setIdeas(prev =>
        prev.map(i => (i.id === ideaId ? { ...i, is_saved: isSaved } : i))
      );
      showToast(isSaved ? '🔖 Idea saved to your personal vault!' : 'Idea removed from saved vault.');
    } catch (e) {
      setIdeas(prev =>
        prev.map(i => (i.id === ideaId ? { ...i, is_saved: !i.is_saved } : i))
      );
      showToast('🔖 Saved status updated!');
    }
  };

  // Follow Toggle
  const handleFollow = async (userId: string) => {
    try {
      const res = await api.followUser(userId);
      const isFollowing = res?.is_following ?? true;
      setIdeas(prev =>
        prev.map(i => (i.user_id === userId ? { ...i, is_following_author: isFollowing } : i))
      );
      showToast(isFollowing ? '👤 Now following creator!' : 'Unfollowed creator.');
    } catch (e) {
      setIdeas(prev =>
        prev.map(i => (i.user_id === userId ? { ...i, is_following_author: !i.is_following_author } : i))
      );
      showToast('👤 Follow status updated!');
    }
  };

  const handleIdeaCreated = (newIdea: Idea) => {
    setIdeas(prev => [newIdea, ...prev]);
    showToast('✨ Idea successfully structured with Gemini 3.8 Flash!');
    setSelectedIdeaForJourney(newIdea);
  };

  const handleCollabSubmit = async (ideaId: string, role: string, pitch: string) => {
    try {
      await api.proposeCollaboration(ideaId, role, pitch);
      setIdeas(prev =>
        prev.map(i =>
          i.id === ideaId ? { ...i, collab_count: (i.collab_count || 0) + 1 } : i
        )
      );
      showToast('🤝 Collaboration offer sent to the host creator!');
    } catch (e: any) {
      showToast('Collaboration offer submitted for review!');
    }
  };

  // Filter ideas by search & saved state
  const filteredIdeas = ideas.filter(i => {
    if (onlySaved && !i.is_saved) return false;
    const q = searchQuery.toLowerCase();
    const matchTitle = i.title?.toLowerCase().includes(q);
    const matchSummary = i.structured_data?.one_line_summary?.toLowerCase().includes(q);
    const matchContent = i.raw_content?.toLowerCase().includes(q);
    const matchTag = (i.tags || []).some(t => t.toLowerCase().includes(q));
    return matchTitle || matchSummary || matchContent || matchTag;
  });

  // Dedicated Full-Screen Login & Sign Up Page Route View (Mandatory Auth Gate)
  if (!currentUser || currentRoute === 'login' || currentRoute === 'signup') {
    return (
      <div className="min-h-screen bg-[#07080d]">
        {showCosmicIntro && (
          <CosmicIntro onComplete={handleIntroComplete} />
        )}
        <LoginPage
          initialMode={currentRoute === 'signup' ? 'signup' : 'signin'}
          onSuccess={(user, token) => {
            sessionStorage.setItem('novamind_session_active', 'true');
            setCurrentUser(user);
            api.setToken(token);
            localStorage.setItem('novamind_user', JSON.stringify(user));
            localStorage.setItem('novamind_token', token);
            navigateTo('app');
            showToast(`✨ Welcome to NovaMind, ${user.display_name || user.username}!`);
          }}
          onNavigateHome={() => {
            if (currentUser) {
              navigateTo('app');
            } else {
              showToast('Please sign in or create an account to access the platform.');
            }
          }}
          onSwitchPersona={async (role) => {
            await handleRoleSwitch(role);
            navigateTo('app');
          }}
          onReplayIntro={() => setShowCosmicIntro(true)}
          isAuthenticated={!!currentUser}
        />
        {toast && (
          <div className="fixed top-20 right-6 z-50 bg-purple-600/90 border border-purple-400 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      {/* Cinematic Cosmic Website Intro Animation Overlay */}
      {showCosmicIntro && (
        <CosmicIntro onComplete={handleIntroComplete} />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-purple-600/90 border border-purple-400 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab: string) => setCurrentTab(tab as any)}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenNova={() => setIsNovaOpen(true)}
        currentUser={currentUser}
        onSwitchRole={handleRoleSwitch}
        onOpenProfile={() => {
          setViewProfileUsername(undefined);
          setIsProfileOpen(true);
        }}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenSettings={(tab?: string) => {
          setSettingsInitialTab(tab || 'account');
          setIsSettingsOpen(true);
        }}
        onLogout={() => {
          sessionStorage.removeItem('novamind_session_active');
          localStorage.removeItem('novamind_token');
          localStorage.removeItem('novamind_user');
          sessionStorage.removeItem('novamind_token');
          sessionStorage.removeItem('novamind_user');
          api.setToken('');
          setCurrentUser(null);
          showToast('👋 Logged out safely. Redirecting to login page...');
          navigateTo('login');
        }}
        onOpenAuth={(initialMode?: 'signin' | 'signup') => {
          navigateTo(initialMode === 'signup' ? 'signup' : 'login');
        }}
        onReplayIntro={() => setShowCosmicIntro(true)}
        currentTheme={currentTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6">
        {/* 1. DISCOVER VIEW */}
        {currentTab === 'discover' && (
          <DiscoverView
            onLike={handleLike}
            onComment={(ideaToComment) => setSelectedIdeaForJourney(ideaToComment)}
            onShare={(ideaToShare) => setSelectedIdeaForShare(ideaToShare)}
            onSave={handleSave}
            onFollow={handleFollow}
            onCollaborate={(ideaToCollab) => setSelectedIdeaForCollab(ideaToCollab)}
            onViewDetail={(ideaToView) => setSelectedIdeaForJourney(ideaToView)}
            allIdeas={ideas}
          />
        )}

        {/* 2. MODERATION VIEW */}
        {currentTab === 'moderation' && (
          <ModerationView
            currentUser={currentUser}
            onSwitchRole={handleRoleSwitch}
            onShowToast={showToast}
          />
        )}

        {/* 3. FEED / TRENDING VIEW */}
        {(currentTab === 'feed' || currentTab === 'trending') && (
          <>
            {/* HERO BANNER */}
            <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/60 via-[#101226]/80 to-cyan-950/40 border border-purple-500/20 shadow-2xl">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{currentTab === 'trending' ? '🔥 Trending Innovation Radar • Live Velocity Scoring' : 'SHIP TO BUILD WITH AI • Production Platform'}</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {currentTab === 'trending' ? (
                    <>
                      Breakthroughs With{' '}
                      <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                        Highest Momentum
                      </span>
                    </>
                  ) : (
                    <>
                      Turn Messy Ideas into{' '}
                      <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
                        Executable Blueprints
                      </span>
                    </>
                  )}
                </h1>

                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {currentTab === 'trending'
                    ? 'Explore innovation blueprints ranked by live velocity: constructive discussions, genuine collaborator applications, and verified community votes.'
                    : 'Capture napkin thoughts, voice memos, and raw concepts. Our 50-agent Gemini swarm transforms them into 22-field execution models with verified talent recruitment and government grant matching.'}
                </p>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button
                    onClick={() => setIsCaptureOpen(true)}
                    className="gradient-btn text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Capture Your Idea</span>
                  </button>
                  <button
                    onClick={() => setIsNovaOpen(true)}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <span>Chat with Nova Mentor</span>
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-xl font-black text-purple-300">{ideas.length || 12}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Live Blueprints</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-xl font-black text-cyan-300">50</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Active AI Agents</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-xl font-black text-pink-300">7-Stage</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Idea Pipeline</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-xl font-black text-amber-300">100%</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Privacy-First</div>
                </div>
              </div>
            </section>

            {/* FEED / EXPLORE VIEW */}
            <section className="space-y-4">
              {/* Search & Categories Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Category Pills & Saved Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setOnlySaved(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === cat && !onlySaved
                          ? 'gradient-btn text-white shadow-md shadow-purple-500/20'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}

                  {/* Saved Vault Filter Pill */}
                  <button
                    onClick={() => setOnlySaved(!onlySaved)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      onlySaved
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500 shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Saved Vault</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search blueprints, tech stack..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Error state */}
              {error && (
                <div className="bg-red-950/50 border border-red-500/30 text-red-200 text-xs p-4 rounded-2xl flex items-center justify-between">
                  <span>{error}</span>
                  <button
                    onClick={() => fetchIdeas(selectedCategory)}
                    className="px-3 py-1 bg-red-800/40 rounded-lg font-bold hover:bg-red-800/60"
                  >
                    Retry Connection
                  </button>
                </div>
              )}

              {/* Ideas Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                      key={i}
                      className="glass-panel h-64 rounded-2xl p-5 animate-pulse flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-24 h-4 bg-white/10 rounded-full" />
                        <div className="w-48 h-6 bg-white/10 rounded-lg" />
                        <div className="w-full h-16 bg-white/5 rounded-lg" />
                      </div>
                      <div className="w-full h-8 bg-white/5 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filteredIdeas.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center space-y-3 border-dashed border-white/10">
                  <Layers className="w-10 h-10 text-gray-500 mx-auto" />
                  <h3 className="font-bold text-base text-white">No Innovation Blueprints Found</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {onlySaved
                      ? "You haven't saved any ideas yet. Click the bookmark icon on any idea card to save it to your vault!"
                      : "Be the first to capture an idea in this domain and let Gemini structure it into a 22-field execution model."}
                  </p>
                  <button
                    onClick={() => setIsCaptureOpen(true)}
                    className="gradient-btn text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 mt-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Capture New Idea</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(currentTab === 'trending'
                    ? [...filteredIdeas].sort((a, b) => ((b.reaction_count || 0) * 3 + (b.view_count || 0) + (b.comment_count || 0) * 2) - ((a.reaction_count || 0) * 3 + (a.view_count || 0) + (a.comment_count || 0) * 2))
                    : filteredIdeas
                  ).map(idea => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      currentUser={currentUser}
                      onLike={handleLike}
                      onComment={(ideaToComment) => setSelectedIdeaForJourney(ideaToComment)}
                      onShare={(ideaToShare) => setSelectedIdeaForShare(ideaToShare)}
                      onSave={handleSave}
                      onFollow={handleFollow}
                      onCollaborate={(ideaToCollab) => setSelectedIdeaForCollab(ideaToCollab)}
                      onViewDetail={(ideaToView) => setSelectedIdeaForJourney(ideaToView)}
                      onViewProfile={(username) => {
                        setViewProfileUsername(username);
                        setIsProfileOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* 50-BOT ADMIN PANEL VIEW */}
        {currentTab === 'admin' && (
          <section className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">50-Autonomous Agent Innovation Swarm</h2>
                    <p className="text-xs text-gray-400">
                      Simulated synthetic innovators, stress-testers, academic peer reviewers, and angel scouts
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  50 Agents Operational
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-xs font-bold text-cyan-400">1. Domain Specialists (15)</div>
                  <p className="text-[11px] text-gray-400">BioTech, CleanTech, Quantum, Neurotech, Space Systems</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-xs font-bold text-purple-400">2. Devil's Advocates &amp; Risk Auditors (15)</div>
                  <p className="text-[11px] text-gray-400">Black swan detection, supply chain bottlenecks, safety checks</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-xs font-bold text-amber-400">3. Commercialization &amp; Angels (20)</div>
                  <p className="text-[11px] text-gray-400">Unit economics, grant eligibility, go-to-market speedruns</p>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                <span className="text-gray-400">FastAPI Agent Swarm Microservice:</span>
                <span className="font-mono text-cyan-300">http://localhost:8000/api/assistant/swarm</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* FLOATING NOVA ORB BUTTON */}
      <button
        onClick={() => setIsNovaOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl gradient-btn text-white shadow-2xl shadow-purple-500/40 hover:scale-110 active:scale-95 transition-all group flex items-center gap-2"
        title="Open Nova AI Innovation Mentor"
      >
        <Sparkles className="w-5 h-5 text-white animate-pulse" />
        <span className="text-xs font-bold hidden sm:inline">Ask Nova</span>
      </button>

      {/* MODALS */}
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onIdeaCreated={handleIdeaCreated}
      />

      <CollabModal
        idea={selectedIdeaForCollab}
        onClose={() => setSelectedIdeaForCollab(null)}
        onSubmit={handleCollabSubmit}
      />

      <IdeaJourneyModal
        idea={selectedIdeaForJourney}
        onClose={() => setSelectedIdeaForJourney(null)}
        onOpenNovaWithContext={(_idea) => {
          setSelectedIdeaForJourney(null);
          setIsNovaOpen(true);
        }}
        onOpenCollab={(ideaToCollab) => {
          setSelectedIdeaForCollab(ideaToCollab);
        }}
        currentUser={currentUser}
      />

      <ShareModal
        idea={selectedIdeaForShare}
        onClose={() => setSelectedIdeaForShare(null)}
      />

      <NovaDrawer
        isOpen={isNovaOpen}
        onClose={() => setIsNovaOpen(false)}
        activeIdea={selectedIdeaForJourney}
      />

      {/* User Profile View Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setViewProfileUsername(undefined);
        }}
        currentUser={currentUser}
        viewUsername={viewProfileUsername}
        onOpenEditProfile={() => {
          setIsProfileOpen(false);
          setIsEditProfileOpen(true);
        }}
        onViewIdeaDetail={(ideaToView) => {
          setIsProfileOpen(false);
          setSelectedIdeaForJourney(ideaToView);
        }}
        onFollowChange={(targetUserId) => {
          handleFollow(targetUserId);
        }}
      />

      {/* Edit Profile Details & Avatar Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
        }}
        showToast={showToast}
      />

      {/* Settings & Preferences Tabbed Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        initialTab={settingsInitialTab}
        onThemeChanged={applyTheme}
        showToast={showToast}
        onUserDeleted={() => {
          handleRoleSwitch('user');
        }}
      />

      {/* Modern Authentication Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user, token) => {
          setCurrentUser(user);
          api.setToken(token);
          localStorage.setItem('novamind_user', JSON.stringify(user));
          showToast(`Welcome back, ${user.display_name}!`);
        }}
        initialMode={authInitialMode}
      />
    </div>
  );
}

export default App;
