import React from 'react';
import { Lightbulb, MessageCircle, Users, ExternalLink } from 'lucide-react';
import type { Idea } from '../types';

interface IdeaCardProps {
  idea: Idea;
  onReact: (id: string) => void;
  onCollaborate: (idea: Idea) => void;
  onViewDetail: (idea: Idea) => void;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  onReact,
  onCollaborate,
  onViewDetail,
}) => {
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
    <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 group shadow-xl">
      <div>
        {/* Creator Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <img
              src={idea.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
              alt={idea.display_name}
              className="w-9 h-9 rounded-xl object-cover border border-purple-500/30"
            />
            <div>
              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors block">
                {idea.display_name}
              </span>
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
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          {/* Reaction Button */}
          <button
            onClick={() => onReact(idea.id)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 text-purple-300 transition-colors border border-white/5"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>{idea.reaction_count || 0}</span>
          </button>

          {/* Comment Count */}
          <button
            onClick={() => onViewDetail(idea)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{idea.comment_count || 0}</span>
          </button>
        </div>

        {/* COLLABORATE BUTTON */}
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

        {/* View Blueprint */}
        <button
          onClick={() => onViewDetail(idea)}
          className="text-gray-400 hover:text-white p-1 text-xs"
          title="Open Blueprint"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
