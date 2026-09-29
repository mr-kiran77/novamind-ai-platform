import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Landmark,
  ShieldAlert,
  Scale,
  DollarSign,
  Lightbulb,
  Award,
  TrendingUp,
  Calendar,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Loader2,
  Clock,
  Layers,
  FileText,
  HelpCircle,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { Idea, IdeaCopilotData, CopilotReport, CopilotState } from '../types';

interface IdeaCopilotTabProps {
  idea: Idea;
  onRefreshIdea?: () => void;
}

export const IdeaCopilotTab: React.FC<IdeaCopilotTabProps> = ({ idea, onRefreshIdea }) => {
  const [copilotData, setCopilotData] = useState<IdeaCopilotData | null>(idea.copilot || null);
  const [isLoading, setIsLoading] = useState<boolean>(!idea.copilot);
  const [isReRunning, setIsReRunning] = useState<boolean>(false);
  const [activeSubSection, setActiveSubSection] = useState<
    'all' | 'schemes' | 'legal' | 'safety' | 'tax' | 'ip' | 'standards' | 'improvements'
  >('all');
  const [jurisdictionInput, setJurisdictionInput] = useState<string>(idea.jurisdiction || '');
  const [showJurisdictionEdit, setShowJurisdictionEdit] = useState<boolean>(false);

  // Poll status while background job is running
  useEffect(() => {
    let interval: any = null;

    const fetchReport = async () => {
      try {
        const res = await api.getCopilotReport(idea.id);
        if (res) {
          setCopilotData(res);
          // If state reached terminal state, clear polling
          if (res.status === 'COMPLETED' || res.status === 'FAILED') {
            if (interval) clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Failed to load Idea Copilot status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();

    // Check if active job is running
    const state = copilotData?.status || idea.copilot_status;
    const isRunning = state && ['PENDING', 'ANALYZING_IDEA', 'RESEARCHING', 'SYNTHESIZING'].includes(state);

    if (isRunning || !copilotData || copilotData.status === 'NOT_STARTED') {
      interval = setInterval(fetchReport, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [idea.id, copilotData?.status, idea.copilot_status]);

  const handleTriggerRun = async (force: boolean = true) => {
    setIsReRunning(true);
    try {
      await api.runCopilot(idea.id, force, jurisdictionInput.trim() || undefined);
      setCopilotData(prev => ({
        ...(prev || { idea_id: idea.id, report: null }),
        status: 'PENDING',
        current_step: 'Queued for Idea Copilot background multimodal analysis & research...',
        progress: 10,
        jurisdiction: jurisdictionInput.trim() || prev?.jurisdiction || '',
      }));
      setShowJurisdictionEdit(false);
      if (onRefreshIdea) onRefreshIdea();
    } catch (err: any) {
      alert(err.message || 'Failed to trigger Idea Copilot.');
    } finally {
      setIsReRunning(false);
    }
  };

  const report: CopilotReport | null = copilotData?.report || null;
  const status: CopilotState = copilotData?.status || 'PENDING';
  const progress: number = copilotData?.progress || 10;
  const currentStep: string = copilotData?.current_step || 'Initializing background intelligence...';
  const isAnalyzing = ['PENDING', 'ANALYZING_IDEA', 'RESEARCHING', 'SYNTHESIZING'].includes(status);

  // State status badge helper
  const getStatusBadge = () => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified Grounded Intelligence
          </span>
        );
      case 'ANALYZING_IDEA':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            Multimodal Analysis (25%)
          </span>
        );
      case 'RESEARCHING':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
            <Search className="w-3.5 h-3.5 animate-spin text-purple-400" />
            Google Search Grounding (60%)
          </span>
        );
      case 'SYNTHESIZING':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
            Synthesizing Report (85%)
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Analysis Incomplete
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Queued in Background
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-xs text-gray-200">
      {/* 1. HERO COPILOT BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-cyan-950/60 border border-purple-500/30 p-5 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  NovaMind Idea Copilot
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-gray-300 mt-1 max-w-xl">
                Background co-assistant & research analyst powered by Google Gemini with real-time web search grounding.
              </p>

              {/* Jurisdiction & Metadata Chips */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap text-[11px]">
                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-cyan-300">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold">
                    Jurisdiction: {copilotData?.jurisdiction || idea.jurisdiction || 'Global / Generalized'}
                  </span>
                  <button
                    onClick={() => setShowJurisdictionEdit(!showJurisdictionEdit)}
                    className="text-gray-400 hover:text-white underline ml-1 text-[10px]"
                  >
                    {showJurisdictionEdit ? 'Cancel' : 'Change'}
                  </button>
                </div>

                {report?.research_status?.last_verified && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-gray-400">
                    <Calendar className="w-3 h-3 text-purple-400" />
                    <span>Verified: {report.research_status.last_verified}</span>
                  </div>
                )}

                {report?.sources && report.sources.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-emerald-300">
                    <Search className="w-3 h-3 text-emerald-400" />
                    <span>{report.sources.length} Grounded Web Citations</span>
                  </div>
                )}
              </div>

              {/* Edit Jurisdiction Inline Form */}
              {showJurisdictionEdit && (
                <div className="mt-3 flex items-center gap-2 bg-black/60 p-2.5 rounded-xl border border-purple-500/40 max-w-md">
                  <input
                    type="text"
                    value={jurisdictionInput}
                    onChange={(e) => setJurisdictionInput(e.target.value)}
                    placeholder="e.g. India, United States, Germany..."
                    className="bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 flex-1"
                  />
                  <button
                    onClick={() => handleTriggerRun(true)}
                    disabled={isReRunning}
                    className="gradient-btn text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50"
                  >
                    {isReRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    <span>Update & Re-run</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => handleTriggerRun(true)}
              disabled={isReRunning || isAnalyzing}
              className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-purple-900/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isReRunning || isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Re-run Copilot'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar if Analyzing */}
        {isAnalyzing && (
          <div className="mt-5 space-y-2 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-300 font-semibold flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                {currentStep}
              </span>
              <span className="font-mono text-purple-300 font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-700 ease-out"
                style={{ width: `${Math.max(10, progress)}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-400 pt-1">
              <div className={progress >= 25 ? 'text-cyan-300 font-bold' : ''}>1. Multimodal Intake</div>
              <div className={progress >= 60 ? 'text-purple-300 font-bold' : ''}>2. Google Search Grounding</div>
              <div className={progress >= 85 ? 'text-amber-300 font-bold' : ''}>3. Regulatory Scoping</div>
              <div className={progress >= 100 ? 'text-emerald-300 font-bold' : ''}>4. Actionable Report</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. LOADING PLACEHOLDER */}
      {isLoading && (
        <div className="p-12 text-center space-y-3 bg-black/30 rounded-2xl border border-white/10">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-gray-300 text-xs font-semibold">Connecting to Idea Copilot neural engine...</p>
        </div>
      )}

      {/* 3. REPORT CONTENT (Rendered when available) */}
      {!isLoading && report && (
        <div className="space-y-6">
          {/* SECTION A: MULTIMODAL CONCEPT UNDERSTANDING & SUMMARY */}
          {report.idea_understanding && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Multimodal Concept Distillation
                </h4>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Sector: {report.idea_understanding.sector || idea.category}
                </span>
              </div>

              <p className="text-xs text-gray-200 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5 font-medium">
                {report.idea_understanding.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Core Problem Solved
                  </span>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {report.idea_understanding.problem}
                  </p>
                </div>

                <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Proposed Technical Solution
                  </span>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {report.idea_understanding.solution}
                  </p>
                </div>
              </div>

              {/* Target Beneficiaries */}
              {report.idea_understanding.target_users && report.idea_understanding.target_users.length > 0 && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-[11px] font-bold text-gray-400">Target Beneficiaries:</span>
                  {report.idea_understanding.target_users.map((u, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-300"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: TOP IMMEDIATE ACTIONS CHECKLIST */}
          {report.top_actions && report.top_actions.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                Top High-Leverage Actions (Founder Sprint Checklist)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.top_actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-black/40 rounded-xl border border-white/10 hover:border-cyan-500/40 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white text-xs leading-snug">
                        {idx + 1}. {act.title}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          act.priority === 'HIGH'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {act.priority}
                      </span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      {act.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                      <span>Category: {act.category || 'Sprint'}</span>
                      <span className="text-cyan-300 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {act.timeframe || 'Immediate'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION C: SUB-SECTION NAVIGATION FILTER PILLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {[
              { id: 'all', label: 'All Intel' },
              { id: 'schemes', label: `🏛️ Govt Schemes (${report.government_support?.length || 0})` },
              { id: 'legal', label: `⚖️ Legal & Regulations (${report.legal_regulatory?.length || 0})` },
              { id: 'safety', label: `🛡️ Safety & Ethics (${report.safety_and_ethics?.length || 0})` },
              { id: 'tax', label: `💰 Tax Compliance (${report.tax_compliance?.length || 0})` },
              { id: 'ip', label: `💡 Patents & IP (${report.intellectual_property?.length || 0})` },
              { id: 'standards', label: `📜 Standards (${report.standards_certifications?.length || 0})` },
              { id: 'improvements', label: `🚀 Improvements (${report.idea_improvements?.length || 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubSection(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  activeSubSection === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 1. GOVERNMENT SCHEMES & SUPPORT */}
          {(activeSubSection === 'all' || activeSubSection === 'schemes') && (
            <div className="glass-panel p-5 rounded-2xl border-amber-500/20 bg-amber-950/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-amber-400" />
                    Government Schemes, Grants &amp; Incubators
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Official funding mechanisms and subsidies matched to your sector in {copilotData?.jurisdiction || idea.jurisdiction || 'your jurisdiction'}.
                  </p>
                </div>
              </div>

              {report.government_support && report.government_support.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {report.government_support.map((sch, i) => (
                    <div
                      key={i}
                      className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-bold text-white text-xs leading-snug">
                            {sch.scheme_name}
                          </h5>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                            Grant / Support
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-300 font-semibold">{sch.agency}</p>
                        <p className="text-gray-300 text-xs leading-relaxed font-medium">
                          <strong className="text-white">Benefit: </strong>
                          {sch.benefit}
                        </p>
                        <p className="text-gray-400 text-[11px]">
                          <strong className="text-gray-300">Eligibility: </strong>
                          {sch.eligibility}
                        </p>
                        {sch.application_tip && (
                          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] text-cyan-300">
                            💡 <span className="font-bold text-white">Application Tip: </span>{sch.application_tip}
                          </div>
                        )}
                      </div>

                      {sch.link && (
                        <a
                          href={sch.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold transition-all"
                        >
                          <span>Visit Official Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs">No specific grants found for this domain.</p>
              )}
            </div>
          )}

          {/* 2. LEGAL & REGULATORY ROADMAP */}
          {(activeSubSection === 'all' || activeSubSection === 'legal') && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-400" />
                Legal, Statutory &amp; Regulatory Frameworks
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {report.legal_regulatory?.map((leg, i) => (
                  <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-white text-xs">{leg.regulation}</h5>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          leg.risk_level === 'High'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {leg.risk_level || 'Regulated'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">Enforcing Authority: {leg.governing_body}</p>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      <strong className="text-white">Requirement: </strong>{leg.requirement}
                    </p>
                    <div className="p-2 rounded-lg bg-purple-950/20 border border-purple-500/20 text-[11px] text-purple-200">
                      <strong>Compliance Action: </strong>{leg.compliance_step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. SAFETY & ETHICS */}
          {(activeSubSection === 'all' || activeSubSection === 'safety') && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Safety, Ethics, Cyber &amp; Environmental Safeguards
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.safety_and_ethics?.map((saf, i) => (
                  <div key={i} className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                        {saf.category}
                      </span>
                    </div>
                    <h5 className="font-bold text-white text-xs">{saf.risk_factor}</h5>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      <strong className="text-gray-200">Mitigation: </strong>{saf.mitigation_strategy}
                    </p>
                    {saf.safeguard_recommendation && (
                      <p className="text-[10px] text-cyan-300 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                        🛡️ {saf.safeguard_recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. TAX & FINANCIAL COMPLIANCE */}
          {(activeSubSection === 'all' || activeSubSection === 'tax') && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Tax Compliance &amp; Lawful Statutory Incentives
                </h4>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                  Lawful Obligations Only
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {report.tax_compliance?.map((tx, i) => (
                  <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-2">
                    <h5 className="font-bold text-white text-xs">{tx.topic}</h5>
                    <p className="text-emerald-300 text-xs font-medium">
                      {tx.obligation_or_incentive}
                    </p>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      {tx.guideline}
                    </p>
                    {tx.disclaimer_note && (
                      <p className="text-[10px] text-gray-500 italic border-t border-white/5 pt-1.5">
                        Note: {tx.disclaimer_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. INTELLECTUAL PROPERTY & PATENTS */}
          {(activeSubSection === 'all' || activeSubSection === 'ip') && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Intellectual Property, Patents &amp; Open Source
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.intellectual_property?.map((ip, i) => (
                  <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-2">
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                      {ip.type}
                    </span>
                    <h5 className="font-bold text-white text-xs leading-snug">{ip.recommendation}</h5>
                    <p className="text-gray-300 text-[11px]">
                      <strong className="text-gray-200">Filing Strategy: </strong>{ip.filing_strategy}
                    </p>
                    {ip.potential_prior_art_risk && (
                      <p className="text-[10px] text-rose-300 bg-rose-950/20 p-2 rounded-lg border border-rose-500/20">
                        Prior Art Note: {ip.potential_prior_art_risk}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. STANDARDS & CERTIFICATIONS */}
          {(activeSubSection === 'all' || activeSubSection === 'standards') && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                Industry Standards &amp; Certifications (ISO / SOC / IEEE)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.standards_certifications?.map((std, i) => (
                  <div key={i} className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-1.5">
                    <h5 className="font-bold text-white text-xs">{std.standard}</h5>
                    <p className="text-[10px] text-cyan-300 font-semibold">{std.issuing_organization}</p>
                    <p className="text-gray-300 text-[11px] leading-relaxed">{std.scope}</p>
                    <span className="inline-block text-[9px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-md mt-1 font-mono">
                      Target: {std.readiness_stage || 'MVP Stage'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. MARKET CONTEXT & MVP IMPROVEMENTS */}
          {(activeSubSection === 'all' || activeSubSection === 'improvements') && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Market Context &amp; MVP Feature Improvements
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {report.idea_improvements?.map((imp, i) => (
                  <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 text-xs">{imp.dimension}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          imp.mvp_priority === 'Critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {imp.mvp_priority || 'Recommended'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-[11px]">
                      <strong className="text-gray-300">Identified Gap: </strong>{imp.gap_identified}
                    </p>
                    <p className="text-gray-200 text-xs leading-relaxed bg-white/[0.02] p-2.5 rounded-lg border border-white/5 font-medium">
                      💡 <strong className="text-white">Enhancement: </strong>{imp.suggested_enhancement}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION D: 4-PHASE EXECUTION ROADMAP */}
          {report.execution_plan && report.execution_plan.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Recommended Execution Phases &amp; Milestones
              </h4>
              <div className="space-y-2">
                {report.execution_plan.map((phase, i) => (
                  <div
                    key={i}
                    className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-xs text-gray-200 font-medium leading-relaxed">
                      {phase}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION E: RISKS & UNKNOWNS */}
          {report.risks_and_unknowns && report.risks_and_unknowns.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Key Strategic Risks &amp; Mitigation Matrix
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.risks_and_unknowns.map((r, i) => (
                  <div key={i} className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">{r.risk}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          r.impact === 'High'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {r.impact}
                      </span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      <strong>Tactic: </strong>{r.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION F: GROUNDED WEB CITATIONS */}
          {report.sources && report.sources.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border-white/10 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                Grounded Web Sources &amp; Citations ({report.sources.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {report.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-white group-hover:text-emerald-300 line-clamp-1">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-2">
                        <span>{s.publisher}</span>
                        <span>•</span>
                        <span className="font-mono text-gray-500 truncate max-w-[200px]">{s.url}</span>
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* SECTION G: MANDATORY STANDARD DISCLAIMERS */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5 text-[11px] text-amber-200/90 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Standard Regulatory, Legal &amp; Financial Disclaimer</span>
            </div>
            <p>
              {report.disclaimers && report.disclaimers[0] ? report.disclaimers[0] : (
                "Idea Copilot produces informational artificial intelligence synthesis and web-grounded research only. This does NOT constitute formal legal, taxation, investment, financial, or medical advice. Innovators must verify regulatory compliance and statutory eligibility with certified attorneys, chartered accountants, and competent government authorities prior to execution."
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
