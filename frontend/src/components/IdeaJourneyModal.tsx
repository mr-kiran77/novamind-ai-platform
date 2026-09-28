import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Users,
  Target,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { Idea } from '../types';
import { api } from '../services/api';

interface IdeaJourneyModalProps {
  idea: Idea | null;
  onClose: () => void;
  onOpenNovaWithContext: (idea: Idea) => void;
  onOpenCollab: (idea: Idea) => void;
  currentUser: any;
}

const STAGES = [
  { id: 'raw_thought', step: 1, label: 'Raw Thought', desc: 'Napkin sketch or voice memo' },
  { id: 'structured', step: 2, label: 'Structured Blueprint', desc: '22-field execution model' },
  { id: 'discussion', step: 3, label: 'Community Review', desc: 'Feedback & blind-spot analysis' },
  { id: 'improved', step: 4, label: 'Improved Version', desc: 'Enhanced architecture' },
  { id: 'prototype', step: 5, label: 'Working Prototype', desc: 'Code & laboratory test' },
  { id: 'project', step: 6, label: 'Project Launch', desc: 'Team assembled & deployed' },
  { id: 'opportunity', step: 7, label: 'Opportunity & Grant', desc: 'Commercialization & scale' },
];

export const IdeaJourneyModal: React.FC<IdeaJourneyModalProps> = ({
  idea,
  onClose,
  onOpenNovaWithContext,
  onOpenCollab,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'collabs' | 'comments'>('blueprint');
  const [proposals, setProposals] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (idea) {
      // Fetch fresh details with collaborations
      api.getIdeaDetail(idea.id).then((data) => {
        if (data.collaborations) setProposals(data.collaborations);
        if (data.comments) setComments(data.comments);
      }).catch((e) => {
        console.error("Failed to load full idea details:", e);
      });
    }
  }, [idea]);

  if (!idea) return null;

  const blueprint = idea.structured_data || ({} as any);

  // Determine stage progression index (0 to 6)
  const currentStageIndex = STAGES.findIndex(s => s.id === idea.stage);
  const activeStageIdx = currentStageIndex >= 0 ? currentStageIndex : 1;

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const added = {
      id: String(Date.now()),
      user_name: currentUser?.display_name || 'Dr. Maya Lin',
      user_avatar: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      content: newComment.trim(),
      created_at: 'Just now',
    };
    setComments(prev => [added, ...prev]);
    setNewComment('');
  };

  const handleAcceptProposal = async (proposalId: string) => {
    setProposals(prev =>
      prev.map(p => (p.id === proposalId ? { ...p, status: 'accepted' } : p))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl max-h-[92vh] rounded-2xl border-purple-500/30 shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  {idea.title}
                </h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  {idea.category}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                <span>By @{idea.username}</span>
                <span>•</span>
                <span>Stage: {STAGES[activeStageIdx]?.label}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenNovaWithContext(idea)}
              className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Ask Nova</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7-STAGE PIPELINE STEPPER */}
        <div className="p-4 bg-black/40 border-b border-white/10 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[650px] gap-2">
            {STAGES.map((s, idx) => {
              const isPassed = idx <= activeStageIdx;
              const isCurrent = idx === activeStageIdx;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-purple-600 text-white ring-4 ring-purple-500/30 shadow-lg'
                          : isPassed
                          ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border border-white/10 text-gray-500'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span
                      className={`text-[9px] mt-1 text-center font-semibold leading-tight line-clamp-1 ${
                        isCurrent ? 'text-purple-300' : isPassed ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        idx < activeStageIdx ? 'bg-cyan-400' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inner Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/5 text-xs">
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`pb-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'blueprint'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Structured Blueprint (22-Field)</span>
          </button>

          <button
            onClick={() => setActiveTab('collabs')}
            className={`pb-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'collabs'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Collaborator Queue ({proposals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Community Feedback ({comments.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-gray-300">
          {activeTab === 'blueprint' && (
            <div className="space-y-6">
              {/* One line summary hero */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  ⚡ Executive One-Line Summary
                </span>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {blueprint.one_line_summary || idea.raw_content}
                </p>
              </div>

              {/* Problem vs Proposed Solution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4" />
                    <span>The Critical Problem</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                    {blueprint.problem_statement || 'Identified through user domain observation.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-cyan-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>The Proposed Solution</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                    {blueprint.proposed_solution || 'Autonomous structured system model.'}
                  </p>
                </div>
              </div>

              {/* How it Works & Target Beneficiaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                    <Cpu className="w-4 h-4" />
                    <span>How It Works &amp; Architecture</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {blueprint.how_it_works || 'Multi-step algorithmic pipeline.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <Users className="w-4 h-4" />
                    <span>Who It Helps &amp; Target Beneficiaries</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {blueprint.who_it_helps || 'Global researchers, builders and practitioners.'}
                  </p>
                </div>
              </div>

              {/* Tech Stack & Required Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide">
                    🛠️ Suggested Tech Stack
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(blueprint.suggested_tech_stack || ['React 18', 'TypeScript', 'FastAPI', 'Gemini 3.8']).map((tech: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                    🔬 Required Resources &amp; Equipment
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(blueprint.required_resources || ['GPU Cloud Instance', 'API Key', 'Domain Expert Review']).map((res: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]">
                        {res}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Practical Use Cases & Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-green-400 uppercase tracking-wide">
                    🎯 Practical Use Cases
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-gray-300">
                    {(blueprint.practical_use_cases || ['Rapid prototyping in university hackathons', 'Pre-seed venture validation']).map((uc: string, i: number) => (
                      <li key={i}>{uc}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wide">
                    ⚠️ Risks &amp; Challenges
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-gray-300">
                    {(blueprint.challenges_risks || ['Regulatory compliance', 'Latency requirements']).map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Raw Thought Origin */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1">
                <span className="text-gray-500 font-bold uppercase tracking-wider">
                  Raw Input Thought Origin:
                </span>
                <p className="text-gray-400 italic">"{idea.raw_content}"</p>
              </div>
            </div>
          )}

          {activeTab === 'collabs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-purple-950/30 p-3 rounded-xl border border-purple-500/20">
                <div>
                  <h4 className="font-bold text-white text-xs">Collaborators &amp; Co-Builders</h4>
                  <p className="text-[10px] text-gray-400">Join forces with other engineers, labs, and designers</p>
                </div>
                <button
                  onClick={() => onOpenCollab(idea)}
                  className="gradient-btn text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  + Propose Collaboration
                </button>
              </div>

              {proposals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No collaboration proposals yet. Be the first to join this builder team!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">@{p.username || 'builder'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
                            {p.role_type}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              p.status === 'accepted'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{p.pitch_message}</p>
                      </div>

                      {p.status !== 'accepted' && (
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleAcceptProposal(p.id)}
                            className="bg-green-600/30 hover:bg-green-600/50 text-green-200 border border-green-500/40 px-3 py-1 rounded-lg text-xs font-semibold"
                          >
                            Accept Offer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave constructive critique or feedback on this idea..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="gradient-btn text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>

              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    No community comments yet. Start the conversation!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple-300">{c.user_name || 'Builder'}</span>
                        <span className="text-gray-500 text-[10px]">{c.created_at}</span>
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40">
          <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Idea Timestamped &amp; Protected on Sovereign Ledger</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenCollab(idea)}
              className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>🤝 Collaborate</span>
            </button>
            <button
              onClick={onClose}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-xl font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
