import React from 'react';
import { Sparkles, Bot, Settings, Flame, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCapture: () => void;
  onOpenNova: () => void;
  currentUser: any;
  onSwitchRole: (role: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenCapture,
  onOpenNova,
  currentUser,
  onSwitchRole,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl border-b px-4 lg:px-8 py-3 transition-colors duration-200 ${
        isDark
          ? 'bg-[#0a0b10]/85 border-white/10 text-white'
          : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
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
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                NOVAMIND
              </span>
              <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                React + TS
              </span>
            </div>
            <p className={`text-[10px] hidden sm:block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              AI Innovation &amp; Structuring Platform
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          className={`hidden md:flex items-center gap-1 border rounded-2xl p-1 ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setCurrentTab('feed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'feed'
                ? isDark
                  ? 'text-purple-300 bg-white/10 shadow'
                  : 'text-purple-700 bg-white shadow-sm'
                : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌟 Feed
          </button>
          <button
            onClick={() => setCurrentTab('trending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              currentTab === 'trending'
                ? isDark
                  ? 'text-purple-300 bg-white/10 shadow'
                  : 'text-purple-700 bg-white shadow-sm'
                : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Trending
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              currentTab === 'admin'
                ? isDark
                  ? 'text-cyan-300 bg-white/10 shadow'
                  : 'text-cyan-700 bg-white shadow-sm'
                : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-cyan-500" />
            50-Bot Admin
          </button>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2.5">
          {/* Ask Nova Mentor Button */}
          <button
            onClick={onOpenNova}
            className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all border ${
              isDark
                ? 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border-purple-500/30'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
            }`}
            title="Open Nova AI Mentor"
          >
            <Bot className="w-4 h-4 text-cyan-500" />
            <span className="font-semibold">Nova AI</span>
          </button>

          {/* Capture Idea Button */}
          <button
            onClick={onOpenCapture}
            className="gradient-btn text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/25 hover:scale-105 transition-transform"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span className="btn-keep-white">Capture Idea</span>
          </button>

          {/* Quick Demo Role Selector */}
          <div className="relative group">
            <button
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-purple-950/60 border-purple-500/30 text-purple-200'
                  : 'bg-purple-50 border-purple-200 text-purple-800'
              }`}
            >
              <span className="font-medium">{currentUser?.display_name || 'Dr. Maya Lin'}</span>
              <span className="text-[10px]">▼</span>
            </button>
            <div
              className={`absolute right-0 mt-1 w-48 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 text-xs border ${
                isDark
                  ? 'bg-[#141624] border-white/10 text-gray-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-[10px] text-gray-400 px-2 py-1 font-bold uppercase tracking-wider">
                Switch Active Persona:
              </div>
              <button
                onClick={() => onSwitchRole('user')}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                  isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span>Dr. Maya Lin (User)</span>
                <span>⚡</span>
              </button>
              <button
                onClick={() => onSwitchRole('moderator')}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                  isDark ? 'hover:bg-white/10 text-amber-300' : 'hover:bg-slate-100 text-amber-600'
                }`}
              >
                <span>Alex Vance (Mod)</span>
                <span>🛡️</span>
              </button>
              <button
                onClick={() => onSwitchRole('admin')}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between ${
                  isDark ? 'hover:bg-white/10 text-cyan-300' : 'hover:bg-slate-100 text-cyan-600'
                }`}
              >
                <span>SysAdmin (Admin)</span>
                <span>👑</span>
              </button>
            </div>
          </div>

          {/* Light / Dark Mode Toggle Button (Far Top-Right of Navbar) */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-amber-300 border-white/20 hover:border-amber-400/50'
                : 'bg-slate-100 hover:bg-slate-200 text-indigo-700 border-slate-300 hover:border-indigo-400'
            }`}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-300 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
            )}
            <span className="text-xs font-bold hidden sm:inline">
              {isDark ? 'Light' : 'Dark'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
