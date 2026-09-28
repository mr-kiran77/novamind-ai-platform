import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Users,
  ExternalLink,
  Bookmark,
  Share2,
  UserPlus,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import type { Idea } from '../types';
import { PollWidget } from './PollWidget';

interface IdeaCardProps {
  idea: Idea;
  onLike: (id: string) => void;
  onComment: (idea: Idea) => void;
  onShare: (idea: Idea) => void;
  onSave: (id: string) => void;
  onFollow: (userId: string) => void;
  onCollaborate: (idea: Idea) => void;
  onViewDetail: (idea: Idea) => void;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  onLike,
  onComment,
  onShare,
  onSave,
  onFollow,
  onCollaborate,
  onViewDetail,
}) => {
  const [showPoll, setShowPoll] = useState(false);
  const summary = idea.structured_data?.one_line_summary || idea.raw_content;

  const stageLabels: Record<string, string> = {
    raw_thought: '1. Raw Thought',
    structured: '2. Structured',
    discussion: '3. Discussion',
    improved: '4. Improved',
    prototype: '5. Prototype',
    project: '6. Project',
    opportunity: '7. Opportunity',
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 group shadow-xl relative">
      <div>
        {/* Creator Header with Follow Button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <img
              src={idea.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
              alt={idea.display_name}
              className="w-9 h-9 rounded-xl object-cover border border-purple-500/30"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors block">
                  {idea.display_name}
                </span>
                {/* Follow Button */}
                <button
                  onClick={() => onFollow(idea.user_id)}
                  title={idea.is_following_author ? 'Following' : 'Follow Creator'}
                  className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                    idea.is_following_author
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  {idea.is_following_author ? (
                    <>
                      <UserCheck className="w-2.5 h-2.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-2.5 h-2.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
              <span className="text-[10px] text-gray-500">@{idea.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
              {idea.category}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
              {stageLabels[idea.stage] || 'Structured'}
            </span>
          </div>
        </div>

        {/* Title & Summary */}
        <div className="cursor-pointer" onClick={() => onViewDetail(idea)}>
          <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
            {idea.title}
          </h3>
          <p className="text-xs text-gray-300 mt-2 leading-relaxed line-clamp-3">
            {summary}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(idea.tags || []).slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/5"
            >
              #{tag}
            </span>
          ))}
          {idea.poll && (
            <button
              onClick={() => setShowPoll(!showPoll)}
              className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Poll ({idea.poll.total_votes} votes)</span>
            </button>
          )}
        </div>

        {/* Optional Expandable Poll */}
        {showPoll && (
          <div className="mt-3">
            <PollWidget ideaId={idea.id} initialPoll={idea.poll} canCreate={false} />
          </div>
        )}
      </div>

      {/* Social Actions Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          {/* Like Button */}
          <button
            onClick={() => onLike(idea.id)}
            title="Like Idea"
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all border ${
              idea.is_liked
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                : 'bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-300 border-white/5'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${idea.is_liked ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>{idea.reaction_count || 0}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => onComment(idea)}
            title="Opinions & Comments"
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/15 text-gray-400 hover:text-purple-300 transition-colors border border-white/5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{idea.comment_count || 0}</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            onClick={() => onSave(idea.id)}
            title={idea.is_saved ? 'Saved in Vault' : 'Save to Vault'}
            className={`p-1.5 rounded-lg border transition-all ${
              idea.is_saved
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/5'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${idea.is_saved ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          {/* Share Button */}
          <button
            onClick={() => onShare(idea)}
            title="Share Idea"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/15 text-gray-400 hover:text-cyan-300 transition-colors border border-white/5"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborate Button */}
          <button
            onClick={() => onCollaborate(idea)}
            title="Collaborate on this idea"
            className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 font-semibold transition-all hover:scale-105 shadow-sm"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Collaborate</span>
            {idea.collab_count > 0 && (
              <span className="bg-purple-500/40 text-purple-200 px-1 rounded text-[10px] font-bold">
                {idea.collab_count}
              </span>
            )}
          </button>

          {/* View Blueprint Details */}
          <button
            onClick={() => onViewDetail(idea)}
            className="text-gray-400 hover:text-white p-1 text-xs"
            title="Open Blueprint & Journey"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
