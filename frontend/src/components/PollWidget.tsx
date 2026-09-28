import React, { useState } from 'react';
import { BarChart3, CheckCircle, Plus, Send, Loader2 } from 'lucide-react';
import type { Poll, PollOption } from '../types';
import { api } from '../services/api';

interface PollWidgetProps {
  ideaId: string;
  initialPoll?: Poll | null;
  canCreate?: boolean;
}

export const PollWidget: React.FC<PollWidgetProps> = ({
  ideaId,
  initialPoll,
  canCreate = true,
}) => {
  const [poll, setPoll] = useState<Poll | null>(initialPoll || null);
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(poll?.user_voted_option !== undefined && poll?.user_voted_option !== null);

  const handleVote = async (optionIndex: number) => {
    if (!poll) return;
    try {
      const res = await api.votePoll(poll.id, optionIndex);
      if (res && res.poll) {
        setPoll(res.poll);
        setHasVoted(true);
      }
    } catch (e) {
      console.error('Failed to vote on poll:', e);
    }
  };

  const handleAddOption = () => {
    if (options.length < 4) {
      setOptions([...options, `Option ${options.length + 1}`]);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.createPoll(
        ideaId,
        question.trim(),
        options.filter(o => o.trim())
      );
      if (res && res.poll) {
        setPoll(res.poll);
        setIsCreating(false);
      }
    } catch (e) {
      console.error('Failed to create poll:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!poll && !isCreating) {
    if (!canCreate) return null;
    return (
      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-purple-300">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span>Ask the community with an Instagram-style poll!</span>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="text-xs gradient-btn text-white px-3 py-1 rounded-lg font-bold flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Poll</span>
        </button>
      </div>
    );
  }

  if (isCreating) {
    return (
      <form onSubmit={handleCreatePoll} className="p-4 rounded-xl bg-black/40 border border-purple-500/30 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white border-b border-white/10 pb-2">
          <span className="flex items-center gap-1.5 text-purple-300">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Create Community Poll (Instagram-Style)
          </span>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="text-gray-400 hover:text-white text-[11px]"
          >
            Cancel
          </button>
        </div>

        <div>
          <label className="block text-[11px] text-gray-300 mb-1">Poll Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which hardware sensor should we use?"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] text-gray-300">Answer Options (2 to 4)</label>
          {options.map((opt, idx) => (
            <input
              key={idx}
              type="text"
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[idx] = e.target.value;
                setOptions(next);
              }}
              placeholder={`Option ${idx + 1}`}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              required
            />
          ))}
          {options.length < 4 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 pt-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Option</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full gradient-btn text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Publish Community Poll</span>
        </button>
      </form>
    );
  }

  if (!poll) return null;

  // Render Poll & Live Voting
  return (
    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-white flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          {poll.question}
        </span>
        <span className="text-[10px] text-gray-400 font-semibold">
          {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
        </span>
      </div>

      <div className="space-y-2">
        {poll.options.map((opt: PollOption) => {
          const isSelected = poll.user_voted_option === opt.index;
          return (
            <button
              key={opt.index}
              onClick={() => handleVote(opt.index)}
              className={`w-full text-left relative overflow-hidden rounded-xl border p-2.5 text-xs transition-all ${
                isSelected
                  ? 'border-purple-400 bg-purple-900/30 text-white'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/5 text-gray-200'
              }`}
            >
              {/* Animated Progress Bar */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600/30 to-cyan-500/30 rounded-xl transition-all duration-500 pointer-events-none"
                style={{ width: `${opt.percentage}%` }}
              />

              {/* Option Text and Stats */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-medium flex items-center gap-1.5">
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 inline" />}
                  {opt.text}
                </span>
                <span className="font-bold text-[11px] text-purple-300">
                  {opt.percentage}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500 text-center">
        💡 Tap any option to vote or change your choice
      </p>
    </div>
  );
};
