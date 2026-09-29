import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Globe,
  Sparkles,
  Flame,
  Award,
  Users,
  Layers,
  Heart,
  Bookmark,
  UserPlus,
  UserCheck,
  ExternalLink,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';
import { api } from '../services/api';
import type { User, Idea } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  viewUsername?: string; // If viewing another user
  onOpenEditProfile: () => void;
  onViewIdeaDetail?: (idea: Idea) => void;
  onFollowChange?: (targetUserId: string, isFollowing: boolean) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  viewUsername,
  onOpenEditProfile,
  onViewIdeaDetail,
  onFollowChange,
}) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ideas' | 'about'>('ideas');

  const targetUsername = viewUsername || currentUser.username;
  const isSelf = !viewUsername || viewUsername.toLowerCase() === currentUser.username.toLowerCase();

  useEffect(() => {
    if (!isOpen) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await api.getUserProfile(targetUsername);
        if (data && data.profile) {
          setProfileData(data.profile);
          setIdeas(data.ideas || []);
          setFollowerCount(data.follower_count || 0);
          setFollowingCount(data.following_count || 0);
          setIsFollowing(data.is_following || false);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        // Fallback to currentUser if viewing self
        if (isSelf) {
          setProfileData(currentUser);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, targetUsername]);

  // Handle follow / unfollow
  const handleToggleFollow = async () => {
    if (!profileData?.id || isSelf) return;
    setFollowLoading(true);
    try {
      const res = await api.followUser(profileData.id);
      setIsFollowing(res.is_following);
      setFollowerCount(prev => (res.is_following ? prev + 1 : Math.max(0, prev - 1)));
      if (onFollowChange) {
        onFollowChange(profileData.id, res.is_following);
      }
    } catch (e) {
      console.error('Follow failed:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayUser = profileData || currentUser;
  const skills: string[] = Array.isArray(displayUser.skills)
    ? displayUser.skills
    : typeof displayUser.skills === 'string'
    ? JSON.parse(displayUser.skills || '[]')
    : [];
  const interests: string[] = Array.isArray(displayUser.interests)
    ? displayUser.interests
    : typeof displayUser.interests === 'string'
    ? JSON.parse(displayUser.interests || '[]')
    : [];
  const links: string[] = Array.isArray(displayUser.links)
    ? displayUser.links
    : typeof displayUser.links === 'string'
    ? JSON.parse(displayUser.links || '[]')
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayUser.display_name || displayUser.username}'s Profile`}
    >
      <div className="relative w-full max-w-3xl my-auto rounded-3xl bg-[#0d0f1a] border border-white/15 shadow-2xl shadow-purple-950/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Profile Header Hero */}
        <div className="relative h-36 sm:h-44 bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-900 overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/70 text-gray-300 hover:text-white border border-white/10 transition-colors"
            title="Close profile"
            aria-label="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identity & Avatar bar */}
        <div className="relative px-6 sm:px-8 pb-4 shrink-0 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-4">
              <div className="p-1 rounded-full bg-[#0d0f1a] ring-4 ring-purple-500/40 shadow-2xl">
                <ProfileAvatar
                  name={displayUser.display_name}
                  username={displayUser.username}
                  avatarUrl={displayUser.avatar_url}
                  size="xl"
                  showStatus={true}
                  isOnline={true}
                />
              </div>

              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {displayUser.display_name || 'Innovator'}
                  </h2>
                  {displayUser.is_verified && (
                    <span title="Verified Innovator">
                      <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    </span>
                  )}
                  {displayUser.is_private && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {displayUser.role || 'user'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-purple-300 font-mono">@{displayUser.username}</p>
              </div>
            </div>

            {/* Profile Action: Edit or Follow */}
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              {isSelf ? (
                <button
                  onClick={() => {
                    onClose();
                    onOpenEditProfile();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-purple-400 flex items-center gap-2 transition-all shadow"
                >
                  <Edit3 className="w-4 h-4 text-purple-400" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow ${
                    isFollowing
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-600/50'
                      : 'gradient-btn text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 text-cyan-300" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-white" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Stats Counters Row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mt-4 pt-3 border-t border-white/5">
            <div className="p-2 rounded-xl bg-white/[0.03] text-center">
              <div className="text-base font-extrabold text-white">{ideas.length}</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" /> Ideas
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] text-center">
              <div className="text-base font-extrabold text-white">{displayUser.reputation_score || 50}</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Rep
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] text-center">
              <div className="text-base font-extrabold text-white">{displayUser.current_streak || 1}d</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" /> Streak
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] text-center">
              <div className="text-base font-extrabold text-white">{followerCount}</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" /> Followers
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] text-center">
              <div className="text-base font-extrabold text-white">{followingCount}</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-indigo-400" /> Following
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] text-center">
              <div className="text-base font-extrabold text-white">{displayUser.longest_streak || 1}d</div>
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-emerald-400" /> Best
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 sm:px-8 border-b border-white/10 flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ideas'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Published Blueprints ({ideas.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>About &amp; Skills</span>
          </button>
        </div>

        {/* Tab Content Area (Scrollable) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Loading innovator profile...</p>
            </div>
          ) : activeTab === 'ideas' ? (
            <div className="space-y-4">
              {ideas.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-white/10 rounded-2xl p-6">
                  <Layers className="w-8 h-8 text-gray-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No Ideas Published Yet</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {isSelf
                      ? 'Capture your first concept and let NovaMind structure it with AI.'
                      : `@${displayUser.username} hasn't published any public blueprints yet.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ideas.map((idea: any) => (
                    <div
                      key={idea.id}
                      onClick={() => onViewIdeaDetail && onViewIdeaDetail(idea)}
                      className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {idea.category || 'General'}
                          </span>
                          <span className="text-[10px] text-gray-400 capitalize">
                            {idea.stage ? idea.stage.replace('_', ' ') : 'raw'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                          {idea.title || 'Untitled Blueprint'}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {idea.raw_content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 hover:text-rose-400">
                            <Heart className="w-3.5 h-3.5" />
                            {idea.reaction_count || 0}
                          </span>
                          <span className="flex items-center gap-1 hover:text-purple-400">
                            <Bookmark className="w-3.5 h-3.5" />
                            {idea.save_count || 0}
                          </span>
                        </div>
                        <span>{idea.created_at ? idea.created_at.slice(0, 10) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              {/* Bio */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Biography</h4>
                <p className="text-sm text-gray-200 leading-relaxed p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  {displayUser.bio || 'No biography provided yet.'}
                </p>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayUser.location && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-xs text-gray-300">
                    <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{displayUser.location}</span>
                  </div>
                )}
                {displayUser.occupation && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-xs text-gray-300">
                    <Briefcase className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{displayUser.occupation}</span>
                  </div>
                )}
                {displayUser.education && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-xs text-gray-300">
                    <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{displayUser.education}</span>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-xs text-gray-300">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Joined {displayUser.created_at ? displayUser.created_at.slice(0, 10) : '2026'}</span>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Skills &amp; Expertise</h4>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No skills listed yet.</p>
                )}
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Interests &amp; Passions</h4>
                {interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((int, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/25"
                      >
                        {int}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No interests listed yet.</p>
                )}
              </div>

              {/* Links */}
              {links.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Links &amp; Social</h4>
                  <div className="flex flex-wrap gap-2">
                    {links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-purple-400" />
                        <span className="truncate max-w-[200px]">{link}</span>
                        <ExternalLink className="w-3 h-3 text-gray-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
