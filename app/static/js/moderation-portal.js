// Moderator Portal Module

const ModerationPortal = {
  activeTab: "reports",
  queueData: null,
  appealsData: null,

  async load() {
    try {
      this.queueData = await API.get("/api/moderation/queue");
      this.appealsData = await API.get("/api/moderation/appeals");

      document.getElementById("mod-reports-count").innerText = this.queueData.pending_reports?.length || 0;
      document.getElementById("mod-quarantine-count").innerText = this.queueData.quarantined_ideas?.length || 0;
      document.getElementById("mod-appeals-count").innerText = this.appealsData.appeals?.length || 0;

      this.switchTab(this.activeTab);
    } catch (err) {
      document.getElementById("mod-tab-content").innerHTML = `
        <div class="p-6 text-center text-xs text-red-400 bg-red-950/20 rounded-xl border border-red-500/20">
          Moderator authorization required. Please switch to the 'Alex Vance (Moderator)' role above.
        </div>
      `;
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    const tabs = ["reports", "quarantine", "appeals"];
    tabs.forEach(t => {
      const btn = document.getElementById(`mod-tab-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = "pb-2 border-b-2 border-amber-500 text-amber-300 font-semibold";
        } else {
          btn.className = "pb-2 text-gray-400 hover:text-white font-semibold";
        }
      }
    });

    const container = document.getElementById("mod-tab-content");
    if (tab === "reports") {
      this.renderReports(container);
    } else if (tab === "quarantine") {
      this.renderQuarantine(container);
    } else if (tab === "appeals") {
      this.renderAppeals(container);
    }
  },

  renderReports(container) {
    const list = this.queueData?.pending_reports || [];
    if (!list.length) {
      container.innerHTML = `<div class="p-8 text-center text-xs text-emerald-400">✅ All user reports reviewed! Clean queue.</div>`;
      return;
    }

    container.innerHTML = list.map(r => `
      <div class="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 mb-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-300">Report Reason: ${r.reason}</span>
          <span class="text-[10px] text-gray-500">Reported by @${r.reporter_username}</span>
        </div>
        <p class="text-xs text-gray-300">${r.details || 'No additional details provided.'}</p>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button onclick="ModerationPortal.handleReport('${r.id}', 'dismiss')" class="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-lg">
            Dismiss
          </button>
          <button onclick="ModerationPortal.handleReport('${r.id}', 'remove_content')" class="text-xs bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold">
            Remove Content
          </button>
        </div>
      </div>
    `).join("");
  },

  renderQuarantine(container) {
    const list = this.queueData?.quarantined_ideas || [];
    if (!list.length) {
      container.innerHTML = `<div class="p-8 text-center text-xs text-emerald-400">✅ No quarantined content awaiting manual safety audit.</div>`;
      return;
    }

    container.innerHTML = list.map(i => `
      <div class="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 mb-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white">${i.title}</h4>
          <span class="text-[10px] text-amber-400 font-bold">Safety Score: ${i.safety_score}%</span>
        </div>
        <p class="text-xs text-gray-300 line-clamp-2">${i.raw_content}</p>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button onclick="ModerationPortal.approveQuarantine('${i.id}')" class="text-xs gradient-btn text-white px-3 py-1.5 rounded-lg font-semibold">
            Approve &amp; Publish
          </button>
        </div>
      </div>
    `).join("");
  },

  renderAppeals(container) {
    const list = this.appealsData?.appeals || [];
    if (!list.length) {
      container.innerHTML = `<div class="p-8 text-center text-xs text-gray-400">No active user appeals in queue.</div>`;
      return;
    }

    container.innerHTML = list.map(a => `
      <div class="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 mb-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-purple-300">Appeal from @${a.username}</span>
          <span class="text-[10px] text-amber-300">Strike Reason: ${a.strike_reason || 'Community violation'}</span>
        </div>
        <p class="text-xs text-gray-200 p-2.5 bg-black/40 rounded-lg">"${a.appeal_text}"</p>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button onclick="ModerationPortal.reviewAppeal('${a.id}', 'rejected')" class="text-xs bg-red-600/60 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg">
            Reject Appeal
          </button>
          <button onclick="ModerationPortal.reviewAppeal('${a.id}', 'approved')" class="text-xs gradient-btn text-white px-3 py-1.5 rounded-lg font-semibold">
            Approve &amp; Restore Standing
          </button>
        </div>
      </div>
    `).join("");
  },

  async handleReport(reportId, action) {
    try {
      await API.post(`/api/moderation/review/${reportId}?action=${action}`);
      API.showToast(`Report ${action} executed`, "success");
      this.load();
    } catch (err) {}
  },

  async approveQuarantine(ideaId) {
    try {
      await API.put(`/api/ideas/${ideaId}`, { change_summary: "Approved by moderator" });
      API.showToast("Quarantined content approved", "success");
      this.load();
    } catch (err) {}
  },

  async reviewAppeal(appealId, status) {
    try {
      await API.put(`/api/moderation/appeals/${appealId}`, {
        status,
        review_notes: `Reviewed by ${Auth.currentUser?.username}`
      });
      API.showToast(`Appeal ${status}`, "success");
      this.load();
    } catch (err) {}
  }
};

function switchModTab(tab) {
  ModerationPortal.switchTab(tab);
}
