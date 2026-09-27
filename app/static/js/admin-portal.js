// Administrator Portal & 50 Specialist AI Agent Monitor

const AdminPortal = {
  stats: null,
  agentsData: null,
  activeAgentCategory: "all",

  async load() {
    try {
      this.stats = await API.get("/api/admin/stats");
      this.agentsData = await API.get("/api/admin/agents");

      this.renderKPIs();
      this.renderAgents();
      this.renderRecentRuns();
    } catch (err) {
      console.warn("Admin authorization required:", err);
      const container = document.getElementById("admin-kpis-container");
      if (container) {
        container.innerHTML = `
          <div class="col-span-full p-6 text-center text-xs text-cyan-300 bg-cyan-950/20 rounded-xl border border-cyan-500/20">
            Administrator authorization required. Please switch to 'SysAdmin (Admin)' role above.
          </div>
        `;
      }
    }
  },

  renderKPIs() {
    const k = this.stats?.kpis || {};
    const container = document.getElementById("admin-kpis-container");
    if (!container) return;

    const items = [
      { label: "Total Users", val: k.total_users || 0, color: "text-white" },
      { label: "Ideas Published", val: k.total_ideas || 0, color: "text-purple-300" },
      { label: "Impact Reactions", val: k.total_reactions || 0, color: "text-amber-300" },
      { label: "Discussions", val: k.total_comments || 0, color: "text-cyan-300" },
      { label: "Collaborations", val: k.total_collaborations || 0, color: "text-emerald-300" },
      { label: "Agent Runs", val: k.total_agent_runs || 0, color: "text-purple-400 font-bold" },
      { label: "Avg Latency", val: `${k.avg_agent_latency_ms || 42}ms`, color: "text-cyan-400 font-mono" }
    ];

    container.innerHTML = items.map(item => `
      <div class="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
        <span class="text-xl font-black ${item.color} block">${item.val}</span>
        <span class="text-[10px] text-gray-400 block">${item.label}</span>
      </div>
    `).join("");

    // Set provider in dropdown
    const select = document.getElementById("admin-provider-select");
    if (select && this.stats?.active_ai_provider) {
      select.value = this.stats.active_ai_provider;
    }
  },

  renderAgents() {
    const grid = document.getElementById("admin-agents-grid");
    if (!grid) return;

    let defs = this.agentsData?.definitions || [];
    if (this.activeAgentCategory !== "all") {
      defs = defs.filter(d => d.category === this.activeAgentCategory);
    }

    grid.innerHTML = defs.map((a, i) => `
      <div class="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1 hover:border-cyan-500/30 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span class="text-xs font-bold text-white truncate max-w-[170px]">${a.name}</span>
          </div>
          <span class="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-white/10 text-gray-400">
            ${a.category}
          </span>
        </div>
        <p class="text-[11px] text-gray-400 line-clamp-2 leading-tight">${a.description}</p>
      </div>
    `).join("");
  },

  renderRecentRuns() {
    const tbody = document.getElementById("admin-runs-tbody");
    if (!tbody) return;

    const runs = this.agentsData?.recent_runs || [];
    if (!runs.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-xs text-gray-500">No agent telemetry recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = runs.slice(0, 15).map(r => `
      <tr class="hover:bg-white/[0.02]">
        <td class="p-2.5 font-bold text-white">${r.agent_name}</td>
        <td class="p-2.5 text-purple-300 font-mono text-[10px]">${r.trigger_event}</td>
        <td class="p-2.5"><span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">${r.status}</span></td>
        <td class="p-2.5 font-mono text-cyan-300">${r.latency_ms}ms</td>
        <td class="p-2.5 font-mono text-gray-400">${Math.round(r.confidence * 100)}%</td>
        <td class="p-2.5 text-gray-500 text-[10px] font-mono">${r.created_at.substring(11, 19)}</td>
      </tr>
    `).join("");
  },

  async saveProviderSettings() {
    const provider = document.getElementById("admin-provider-select").value;
    const apiKey = document.getElementById("admin-gemini-key").value.trim();

    try {
      const res = await API.post(`/api/admin/settings/ai-provider?provider_name=${provider}&api_key=${apiKey}`);
      API.showToast(`AI engine set to: ${res.active_provider.toUpperCase()}`, "success");
      this.load();
    } catch (err) {}
  }
};

function filterAdminAgents(cat) {
  AdminPortal.activeAgentCategory = cat;
  document.querySelectorAll("#admin-agent-category-filters button").forEach(b => {
    b.className = "px-2.5 py-1 rounded-lg bg-white/5 text-gray-300";
  });
  event.target.className = "px-2.5 py-1 rounded-lg bg-cyan-500 text-black font-semibold";
  AdminPortal.renderAgents();
}

function saveAdminProviderSettings() {
  AdminPortal.saveProviderSettings();
}
