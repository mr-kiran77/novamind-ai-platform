import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Send,
  UserPlus,
  UserCheck,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { Idea, User } from '../types';
import { api } from '../services/api';

interface CommentModalProps {
  idea: Idea | null;
  currentUser: User;
  onClose: () => void;
  onFollowPoster: (userId: string) => void;
  onViewFullBlueprint: (idea: Idea) => void;
  onCommentCountChange?: (ideaId: string, newCount: number) => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  idea,
  currentUser,
  onClose,
  onFollowPoster,
  onViewFullBlueprint,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!idea) return;
    setLoading(true);
    api.getComments(idea.id)
      .then((data) => {
        if (data && data.comments) {
          setComments(data.comments);
        }
      })
      .catch((err) => {
        console.error('Failed to load comments:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [idea]);

  if (!idea) return null;

  const isCurrentUserPoster = currentUser?.id === idea.user_id || currentUser?.username === idea.username;

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || posting) return;

    setPosting(true);
    try {
      await api.postComment(idea.id, newComment.trim());
      const newCommentObj = {
        id: String(Date.now()),
        user_id: currentUser?.id,
        username: currentUser?.username || 'innovator',
        display_name: currentUser?.display_name || 'Innovator',
        avatar_url: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        content: newComment.trim(),
        created_at: 'Just now',
      };
      const updated = [newCommentObj, ...comments];
      setComments(updated);
      setNewComment('');
      if (onCommentCountChange) {
        onCommentCountChange(idea.id, updated.length);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-2xl border border-purple-500/30 shadow-2xl flex flex-col overflow-hidden my-auto animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-400">Discussion on Idea</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  {comments.length} Comments
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5">
                {idea.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Poster Spotlight Strip */}
        <div className="p-3.5 bg-purple-950/40 border-b border-purple-500/20 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <img
              src={idea.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
              alt={idea.display_name}
              className="w-8 h-8 rounded-lg object-cover border border-purple-400/40"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white">
                  {idea.display_name}
                </span>
                <span className="text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-1.5 py-0.2 rounded-md shadow-sm">
                  💡 IDEA POSTER
                </span>
              </div>
              <span className="text-[10px] text-gray-400">@{idea.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentUserPoster ? (
              <button
                onClick={() => onFollowPoster(idea.user_id)}
                className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all ${
                  idea.is_following_author
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'gradient-btn text-white shadow-md shadow-purple-500/20'
                }`}
              >
                {idea.is_following_author ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Following Poster</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="btn-keep-white">Follow Poster</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                <span>✨ You are the Poster</span>
              </span>
            )}

            <button
              onClick={() => {
                onClose();
                onViewFullBlueprint(idea);
              }}
              className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
              title="Open Complete 22-Field Execution Model"
            >
              <span>Full Blueprint</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Idea Brief Summary */}
        <div className="px-5 py-3 bg-white/[0.01] border-b border-white/5 text-xs text-gray-300 leading-relaxed">
          <p className="line-clamp-2">
            <span className="text-gray-400 font-semibold mr-1">Poster's Vision:</span>
            {idea.structured_data?.one_line_summary || idea.raw_content}
          </p>
        </div>

        {/* Comment Thread List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-xs">Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <MessageCircle className="w-8 h-8 mx-auto text-gray-500 opacity-60" />
              <p className="text-xs font-semibold">No comments yet on this posted idea.</p>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                Be the first user to share your review, feedback, or suggestions for the poster!
              </p>
            </div>
          ) : (
            comments.map((c) => {
              const isCommentByPoster = c.user_id === idea.user_id || c.username === idea.username;
              const isMe = c.username === currentUser?.username;

              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCommentByPoster
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                      : 'bg-white/[0.03] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <div className="flex items-center gap-2">
                      <img
                        src={c.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                        alt={c.display_name || c.username}
                        className="w-6 h-6 rounded-full object-cover border border-white/20"
                      />
                      <span className="text-xs font-bold text-white">
                        {c.display_name || c.username}
                      </span>
                      <span className="text-[10px] text-gray-400">@{c.username}</span>

                      {/* Poster vs User Role Badge */}
                      {isCommentByPoster ? (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                          <span>💡 Poster</span>
                        </span>
                      ) : (
                        <span className="text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.2 rounded-md font-medium">
                          👤 User
                        </span>
                      )}

                      {isMe && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-semibold">
                          You
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-gray-500">{c.created_at || 'Recently'}</span>
                  </div>

                  <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-line pl-8">
                    {c.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Comment Input Footer */}
        <form onSubmit={handlePost} className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              isCurrentUserPoster
                ? 'Reply to community users as the Idea Poster...'
                : `Comment on @${idea.username}'s posted idea as a User...`
            }
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            disabled={posting}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || posting}
            className="gradient-btn text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all shrink-0"
          >
            {posting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
            <span className="btn-keep-white">
              {isCurrentUserPoster ? 'Post as Poster' : 'Post as User'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
