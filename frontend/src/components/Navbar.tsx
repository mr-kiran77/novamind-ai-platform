import React from 'react';
import { Sparkles, Bot, Settings, Flame } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCapture: () => void;
  onOpenNova: () => void;
  currentUser: any;
  onSwitchRole: (role: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenCapture,
  onOpenNova,
  currentUser,
  onSwitchRole,
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'feed'
                ? 'text-purple-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🌟 Feed
          </button>
          <button
            onClick={() => setCurrentTab('trending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              currentTab === 'trending'
                ? 'text-purple-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Trending
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              currentTab === 'admin'
                ? 'text-cyan-300 bg-white/10 shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
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
            className="gradient-btn text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span>Capture Idea</span>
          </button>

          {/* Quick Demo Role Selector */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs bg-purple-950/60 border border-purple-500/30 text-purple-200 px-2.5 py-1.5 rounded-xl">
              <span>{currentUser?.display_name || 'Dr. Maya Lin'}</span>
              <span className="text-[10px]">▼</span>
            </button>
            <div className="absolute right-0 mt-1 w-44 bg-[#141624] border border-white/10 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 text-xs">
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
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
