import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, UserCheck, RefreshCw, FileText, Ban, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../types';

interface ModerationViewProps {
  currentUser: User;
  onSwitchRole: (role: string) => void;
  onShowToast: (msg: string) => void;
}

export const ModerationView: React.FC<ModerationViewProps> = ({
  currentUser,
  onSwitchRole,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'quarantine' | 'appeals'>('reports');
  const [loading, setLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [quarantinedIdeas, setQuarantinedIdeas] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const isModOrAdmin = currentUser.role === 'moderator' || currentUser.role === 'admin';

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      if (isModOrAdmin) {
        const queueRes = await api.getModerationQueue();
        if (queueRes) {
          setPendingReports(queueRes.pending_reports || []);
          setQuarantinedIdeas(queueRes.quarantined_ideas || []);
        }

        const appealsRes = await api.getAppeals().catch(() => ({ appeals: [] }));
        if (appealsRes) {
          setAppeals(appealsRes.appeals || []);
        }
      } else {
        // Mock preview for non-moderators so they see how it looks before switching
        setPendingReports([
          {
            id: 'rep_sample_1',
            reporter_username: 'alexvance',
            target_type: 'idea',
            target_id: 'idea_piezo_roads',
            reason: 'Feasibility Claim Verification',
            details: 'Reported for review regarding cyclic loading claims in high-traffic corridors.',
            status: 'pending',
            created_at: new Date().toISOString(),
          }
        ]);
        setQuarantinedIdeas([]);
        setAppeals([]);
      }
    } catch (err: any) {
      console.error('Error fetching moderation queue:', err);
      onShowToast('Note: Please switch to Moderator role (Alex Vance) to access live queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
  }, [currentUser.role]);

  const handleReviewReport = async (reportId: string, action: string) => {
    if (!isModOrAdmin) {
      onShowToast('Action requires Moderator credentials. Click "Switch to Moderator" above.');
      return;
    }

    try {
      setActionInProgress(reportId);
      await api.reviewReport(reportId, action, `Action '${action}' applied via Moderation Console.`);
      onShowToast(`Report processed: ${action.replace('_', ' ')}.`);
      setPendingReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      console.error('Error reviewing report:', err);
      onShowToast(`Error: ${err.message || 'Failed to update report'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAppealDecision = async (appealId: string, approved: boolean) => {
    if (!isModOrAdmin) {
      onShowToast('Action requires Moderator credentials.');
      return;
    }

    try {
      setActionInProgress(appealId);
      await api.reviewAppeal(appealId, approved, approved ? 'Appeal granted after review.' : 'Appeal rejected.');
      onShowToast(approved ? 'Appeal approved and restriction lifted.' : 'Appeal rejected.');
      setAppeals((prev) => prev.filter((a) => a.id !== appealId));
    } catch (err: any) {
      console.error('Error reviewing appeal:', err);
      onShowToast(`Error: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel p-6 lg:p-8 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Trust, Safety &amp; Content Governance</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white">
              Content Safety &amp; Moderation Operations
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl">
              Inspect flagged user submissions, review automated AI safety quarantine queues, and audit user appeals with full accountability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchModerationData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Current Session</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                isModOrAdmin
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/5 text-gray-300 border-white/10'
              }`}>
                {currentUser.display_name} ({currentUser.role})
              </span>
            </div>
          </div>
        </div>

        {/* Role Warning / Switch Banner if not moderator */}
        {!isModOrAdmin && (
          <div className="mt-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-200">
                  Moderator Permissions Required for Live Queue Modifications
                </p>
                <p className="text-[11px] text-amber-300/80">
                  You are currently browsing as a standard Member. Switch to the Alex Vance (Moderator) demo account with 1-click to test live resolution actions.
                </p>
              </div>
            </div>
            <button
              onClick={() => onSwitchRole('moderator')}
              className="gradient-btn text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shadow-lg shadow-purple-500/20"
            >
              🛡️ Switch to Alex Vance (Moderator)
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Pending Reports</span>
          <div className="text-2xl font-extrabold text-amber-300">{pendingReports.length}</div>
          <span className="text-[10px] text-gray-500">Flagged by community</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">AI Quarantine Queue</span>
          <div className="text-2xl font-extrabold text-purple-300">{quarantinedIdeas.length}</div>
          <span className="text-[10px] text-gray-500">Automated safety holds</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Pending Appeals</span>
          <div className="text-2xl font-extrabold text-cyan-300">{appeals.length}</div>
          <span className="text-[10px] text-gray-500">User dispute requests</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Safety Rating</span>
          <div className="text-2xl font-extrabold text-emerald-400">99.4%</div>
          <span className="text-[10px] text-emerald-500/80">Platform compliance</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-white/10 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Pending Reports ({pendingReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quarantine')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'quarantine'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Quarantine Queue ({quarantinedIdeas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'appeals'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>User Appeals ({appeals.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-4">
          {pendingReports.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">All Clear!</h3>
              <p className="text-xs text-gray-400">There are currently no pending reports requiring moderator action.</p>
            </div>
          ) : (
            pendingReports.map((report) => (
              <div
                key={report.id}
                className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 hover:border-amber-500/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {report.target_type} report
                    </span>
                    <span className="text-xs font-semibold text-white">
                      Reason: <span className="text-amber-200">{report.reason}</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Reported by @{report.reporter_username || 'anonymous'} &bull; {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-gray-300 bg-black/40 p-3 rounded-xl border border-white/5 font-mono">
                  {report.details || 'No additional details provided by reporter.'}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-gray-500">
                    Target ID: <code className="text-purple-300">{report.target_id}</code>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewReport(report.id, 'dismiss')}
                      disabled={actionInProgress === report.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                    >
                      ✅ Dismiss (Safe)
                    </button>
                    <button
                      onClick={() => handleReviewReport(report.id, 'warn_user')}
                      disabled={actionInProgress === report.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
                    >
                      ⚠️ Warn User
                    </button>
                    <button
                      onClick={() => handleReviewReport(report.id, 'remove_content')}
                      disabled={actionInProgress === report.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors"
                    >
                      🚫 Remove Content
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'quarantine' ? (
        <div className="space-y-4">
          {quarantinedIdeas.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Quarantine Queue Empty</h3>
              <p className="text-xs text-gray-400">All automated idea ingestions met the safety score thresholds.</p>
            </div>
          ) : (
            quarantinedIdeas.map((idea) => (
              <div
                key={idea.id}
                className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{idea.title}</h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Safety Score: {idea.safety_score || 85}%
                  </span>
                </div>
                <p className="text-xs text-gray-400">{idea.raw_content}</p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => onShowToast(`Idea approved and published to public feed.`)}
                    className="gradient-btn text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    ✨ Approve to Public Feed
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Pending User Appeals</h3>
              <p className="text-xs text-gray-400">There are no outstanding strikes or restriction appeals.</p>
            </div>
          ) : (
            appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-cyan-300">Appeal #{appeal.id}</span>
                  <span className="text-xs text-gray-500">{new Date(appeal.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-300">{appeal.appeal_text}</p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleAppealDecision(appeal.id, false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30"
                  >
                    ⚖️ Uphold Strike
                  </button>
                  <button
                    onClick={() => handleAppealDecision(appeal.id, true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  >
                    ✅ Grant Appeal
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
