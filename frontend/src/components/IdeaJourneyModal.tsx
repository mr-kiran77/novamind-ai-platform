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
  RefreshCw,
  ArrowUpDown,
  Award,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { LinkedInIcon } from './SocialIcons';
import type { Idea, CollaborationProposal, GovernmentScheme } from '../types';
import { api } from '../services/api';
import { PollWidget } from './PollWidget';
import { IdeaCopilotTab } from './IdeaCopilotTab';

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
  const [activeTab, setActiveTab] = useState<'copilot' | 'blueprint' | 'poll' | 'collabs' | 'talent' | 'schemes' | 'comments'>('copilot');
  const [proposals, setProposals] = useState<CollaborationProposal[]>([]);
  const [collabFilter, setCollabFilter] = useState<'ALL' | 'HIGH_PRIORITY' | 'MEDIUM_PRIORITY' | 'LOW_PRIORITY' | 'NEEDS_REVIEW'>('ALL');
  const [collabSort, setCollabSort] = useState<'highest_score' | 'newest' | 'oldest'>('highest_score');
  const [isScreening, setIsScreening] = useState(false);
  const [analyzingCollabId, setAnalyzingCollabId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

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

  // AI Collaborator Screening (Batch / Force Re-analyze)
  const handleRunAiScreening = async (force: boolean = false) => {
    setIsScreening(true);
    try {
      const res = await api.screenCollaborations(idea.id, force);
      if (res && res.proposals) {
        setProposals(res.proposals);
      }
    } catch (e) {
      console.error('Failed to screen proposals:', e);
    } finally {
      setIsScreening(false);
    }
  };

  // Re-analyze single proposal
  const handleAnalyzeSingleProposal = async (collabId: string) => {
    setAnalyzingCollabId(collabId);
    try {
      const res = await api.analyzeProposal(idea.id, collabId, true);
      if (res && res.analysis) {
        setProposals(prev => prev.map(p => {
          if (p.id === collabId) {
            return {
              ...p,
              analysis: res.analysis,
              ai_seriousness_score: res.analysis.overall_score,
              ai_classification: res.analysis.category,
              ai_rationale: res.analysis.summary,
            };
          }
          return p;
        }));
      }
    } catch (e) {
      console.error('Failed to re-analyze proposal:', e);
    } finally {
      setAnalyzingCollabId(null);
    }
  };

  // Owner Accept / Decline control
  const handleUpdateStatus = async (collabId: string, status: 'accepted' | 'declined') => {
    setUpdatingStatusId(collabId);
    try {
      await api.updateCollaborationStatus(collabId, status);
      setProposals(prev => prev.map(p => (p.id === collabId ? { ...p, status } : p)));
    } catch (e: any) {
      alert(e.message || `Failed to update proposal to ${status}.`);
    } finally {
      setUpdatingStatusId(null);
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
      const res = await api.postComment(idea.id, newComment.trim());
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

  // Summary Metrics calculations
  const totalCount = proposals.length;
  const analyzedCount = proposals.filter(p => p.analysis || p.ai_seriousness_score !== undefined).length;
  const getProposalCategory = (p: CollaborationProposal) => {
    if (p.analysis?.category) return p.analysis.category;
    const s = p.ai_seriousness_score || 0;
    if (p.ai_classification === 'genuine_serious' || s >= 80) return 'HIGH_PRIORITY';
    if (p.ai_classification === 'moderate' || (s >= 60 && s < 80)) return 'MEDIUM_PRIORITY';
    if (p.ai_classification === 'low_effort_time_pass' || s < 40) return 'LOW_PRIORITY';
    return 'NEEDS_REVIEW';
  };

  const highPriorityCount = proposals.filter(p => getProposalCategory(p) === 'HIGH_PRIORITY').length;
  const mediumPriorityCount = proposals.filter(p => getProposalCategory(p) === 'MEDIUM_PRIORITY').length;
  const lowPriorityCount = proposals.filter(p => getProposalCategory(p) === 'LOW_PRIORITY').length;
  const needsReviewCount = proposals.filter(p => getProposalCategory(p) === 'NEEDS_REVIEW').length;

  // Filtered and Sorted proposals
  const filteredProposals = proposals
    .filter(p => {
      const cat = getProposalCategory(p);
      if (collabFilter === 'HIGH_PRIORITY') return cat === 'HIGH_PRIORITY';
      if (collabFilter === 'MEDIUM_PRIORITY') return cat === 'MEDIUM_PRIORITY';
      if (collabFilter === 'LOW_PRIORITY') return cat === 'LOW_PRIORITY';
      if (collabFilter === 'NEEDS_REVIEW') return cat === 'NEEDS_REVIEW';
      return true;
    })
    .sort((a, b) => {
      if (collabSort === 'highest_score') {
        const scoreA = a.analysis?.overall_score ?? a.ai_seriousness_score ?? 0;
        const scoreB = b.analysis?.overall_score ?? b.ai_seriousness_score ?? 0;
        return scoreB - scoreA;
      }
      if (collabSort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (collabSort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
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
            onClick={() => setActiveTab('copilot')}
            className={`pb-2 px-2.5 font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'copilot'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Idea Copilot</span>
            {idea.copilot_status === 'COMPLETED' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            ) : idea.copilot_status && ['PENDING', 'ANALYZING_IDEA', 'RESEARCHING', 'SYNTHESIZING'].includes(idea.copilot_status) ? (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            ) : null}
          </button>

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
          {/* TAB 0: IDEA COPILOT BACKGROUND INTELLIGENCE */}
          {activeTab === 'copilot' && (
            <IdeaCopilotTab idea={idea} />
          )}

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

          {/* TAB 3: COLLABORATOR QUEUE WITH AI SCREENING & OWNER SHORTLIST DASHBOARD */}
          {activeTab === 'collabs' && (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/30 p-4 rounded-xl border border-purple-500/20">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Owner Collaboration Dashboard &amp; Shortlist</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Gemini AI evaluates technical specifics, deliverables, and role fit while you retain 100% human decision control.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleRunAiScreening(false)}
                    disabled={isScreening || proposals.length === 0}
                    className="gradient-btn text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50"
                  >
                    {isScreening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    <span>{isScreening ? 'Screening Proposals...' : 'Run AI Screening'}</span>
                  </button>
                  <button
                    onClick={() => handleRunAiScreening(true)}
                    disabled={isScreening || proposals.length === 0}
                    title="Force Gemini to re-evaluate all proposals"
                    className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border border-white/10"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" />
                    <span>Re-Screen All</span>
                  </button>
                  <button
                    onClick={() => onOpenCollab(idea)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    + Submit Proposal
                  </button>
                </div>
              </div>

              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-white/[0.02] border border-white/10 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Total</span>
                  <span className="text-base font-extrabold text-white">{totalCount}</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold tracking-wider">High Priority</span>
                  <span className="text-base font-extrabold text-emerald-300">{highPriorityCount}</span>
                </div>
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-cyan-400 block uppercase font-bold tracking-wider">Medium Fit</span>
                  <span className="text-base font-extrabold text-cyan-300">{mediumPriorityCount}</span>
                </div>
                <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-amber-400 block uppercase font-bold tracking-wider">Needs Review</span>
                  <span className="text-base font-extrabold text-amber-300">{needsReviewCount}</span>
                </div>
                <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-rose-400 block uppercase font-bold tracking-wider">Low Effort</span>
                  <span className="text-base font-extrabold text-rose-300">{lowPriorityCount}</span>
                </div>
              </div>

              {/* Controls Bar: Filters & Sorting */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-y border-white/5 py-2.5">
                {/* Priority Category Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-gray-400 text-[11px] flex items-center gap-1 mr-1">
                    <Filter className="w-3 h-3" /> Filter:
                  </span>
                  <button
                    onClick={() => setCollabFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      collabFilter === 'ALL'
                        ? 'bg-purple-600/40 text-purple-200 border border-purple-500'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setCollabFilter('HIGH_PRIORITY')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      collabFilter === 'HIGH_PRIORITY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span>✨ High Priority ({highPriorityCount})</span>
                  </button>
                  <button
                    onClick={() => setCollabFilter('MEDIUM_PRIORITY')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      collabFilter === 'MEDIUM_PRIORITY'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span>⚡ Medium ({mediumPriorityCount})</span>
                  </button>
                  <button
                    onClick={() => setCollabFilter('NEEDS_REVIEW')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      collabFilter === 'NEEDS_REVIEW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span>🔍 Needs Review ({needsReviewCount})</span>
                  </button>
                  <button
                    onClick={() => setCollabFilter('LOW_PRIORITY')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      collabFilter === 'LOW_PRIORITY'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span>⚠️ Low Effort ({lowPriorityCount})</span>
                  </button>
                </div>

                {/* Sorting Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" /> Sort:
                  </span>
                  <select
                    value={collabSort}
                    onChange={(e) => setCollabSort(e.target.value as any)}
                    className="bg-[#121320] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="highest_score">Highest AI Score</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Proposals List */}
              {filteredProposals.length === 0 ? (
                <div className="text-center py-10 text-gray-500 space-y-1">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50 text-purple-400" />
                  <p className="text-xs">No collaboration proposals match this category filter.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProposals.map((p) => {
                    const analysis = p.analysis;
                    const overallScore = analysis?.overall_score ?? p.ai_seriousness_score ?? 70;
                    const category = analysis?.category ?? getProposalCategory(p);

                    const isHigh = category === 'HIGH_PRIORITY';
                    const isMed = category === 'MEDIUM_PRIORITY';
                    const isLow = category === 'LOW_PRIORITY';
                    const isReview = category === 'NEEDS_REVIEW';

                    const isThisAnalyzing = analyzingCollabId === p.id;
                    const isThisUpdating = updatingStatusId === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border transition-all space-y-3.5 ${
                          isHigh
                            ? 'bg-emerald-950/20 border-emerald-500/35 shadow-lg shadow-emerald-950/20'
                            : isMed
                            ? 'bg-cyan-950/15 border-cyan-500/25'
                            : isReview
                            ? 'bg-amber-950/15 border-amber-500/25'
                            : 'bg-rose-950/15 border-rose-500/25 opacity-85'
                        }`}
                      >
                        {/* Header: Candidate & Badges */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={p.username}
                              className="w-8 h-8 rounded-lg object-cover border border-white/10"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">@{p.username || 'builder'}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                                  {p.role_type}
                                </span>
                                {/* Owner Decision Status */}
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    p.status === 'accepted'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : p.status === 'declined'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : 'bg-white/5 text-gray-400 border-white/10'
                                  }`}
                                >
                                  {p.status === 'accepted' ? '✓ Accepted Collaborator' : p.status === 'declined' ? '✕ Declined' : 'Pending Owner Review'}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-500">
                                Applied {new Date(p.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Overall Score Badge */}
                          <div className="flex items-center gap-2">
                            <div
                              className={`px-3 py-1 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border ${
                                isHigh
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : isMed
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : isReview
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>{overallScore}% Match</span>
                              <span>•</span>
                              <span className="text-[10px] tracking-wide">
                                {isHigh ? 'HIGH PRIORITY' : isMed ? 'MEDIUM' : isReview ? 'NEEDS REVIEW' : 'LOW EFFORT'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ORIGINAL PROPOSAL */}
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                            Original Proposal:
                          </span>
                          <p className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-line">
                            "{p.pitch_message}"
                          </p>
                        </div>

                        {/* AI EVALUATION BREAKDOWN */}
                        <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-gray-300 font-semibold border-b border-white/5 pb-1.5">
                            <span className="flex items-center gap-1.5 text-cyan-300">
                              <Sparkles className="w-3.5 h-3.5" />
                              Gemini AI Technical Evaluation
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 font-mono">
                                {analysis?.model_version || 'Gemini 2.5 Flash'}
                              </span>
                              <button
                                onClick={() => handleAnalyzeSingleProposal(p.id)}
                                disabled={isThisAnalyzing}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 p-0.5 hover:underline"
                                title="Re-evaluate with Gemini"
                              >
                                {isThisAnalyzing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                <span>{isThisAnalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Sub-Score Bars (Relevance, Specificity, Contribution, Commitment) */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                            <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-400">Relevance</span>
                                <span className="font-bold text-white font-mono">{analysis?.relevance_score ?? overallScore}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${analysis?.relevance_score ?? overallScore}%` }} />
                              </div>
                            </div>

                            <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-400">Specificity</span>
                                <span className="font-bold text-white font-mono">{analysis?.specificity_score ?? overallScore}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${analysis?.specificity_score ?? overallScore}%` }} />
                              </div>
                            </div>

                            <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-400">Contribution</span>
                                <span className="font-bold text-white font-mono">{analysis?.contribution_value_score ?? overallScore}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${analysis?.contribution_value_score ?? overallScore}%` }} />
                              </div>
                            </div>

                            <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-400">Commitment</span>
                                <span className="font-bold text-white font-mono">{analysis?.commitment_score ?? overallScore}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${analysis?.commitment_score ?? overallScore}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* AI Summary Statement */}
                          {(analysis?.summary || p.ai_rationale) && (
                            <p className="text-[11px] text-gray-300 leading-relaxed italic bg-black/20 p-2 rounded-lg">
                              💡 {analysis?.summary || p.ai_rationale}
                            </p>
                          )}

                          {/* Strengths & Concerns Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                            {/* Strengths */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                                Identified Strengths:
                              </span>
                              {(analysis?.strengths && analysis.strengths.length > 0
                                ? analysis.strengths
                                : ['Concrete technical alignment', 'Actionable contribution stated']
                              ).map((st: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-1.5 text-gray-300">
                                  <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{st}</span>
                                </div>
                              ))}
                            </div>

                            {/* Concerns */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                                Technical Gaps / Questions:
                              </span>
                              {(analysis?.concerns && analysis.concerns.length > 0
                                ? analysis.concerns
                                : ['Validate weekly timeline in kick-off call']
                              ).map((co: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-1.5 text-gray-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                  <span>{co}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* HUMAN OWNER DECISION CONTROLS */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 flex-wrap gap-2">
                          <span className="text-[11px] text-gray-400">
                            Founder Decision (Owner Control):
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'declined')}
                              disabled={isThisUpdating || p.status === 'declined'}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                p.status === 'declined'
                                  ? 'bg-rose-950/40 text-rose-300 border border-rose-500/40 cursor-default'
                                  : 'bg-white/5 hover:bg-rose-900/30 text-gray-300 hover:text-rose-200 border border-white/10'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3 text-rose-400" />
                              <span>{p.status === 'declined' ? 'Declined' : 'Decline'}</span>
                            </button>

                            <button
                              onClick={() => handleUpdateStatus(p.id, 'accepted')}
                              disabled={isThisUpdating || p.status === 'accepted'}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow ${
                                p.status === 'accepted'
                                  ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/50 cursor-default'
                                  : 'gradient-btn text-white shadow-emerald-500/20'
                              }`}
                            >
                              {isThisUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ThumbsUp className="w-3 h-3 text-cyan-300" />
                              )}
                              <span>{p.status === 'accepted' ? '✓ Accepted' : 'Accept as Collaborator'}</span>
                            </button>
                          </div>
                        </div>
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
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your opinion, critique, or advice on this idea..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="gradient-btn text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Opinion</span>
                </button>
              </form>

              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    No community opinions yet. Share your thoughts!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple-300">{c.display_name || c.username || 'Innovator'}</span>
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
