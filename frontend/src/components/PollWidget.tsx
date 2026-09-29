import React, { useState } from 'react';
import { BarChart3, CheckCircle, Plus, Send, Loader2, Clock, Trash2, X, AlertCircle } from 'lucide-react';
import type { Poll, PollOption } from '../types';
import { api } from '../services/api';

interface PollWidgetProps {
  ideaId: string;
  initialPoll?: Poll | null;
  canCreate?: boolean;
  currentUser?: any;
  onPollDeleted?: () => void;
}

export const PollWidget: React.FC<PollWidgetProps> = ({
  ideaId,
  initialPoll,
  canCreate = true,
  currentUser,
  onPollDeleted,
}) => {
  const [poll, setPoll] = useState<Poll | null>(initialPoll || null);
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [closesAt, setClosesAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Sync state if initialPoll changes
  React.useEffect(() => {
    if (initialPoll) setPoll(initialPoll);
  }, [initialPoll]);

  const isPollExpired = Boolean(
    poll?.is_closed || (poll?.closes_at && new Date() > new Date(poll.closes_at))
  );

  const handleVote = async (optionIndex: number) => {
    if (!poll || isPollExpired) return;
    setVoteError(null);
    try {
      const res = await api.votePoll(poll.id, optionIndex);
      if (res && res.poll) {
        setPoll(res.poll);
      }
    } catch (e: any) {
      setVoteError(e.message || 'Failed to submit vote');
      setTimeout(() => setVoteError(null), 3500);
    }
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, `Option ${options.length + 1}`]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const filtered = options.map((o) => o.trim()).filter(Boolean);
    if (filtered.length < 2 || filtered.length > 6) return;

    setIsSubmitting(true);
    try {
      const closesAtIso = closesAt ? new Date(closesAt).toISOString() : undefined;
      const res = await api.createPoll(ideaId, question.trim(), filtered, closesAtIso);
      if (res && res.poll) {
        setPoll(res.poll);
        setIsCreating(false);
        setQuestion('');
        setOptions(['Option 1', 'Option 2']);
        setClosesAt('');
      }
    } catch (e: any) {
      console.error('Failed to create poll:', e);
      setVoteError(e.message || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePoll = async () => {
    if (!poll) return;
    if (!window.confirm('Are you sure you want to remove this poll?')) return;
    setIsDeleting(true);
    try {
      await api.deletePoll(poll.id);
      setPoll(null);
      if (onPollDeleted) onPollDeleted();
    } catch (e: any) {
      alert(e.message || 'Failed to delete poll.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!poll && !isCreating) {
    if (!canCreate) return null;
    return (
      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-purple-300">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span>Ask the community with an Instagram-style poll (2 to 6 options)</span>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="text-xs gradient-btn text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-md shadow-purple-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Poll</span>
        </button>
      </div>
    );
  }

  if (isCreating) {
    return (
      <form onSubmit={handleCreatePoll} className="p-4 rounded-xl bg-black/50 border border-purple-500/30 space-y-3.5">
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
          <label className="block text-[11px] font-semibold text-gray-300 mb-1">Poll Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which pricing tier or hardware sensor should we prioritize?"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-semibold text-gray-300">Answer Options (2 to 6)</label>
            <span className="text-[10px] text-gray-500">{options.length}/6 options</span>
          </div>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-4 text-center font-mono">{idx + 1}.</span>
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[idx] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="text-gray-500 hover:text-red-400 p-1"
                  title="Remove option"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {options.length < 6 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 pt-1 font-semibold"
            >
              <Plus className="w-3 h-3" />
              <span>Add Option</span>
            </button>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-300 mb-1">Optional Closing Date</label>
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !question.trim()}
          className="w-full gradient-btn text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Publish Community Poll</span>
        </button>
      </form>
    );
  }

  if (!poll) return null;

  const canDelete =
    Boolean(currentUser) &&
    (currentUser.id === poll.created_by || currentUser.role === 'admin' || currentUser.role === 'moderator');

  return (
    <div className="p-4 rounded-xl bg-purple-950/25 border border-purple-500/30 space-y-3 relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <span className="font-bold text-white text-xs flex items-center gap-1.5 leading-snug">
            <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{poll.question}</span>
          </span>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>
              {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
            </span>
            {isPollExpired ? (
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                🔒 Poll Closed
              </span>
            ) : poll.closes_at ? (
              <span className="flex items-center gap-1 text-gray-400">
                <Clock className="w-2.5 h-2.5 text-cyan-400" />
                <span>Closes {new Date(poll.closes_at).toLocaleDateString()}</span>
              </span>
            ) : null}
          </div>
        </div>

        {canDelete && (
          <button
            onClick={handleDeletePoll}
            disabled={isDeleting}
            title="Delete Poll"
            className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {voteError && (
        <div className="text-[11px] bg-red-950/40 border border-red-500/30 text-red-300 p-2 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{voteError}</span>
        </div>
      )}

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((opt: PollOption) => {
          const isSelected = poll.user_voted_option === opt.index;
          return (
            <button
              key={opt.index}
              onClick={() => handleVote(opt.index)}
              disabled={isPollExpired}
              className={`w-full text-left relative overflow-hidden rounded-xl border p-2.5 text-xs transition-all ${
                isSelected
                  ? 'border-purple-400 bg-purple-900/35 text-white shadow-sm ring-1 ring-purple-400/40'
                  : isPollExpired
                  ? 'border-white/5 bg-white/[0.01] text-gray-400 cursor-not-allowed'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/5 text-gray-200 cursor-pointer'
              }`}
            >
              {/* Animated Progress Bar */}
              <div
                className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 pointer-events-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600/40 to-cyan-500/40'
                    : 'bg-gradient-to-r from-white/10 to-purple-600/20'
                }`}
                style={{ width: `${opt.percentage}%` }}
              />

              {/* Option Text and Stats */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="font-medium flex items-center gap-1.5">
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" />}
                  <span>{opt.text}</span>
                </span>
                <span className="font-bold text-[11px] text-purple-300 font-mono">
                  {opt.percentage}% <span className="text-[10px] text-gray-400 font-normal">({opt.vote_count})</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
        {isPollExpired ? (
          <span>Voting is concluded for this poll.</span>
        ) : (
          <span>💡 Tap an option to vote or switch your selection</span>
        )}
        {poll.user_voted_option !== undefined && poll.user_voted_option !== null && (
          <span className="text-cyan-400 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Voted
          </span>
        )}
      </div>
    </div>
  );
};
