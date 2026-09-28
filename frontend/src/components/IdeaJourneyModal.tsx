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
  BarChart3,
  Search,
  ExternalLink,
  Landmark,
  Filter,
  Check,
  Copy,
  Wand2,
  Loader2,
  Flame,
} from 'lucide-react';
import { LinkedInIcon } from './SocialIcons';
import type { Idea, CollaborationProposal, GovernmentScheme } from '../types';
import { api } from '../services/api';
import { PollWidget } from './PollWidget';

interface IdeaJourneyModalProps {
  idea: Idea | null;
  onClose: () => void;
  onOpenNovaWithContext: (idea: Idea) => void;
  onOpenCollab: (idea: Idea) => void;
  onFollowPoster?: (userId: string) => void;
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
  onFollowPoster,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'poll' | 'collabs' | 'talent' | 'schemes' | 'comments'>('blueprint');
  const [proposals, setProposals] = useState<CollaborationProposal[]>([]);
  const [collabFilter, setCollabFilter] = useState<'all' | 'high_priority' | 'time_pass'>('all');
  const [isScreening, setIsScreening] = useState(false);

  // Talent Matcher state
  const [talentData, setTalentData] = useState<any>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);

  // Government Schemes state
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [customSchemeUrl, setCustomSchemeUrl] = useState('');
  const [isSearchingSchemes, setIsSearchingSchemes] = useState(false);
  const [customSchemeAnalysis, setCustomSchemeAnalysis] = useState<any>(null);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (idea) {
      // 1. Fetch idea detail & collaborations
      api.getIdeaDetail(idea.id).then((data) => {
        if (data.collaborations) setProposals(data.collaborations);
        if (data.comments) setComments(data.comments);
      }).catch(console.error);

      // 2. Fetch talent match info
      api.getTalentMatch(idea.id).then(setTalentData).catch(console.error);

      // 3. Fetch default government schemes
      api.searchSchemes(idea.id).then((res) => {
        if (res.recommended_schemes) setSchemes(res.recommended_schemes);
      }).catch(console.error);
    }
  }, [idea]);

  if (!idea) return null;

  const blueprint = idea.structured_data || ({} as any);

  // Determine stage progression index (0 to 6)
  const currentStageIndex = STAGES.findIndex(s => s.id === idea.stage);
  const activeStageIdx = currentStageIndex >= 0 ? currentStageIndex : 1;

  // AI Collaborator Screening
  const handleRunAiScreening = async () => {
    setIsScreening(true);
    try {
      const res = await api.screenCollaborations(idea.id);
      if (res && res.proposals) {
        setProposals(res.proposals);
      }
    } catch (e) {
      console.error('Failed to screen proposals:', e);
    } finally {
      setIsScreening(false);
    }
  };

  // Custom Scheme Search
  const handleAnalyzeCustomScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSchemeUrl.trim()) return;
    setIsSearchingSchemes(true);
    try {
      const res = await api.searchSchemes(idea.id, customSchemeUrl.trim());
      if (res && res.custom_portal_analysis) {
        setCustomSchemeAnalysis(res.custom_portal_analysis);
      }
    } catch (e) {
      console.error('Failed to search custom scheme portal:', e);
    } finally {
      setIsSearchingSchemes(false);
    }
  };

  // Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.postComment(idea.id, newComment.trim());
      const added = {
        id: String(Date.now()),
        username: currentUser?.username || 'innovator',
        display_name: currentUser?.display_name || 'Innovator',
        avatar_url: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        content: newComment.trim(),
        created_at: 'Just now',
      };
      setComments(prev => [added, ...prev]);
      setNewComment('');
    } catch (e) {
      console.error('Failed to post comment:', e);
    }
  };

  const handleCopyPitch = () => {
    if (!talentData?.viral_pitch_post) return;
    navigator.clipboard.writeText(talentData.viral_pitch_post);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  // Filtered proposals
  const filteredProposals = proposals.filter(p => {
    if (collabFilter === 'high_priority') return p.ai_classification === 'genuine_serious';
    if (collabFilter === 'time_pass') return p.ai_classification === 'low_effort_time_pass';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl max-h-[92vh] rounded-2xl border-purple-500/30 shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Top Bar */}
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
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-extrabold uppercase">
                    💡 Idea Poster
                  </span>
                  <span className="text-white font-semibold">{idea.display_name}</span>
                  <span className="text-gray-400">(@{idea.username})</span>
                </span>
                <span>•</span>
                <span>Stage: {STAGES[activeStageIdx]?.label}</span>
                {onFollowPoster && currentUser?.id !== idea.user_id && (
                  <button
                    onClick={() => onFollowPoster(idea.user_id)}
                    className={`text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all ml-1 ${
                      idea.is_following_author
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }`}
                  >
                    {idea.is_following_author ? '✓ Following Poster' : '+ Follow Poster'}
                  </button>
                )}
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

        {/* 7-Stage Stepper */}
        <div className="p-3.5 bg-black/40 border-b border-white/10 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[650px] gap-2">
            {STAGES.map((s, idx) => {
              const isPassed = idx <= activeStageIdx;
              const isCurrent = idx === activeStageIdx;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-purple-600 text-white ring-4 ring-purple-500/30 shadow-lg'
                          : isPassed
                          ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border border-white/10 text-gray-500'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3 h-3" /> : s.step}
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

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-white/5 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`pb-2 px-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'blueprint'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Structured Blueprint</span>
          </button>

          <button
            onClick={() => setActiveTab('poll')}
            className={`pb-2 px-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'poll'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Community Poll</span>
          </button>

          <button
            onClick={() => setActiveTab('collabs')}
            className={`pb-2 px-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'collabs'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Collaborator Queue ({proposals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('talent')}
            className={`pb-2 px-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'talent'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <LinkedInIcon className="w-3.5 h-3.5 text-[#0077b5]" />
            <span>Talent Outreach</span>
          </button>

          <button
            onClick={() => setActiveTab('schemes')}
            className={`pb-2 px-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'schemes'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Govt Schemes ({schemes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-2 px-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'comments'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Opinions ({comments.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-gray-300">
          {/* TAB 1: STRUCTURED BLUEPRINT */}
          {activeTab === 'blueprint' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  ⚡ Executive One-Line Summary
                </span>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {blueprint.one_line_summary || idea.raw_content}
                </p>
              </div>

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
            </div>
          )}

          {/* TAB 2: COMMUNITY POLL */}
          {activeTab === 'poll' && (
            <div className="space-y-4">
              <div className="bg-purple-950/30 p-3.5 rounded-xl border border-purple-500/20">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Instagram-Style Community Polling
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Ask the community for validation on design decisions, hardware choices, or pricing.
                </p>
              </div>
              <PollWidget ideaId={idea.id} initialPoll={idea.poll} canCreate={true} />
            </div>
          )}

          {/* TAB 3: COLLABORATOR QUEUE WITH AI SCREENING */}
          {activeTab === 'collabs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/30 p-3.5 rounded-xl border border-purple-500/20">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Collaborator Queue ({proposals.length})</span>
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    AI automatically analyzes seriousness and screens out low-effort or 'time-pass' spam
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAiScreening}
                    disabled={isScreening || proposals.length === 0}
                    className="gradient-btn text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50"
                  >
                    {isScreening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    <span>{isScreening ? 'Analyzing...' : 'Run AI Screening'}</span>
                  </button>
                  <button
                    onClick={() => onOpenCollab(idea)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    + Submit Offer
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 text-[11px] flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Filter:
                </span>
                <button
                  onClick={() => setCollabFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    collabFilter === 'all'
                      ? 'bg-purple-600/40 text-purple-200 border border-purple-500'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  All ({proposals.length})
                </button>
                <button
                  onClick={() => setCollabFilter('high_priority')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    collabFilter === 'high_priority'
                      ? 'bg-green-500/20 text-green-300 border border-green-500'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <span>✨ High Priority Only</span>
                </button>
                <button
                  onClick={() => setCollabFilter('time_pass')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    collabFilter === 'time_pass'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <span>⚠️ Flagged Low Effort</span>
                </button>
              </div>

              {filteredProposals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 space-y-1">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No collaboration proposals in this filter view.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProposals.map((p) => {
                    const score = p.ai_seriousness_score || 75;
                    const isHigh = p.ai_classification === 'genuine_serious' || score >= 80;
                    const isTimePass = p.ai_classification === 'low_effort_time_pass' || score < 50;
                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                          isHigh
                            ? 'bg-green-950/20 border-green-500/30'
                            : isTimePass
                            ? 'bg-amber-950/15 border-amber-500/30 opacity-80'
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">@{p.username || 'builder'}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
                              {p.role_type}
                            </span>
                          </div>

                          {/* AI Seriousness Score Badge */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                isHigh
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                                  : isTimePass
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              }`}
                            >
                              <span>AI Fit: {score}%</span>
                              <span>{isHigh ? '✨ Genuine' : isTimePass ? '⚠️ Time-Pass' : '⚡ Moderate'}</span>
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-200 leading-relaxed bg-black/30 p-2.5 rounded-lg border border-white/5">
                          "{p.pitch_message}"
                        </p>

                        {p.ai_rationale && (
                          <div className="text-[11px] text-gray-400 italic">
                            {p.ai_rationale}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TALENT OUTREACH (LINKEDIN / NAUKRI / GITHUB) */}
          {activeTab === 'talent' && (
            <div className="space-y-4">
              <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-500/30 space-y-1">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <LinkedInIcon className="w-4 h-4 text-[#0077b5]" />
                  Recruit Developers &amp; Freelancers on LinkedIn &amp; Naukri
                </h4>
                <p className="text-[11px] text-gray-300">
                  Nova AI automatically generates boolean talent search queries matching your required tech stack.
                </p>
              </div>

              {/* 1-Click Search Deep-Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={talentData?.links?.linkedin_search || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl bg-[#0077b5]/15 hover:bg-[#0077b5]/30 border border-[#0077b5]/40 text-blue-200 text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <LinkedInIcon className="w-5 h-5 text-[#0077b5]" />
                    <div>
                      <div className="font-bold">Search LinkedIn</div>
                      <div className="text-[10px] text-gray-400">Targeted Engineer Profiles</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={talentData?.links?.naukri_search || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl bg-orange-950/20 hover:bg-orange-950/40 border border-orange-500/40 text-orange-200 text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-orange-400" />
                    <div>
                      <div className="font-bold">Search Naukri</div>
                      <div className="text-[10px] text-gray-400">Freelancers &amp; Coders</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={talentData?.links?.github_search || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="font-bold">Search GitHub</div>
                      <div className="text-[10px] text-gray-400">Open-Source Contributors</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* 1-Click Viral LinkedIn Pitch Post Generator */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Auto-Generated LinkedIn "Looking for Builders" Post
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPitch}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] font-semibold flex items-center gap-1"
                    >
                      {copiedPitch ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPitch ? 'Copied!' : 'Copy Post'}</span>
                    </button>
                    <a
                      href={talentData?.links?.linkedin_share || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gradient-btn text-white px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow"
                    >
                      <LinkedInIcon className="w-3 h-3" />
                      <span>Share on LinkedIn</span>
                    </a>
                  </div>
                </div>

                <textarea
                  readOnly
                  rows={6}
                  value={talentData?.viral_pitch_post || 'Loading talent pitch...'}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-xs text-gray-300 font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 5: GOVERNMENT SCHEMES & STARTUP GRANTS */}
          {activeTab === 'schemes' && (
            <div className="space-y-4">
              <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-1">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  Government Schemes &amp; Startup Funding Intelligence
                </h4>
                <p className="text-[11px] text-gray-300">
                  Nova AI identified official central &amp; state funding programs tailored to your {idea.category} project.
                </p>
              </div>

              {/* Custom Website Portal Search Input */}
              <form onSubmit={handleAnalyzeCustomScheme} className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2">
                <label className="block text-[11px] font-bold text-gray-300">
                  Search &amp; Evaluate Against ANY Custom Scheme Website URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customSchemeUrl}
                    onChange={(e) => setCustomSchemeUrl(e.target.value)}
                    placeholder="e.g. https://www.startupindia.gov.in or your state portal"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingSchemes || !customSchemeUrl.trim()}
                    className="gradient-btn text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSearchingSchemes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Analyze Portal</span>
                  </button>
                </div>

                {customSchemeAnalysis && (
                  <div className="mt-3 p-3 bg-purple-950/30 border border-purple-500/30 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-cyan-300">
                      ✅ {customSchemeAnalysis.eligibility_fit}
                    </span>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      {customSchemeAnalysis.guidelines_summary}
                    </p>
                  </div>
                )}
              </form>

              {/* Matched Curated Schemes */}
              <div className="space-y-3">
                {schemes.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h5 className="font-bold text-white text-xs">{s.scheme_name}</h5>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-bold">
                        {s.max_grant_amount}
                      </span>
                    </div>

                    <div className="text-[10px] text-gray-400">
                      <b>Ministry / Agency:</b> {s.ministry}
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      {s.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                      <span className="text-amber-300 font-medium">
                        Target: {s.category}
                      </span>
                      <a
                        href={s.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: COMMENTS & OPINIONS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-950/30 border border-purple-500/20 rounded-xl text-xs space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  Community Reviews &amp; Opinions
                </span>
                <p className="text-[11px] text-gray-400">
                  Any User can share reviews, feedback, or suggestions directly with the Idea Poster.
                </p>
              </div>

              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    currentUser?.id === idea.user_id
                      ? "Reply to community users as the Idea Poster..."
                      : `Comment on @${idea.username}'s posted idea as a User...`
                  }
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="gradient-btn text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span className="btn-keep-white">
                    {currentUser?.id === idea.user_id ? 'Post as Poster' : 'Post as User'}
                  </span>
                </button>
              </form>

              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    No community opinions yet. Share your thoughts!
                  </div>
                ) : (
                  comments.map((c) => {
                    const isPoster = c.user_id === idea.user_id || c.username === idea.username;
                    const isMe = c.username === currentUser?.username;
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border space-y-1 transition-all ${
                          isPoster
                            ? 'bg-amber-950/20 border-amber-500/30 shadow-sm'
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              {c.display_name || c.username || 'User'}
                            </span>
                            <span className="text-gray-400 text-[10px]">@{c.username}</span>

                            {isPoster ? (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-extrabold">
                                💡 Poster
                              </span>
                            ) : (
                              <span className="text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.2 rounded font-medium">
                                👤 User
                              </span>
                            )}

                            {isMe && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 text-[10px]">{c.created_at || 'Recently'}</span>
                        </div>
                        <p className="text-xs text-gray-200 leading-relaxed pl-1 whitespace-pre-line">{c.content}</p>
                      </div>
                    );
                  })
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
