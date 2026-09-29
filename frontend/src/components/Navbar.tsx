import React from 'react';
import { Sparkles, Bot, Settings, Flame, Compass, Shield } from 'lucide-react';
import { ProfilePopover } from './ProfilePopover';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCapture: () => void;
  onOpenNova: () => void;
  currentUser: any;
  onSwitchRole: (role: string) => void;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenSettings: (initialTab?: string) => void;
  onLogout: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onReplayIntro?: () => void;
  currentTheme?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenCapture,
  onOpenNova,
  currentUser,
  onSwitchRole,
  onOpenProfile,
  onOpenEditProfile,
  onOpenSettings,
  onLogout,
  onOpenAuth,
  onReplayIntro,
  currentTheme = 'dark',
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0b10]/80 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setCurrentTab('feed')}
        >
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-white shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                NOVAMIND
              </span>
              <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                React + TS
              </span>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block">AI Innovation &amp; Structuring Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1">
          <button
            onClick={() => setCurrentTab('feed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'feed'
                ? 'text-purple-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🌟 Feed
          </button>
          <button
            onClick={() => setCurrentTab('discover')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'discover'
                ? 'text-cyan-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Discover
          </button>
          <button
            onClick={() => setCurrentTab('trending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'trending'
                ? 'text-amber-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Trending
          </button>
          <button
            onClick={() => setCurrentTab('moderation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'moderation'
                ? 'text-amber-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Moderation
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentTab === 'admin'
                ? 'text-purple-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-purple-400" />
            50-Bot Admin
          </button>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNova}
            className="hidden sm:flex items-center gap-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 px-3 py-2 rounded-xl transition-all"
            title="Open Nova AI Mentor"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Nova AI</span>
          </button>

          <button
            onClick={onOpenCapture}
            className="gradient-btn text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Capture Idea</span>
          </button>

          {/* Quick Demo Role Selector (for evaluators & judges) */}
          <div className="relative group hidden sm:block">
            <button
              className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2.5 py-2 rounded-xl transition-colors"
              title="Quick Persona Switcher for Hackathon Evaluation"
            >
              <span className="text-xs">🎭</span>
              <span className="text-[11px] font-semibold">Demo</span>
              <span className="text-[9px] text-gray-400">▼</span>
            </button>
            <div className="absolute right-0 mt-1 w-44 bg-[#141624] border border-white/15 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 text-xs">
              <div className="text-[10px] text-gray-500 px-2 py-1 font-bold uppercase">Quick Switch:</div>
              <button
                onClick={() => onSwitchRole('user')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-gray-200"
              >
                <span>Dr. Maya Lin (User)</span>
                <span>⚡</span>
              </button>
              <button
                onClick={() => onSwitchRole('moderator')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-amber-300"
              >
                <span>Alex Vance (Mod)</span>
                <span>🛡️</span>
              </button>
              <button
                onClick={() => onSwitchRole('admin')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-cyan-300"
              >
                <span>SysAdmin (Admin)</span>
                <span>👑</span>
              </button>
              <div className="border-t border-white/10 my-1"></div>
              <button
                onClick={() => onOpenAuth?.('signin')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-500/20 flex items-center justify-between text-purple-300 font-semibold"
              >
                <span>🔑 Open Login Page</span>
                <span>↗</span>
              </button>
              {onReplayIntro && (
                <button
                  onClick={onReplayIntro}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-indigo-500/20 flex items-center justify-between text-indigo-300 font-semibold"
                >
                  <span>🌌 Cinematic Intro</span>
                  <span>✨</span>
                </button>
              )}
            </div>
          </div>

          {/* Replay Intro Animation Button */}
          {onReplayIntro && (
            <button
              onClick={onReplayIntro}
              className="hidden lg:flex items-center gap-1.5 text-xs bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded-xl transition-all shadow-sm"
              title="Replay Futuristic Cosmic Intro Animation"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="font-semibold">Intro</span>
            </button>
          )}

          {/* Direct Login Page Button */}
          <button
            onClick={() => onOpenAuth?.('signin')}
            className="hidden md:flex items-center gap-1.5 text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 px-3 py-2 rounded-xl transition-all"
            title="Open Dedicated Sign In / Login Page (/login)"
          >
            <span>🔑</span>
            <span className="font-semibold">Login Page</span>
          </button>

          {/* Top-Right Accessible Profile Avatar & Popover Menu or Sign In / Sign Up buttons */}
          {currentUser ? (
            <ProfilePopover
              currentUser={currentUser}
              onOpenProfile={onOpenProfile}
              onOpenEditProfile={onOpenEditProfile}
              onOpenSettings={onOpenSettings}
              onLogout={onLogout}
              onOpenAuth={onOpenAuth}
              currentTheme={currentTheme}
            />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth?.('signin')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors border border-white/10"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth?.('signup')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

