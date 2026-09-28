import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Volume2,
  VolumeX,
  Lightbulb,
  Loader2,
  ShieldAlert,
  Cpu,
  TrendingUp,
  Play,
  CheckCircle2,
  Search,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import type { Idea } from '../types';

interface NovaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeIdea?: Idea | null;
}

interface Message {
  id: string;
  sender: 'user' | 'nova';
  text: string;
  timestamp: string;
}

export const NovaDrawer: React.FC<NovaDrawerProps> = ({
  isOpen,
  onClose,
  activeIdea,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'swarm'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'nova',
      text: "👋 Hi! I'm Nova, your AI Innovation Mentor and System Architect powered by Gemini 3.8 Flash. How can I help develop your ideas today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Swarm state
  const [swarmData, setSwarmData] = useState<any>(null);
  const [swarmSquadFilter, setSwarmSquadFilter] = useState<'all' | 'domain' | 'risk' | 'angel'>('all');
  const [swarmSearch, setSwarmSearch] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  useEffect(() => {
    if (activeIdea) {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'nova',
          text: `🔍 I see you are inspecting "${activeIdea.title}". Ask me about tech stack choices, risk mitigation, or trigger a 50-Agent Swarm Audit!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [activeIdea]);

  useEffect(() => {
    if (activeTab === 'swarm' && !swarmData) {
      api.getSwarm().then(setSwarmData).catch(console.error);
    }
  }, [activeTab, swarmData]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.chatWithNova(userMsg.text, activeIdea?.id);
      const novaReply = response.reply || "I analyzed your question, but received an empty response. Let's try rephrasing!";
      
      const novaMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'nova',
        text: novaReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, novaMsg]);
      speakText(novaReply);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'nova',
          text: `⚠️ Network error: ${err.message || 'Could not reach Nova agent'}. Ensure the backend server is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSwarmAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await api.runSwarmAudit(activeIdea?.id, activeIdea?.title || "Autonomous Innovation Concept");
      setAuditResult(res);
      if (voiceEnabled && res.consensus_summary) {
        speakText(res.consensus_summary);
      }
    } catch (err: any) {
      console.error("Swarm audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  if (!isOpen) return null;

  const quickPrompts = [
    'How would you validate this idea with 10 users?',
    'What are the biggest failure points?',
    'Suggest 3 high-impact collaboration roles',
    'Write a 60-second investor elevator pitch',
  ];

  // Filter swarm agents
  const getAllAgents = () => {
    if (!swarmData?.squads) return [];
    if (swarmSquadFilter === 'domain') return swarmData.squads.domain_specialists || [];
    if (swarmSquadFilter === 'risk') return swarmData.squads.risk_auditors || [];
    if (swarmSquadFilter === 'angel') return swarmData.squads.angel_scouts || [];
    return [
      ...(swarmData.squads.domain_specialists || []),
      ...(swarmData.squads.risk_auditors || []),
      ...(swarmData.squads.angel_scouts || []),
    ];
  };

  const filteredAgents = getAllAgents().filter((a: any) =>
    a.name.toLowerCase().includes(swarmSearch.toLowerCase()) ||
    a.role.toLowerCase().includes(swarmSearch.toLowerCase()) ||
    a.category.toLowerCase().includes(swarmSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-[#0c0d15]/95 backdrop-blur-2xl border-l border-purple-500/20 shadow-2xl flex flex-col transition-all">
      {/* Drawer Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white">Nova AI Platform Co-Pilot</h3>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded-full font-bold">
                Gemini 3.8
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Autonomous 50-Agent Engineering Swarm</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? 'Disable Voice Narration' : 'Enable Voice Narration'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              voiceEnabled
                ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-purple-300" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center border-b border-white/10 bg-black/30 px-4 py-2 gap-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>Innovation Mentor</span>
        </button>
        <button
          onClick={() => setActiveTab('swarm')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'swarm'
              ? 'bg-gradient-to-r from-purple-600/40 to-cyan-500/40 text-cyan-200 border border-cyan-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>50-Agent Swarm</span>
          <span className="text-[9px] bg-purple-500/30 px-1.5 rounded-full text-purple-200 font-extrabold">50</span>
        </button>
      </div>

      {/* Active Context Banner */}
      {activeIdea && (
        <div className="bg-purple-950/30 border-b border-purple-500/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate text-purple-200">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Context: <b>{activeIdea.title}</b></span>
          </div>
          <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-300 shrink-0">
            {activeIdea.category}
          </span>
        </div>
      )}

      {/* Tab 1: Chat Co-Pilot */}
      {activeTab === 'chat' && (
        <>
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                    m.sender === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gradient-to-tr from-purple-500 to-cyan-400 text-white shadow-md'
                  }`}
                >
                  {m.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-1 ${
                    m.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-none'
                      : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none shadow-lg'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div className={`text-[9px] ${m.sender === 'user' ? 'text-purple-200' : 'text-gray-500'} text-right`}>
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3 text-xs text-gray-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Nova is synthesizing architecture &amp; feasibility insights...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Suggestion Prompt Chips */}
          <div className="p-3 border-t border-white/5 bg-black/20">
            <div className="text-[10px] text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
              Suggested Action Chips:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-[10px] bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-gray-300 hover:text-purple-200 px-2.5 py-1 rounded-lg transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-white/10 bg-[#0a0b10]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Nova anything about your idea or project..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="gradient-btn text-white p-2.5 rounded-xl disabled:opacity-50 hover:scale-105 transition-transform"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}

      {/* Tab 2: 50-Agent Autonomous Swarm */}
      {activeTab === 'swarm' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Swarm Launch Card */}
          <div className="glass-panel p-4 rounded-2xl border-purple-500/30 bg-purple-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs">
                  50
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Autonomous Innovation Swarm</h4>
                  <p className="text-[10px] text-gray-400">15 Specialists • 15 Risk Auditors • 20 Angel Scouts</p>
                </div>
              </div>
              <button
                onClick={handleRunSwarmAudit}
                disabled={isAuditing}
                className="gradient-btn text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Swarm Audit</span>
                  </>
                )}
              </button>
            </div>

            {/* Audit Results Dashboard */}
            {auditResult && (
              <div className="p-3.5 rounded-xl bg-black/50 border border-cyan-500/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Swarm Consensus Audit Report
                  </span>
                  <span className="text-xs font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {auditResult.swarm_metrics?.overall_consensus_score}% Score
                  </span>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                    <div className="text-[10px] text-gray-400">Domain Fit</div>
                    <div className="text-sm font-black text-cyan-300">{auditResult.swarm_metrics?.domain_feasibility_score}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                    <div className="text-[10px] text-gray-400">Risk Index</div>
                    <div className="text-sm font-black text-rose-300">{auditResult.swarm_metrics?.risk_index_score}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                    <div className="text-[10px] text-gray-400">Angel Appeal</div>
                    <div className="text-sm font-black text-green-300">{auditResult.swarm_metrics?.angel_attractiveness_score}%</div>
                  </div>
                </div>

                {/* Blindspots Flagged */}
                {auditResult.blindspots_detected?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-rose-300 flex items-center gap-1 mb-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      Critical Blindspots Flagged:
                    </div>
                    <ul className="space-y-1">
                      {auditResult.blindspots_detected.map((b: string, idx: number) => (
                        <li key={idx} className="text-[11px] text-gray-300 bg-rose-950/20 border border-rose-500/20 p-2 rounded-lg">
                          • {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Consensus Summary */}
                <p className="text-[11px] text-gray-300 leading-relaxed bg-purple-950/30 p-2 rounded-lg border border-purple-500/20">
                  {auditResult.consensus_summary}
                </p>
              </div>
            )}
          </div>

          {/* Squad Filter Pills & Search */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSwarmSquadFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                  swarmSquadFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                All Agents (50)
              </button>
              <button
                onClick={() => setSwarmSquadFilter('domain')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                  swarmSquadFilter === 'domain'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                Domain Specialists (15)
              </button>
              <button
                onClick={() => setSwarmSquadFilter('risk')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                  swarmSquadFilter === 'risk'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                Risk Auditors (15)
              </button>
              <button
                onClick={() => setSwarmSquadFilter('angel')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
                  swarmSquadFilter === 'angel'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                Angel Scouts (20)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                value={swarmSearch}
                onChange={(e) => setSwarmSearch(e.target.value)}
                placeholder="Search active agents by role or capability..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Active Agents Grid */}
          <div className="space-y-2">
            {filteredAgents.map((agent: any) => (
              <div
                key={agent.id}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 transition-colors flex items-start justify-between gap-3 group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                      {agent.name}
                    </span>
                    <span className="text-[9px] bg-white/10 text-gray-300 px-1.5 py-0.2 rounded font-semibold">
                      {agent.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">{agent.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-green-400 font-mono font-bold block">
                    {Math.round(agent.confidence * 100)}%
                  </span>
                  <span className="text-[9px] text-gray-500">Confidence</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
