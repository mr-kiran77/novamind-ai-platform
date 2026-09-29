import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Edit3,
  Settings,
  Palette,
  Bell,
  Shield,
  Bot,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Sparkles,
  LogIn,
} from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';
import type { User } from '../types';

interface ProfilePopoverProps {
  currentUser: User;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenSettings: (initialTab?: string) => void;
  onLogout: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  currentTheme?: string;
}

export const ProfilePopover: React.FC<ProfilePopoverProps> = ({
  currentUser,
  onOpenProfile,
  onOpenEditProfile,
  onOpenSettings,
  onLogout,
  onOpenAuth,
  currentTheme = 'dark',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'admin') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
          <span>👑</span> Admin
        </span>
      );
    }
    if (role === 'moderator') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <span>🛡️</span> Moderator
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
        <span>⚡</span> Innovator
      </span>
    );
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Clickable Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all group focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User Profile and Account Menu"
        title={`${currentUser.display_name || currentUser.username} - Profile & Settings`}
      >
        <ProfileAvatar
          name={currentUser.display_name}
          username={currentUser.username}
          avatarUrl={currentUser.avatar_url}
          size="sm"
          showStatus={true}
          isOnline={true}
        />
        <div className="hidden lg:flex flex-col text-left">
          <span className="text-xs font-bold text-gray-200 group-hover:text-white max-w-[110px] truncate leading-tight">
            {currentUser.display_name || currentUser.username}
          </span>
          <span className="text-[10px] text-purple-300/80 leading-none">
            @{currentUser.username}
          </span>
        </div>
        <span className="text-gray-400 group-hover:text-purple-300 transition-colors text-[10px] ml-0.5">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-[#0f111e]/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-purple-950/50 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-white/10"
        >
          {/* Identity Header */}
          <div className="p-2.5 pb-3">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                name={currentUser.display_name}
                username={currentUser.username}
                avatarUrl={currentUser.avatar_url}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    {currentUser.display_name || 'Innovator'}
                  </h4>
                  {getRoleBadge(currentUser.role)}
                </div>
                <p className="text-xs text-purple-300/90 truncate">@{currentUser.username}</p>
                {currentUser.reputation_score !== undefined && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{currentUser.reputation_score} Rep</span>
                    <span>•</span>
                    <span>🔥 {currentUser.current_streak || 1}d Streak</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Profile Actions */}
          <div className="py-1.5 space-y-0.5" role="group" aria-label="Profile Actions">
            <button
              role="menuitem"
              onClick={() => handleAction(onOpenProfile)}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-600/20 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>View Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-300" />
            </button>

            <button
              role="menuitem"
              onClick={() => handleAction(onOpenEditProfile)}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-600/20 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Edit Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-300" />
            </button>
          </div>

          {/* Section 2: Account & Preferences */}
          <div className="py-1.5 space-y-0.5" role="group" aria-label="Preferences">
            <button
              role="menuitem"
              onClick={() => handleAction(() => onOpenSettings('account'))}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-gray-400" />
                <span>Account Settings</span>
              </div>
            </button>

            <button
              role="menuitem"
              onClick={() => handleAction(() => onOpenSettings('appearance'))}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span>Theme / Appearance</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 capitalize">
                {currentTheme}
              </span>
            </button>

            <button
              role="menuitem"
              onClick={() => handleAction(() => onOpenSettings('notifications'))}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Notifications</span>
              </div>
            </button>

            <button
              role="menuitem"
              onClick={() => handleAction(() => onOpenSettings('privacy'))}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Privacy &amp; Security</span>
              </div>
            </button>

            <button
              role="menuitem"
              onClick={() => handleAction(() => onOpenSettings('ai'))}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Nova / AI Preferences</span>
              </div>
            </button>
          </div>

          {/* Section 3: Support & Information */}
          <div className="py-1.5 space-y-0.5" role="group" aria-label="Support">
            <button
              role="menuitem"
              onClick={() => handleAction(() => onOpenSettings('support'))}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>Help &amp; FAQ</span>
              </div>
            </button>

            <button
              role="menuitem"
              onClick={() => handleAction(() => onOpenSettings('about'))}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-pink-400" />
                <span>About NovaMind</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">v1.2</span>
            </button>

            {onOpenAuth && (
              <button
                role="menuitem"
                onClick={() => handleAction(() => onOpenAuth('signin'))}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-purple-300 hover:text-white hover:bg-purple-500/10 flex items-center gap-2.5 transition-colors"
              >
                <LogIn className="w-4 h-4 text-purple-400" />
                <span>Sign In / Switch Account</span>
              </button>
            )}
          </div>

          {/* Section 4: Log Out */}
          <div className="pt-1.5">
            <button
              role="menuitem"
              onClick={() => handleAction(onLogout)}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
