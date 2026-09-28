// User Profile & Personal Dashboard Module

const Profile = {
  async load(usernameOverride = null) {
    const container = document.getElementById("profile-dashboard-container");
    if (!container) return;

    container.innerHTML = `<div class="text-center py-12 text-xs text-gray-500">Loading innovation portfolio...</div>`;

    try {
      if (usernameOverride) {
        // Public profile view
        const data = await API.get(`/api/users/${usernameOverride}`);
        this.renderPublicProfile(data, container);
      } else {
        // Authenticated personal dashboard
        const data = await API.get("/api/users/me/dashboard");
        this.renderDashboard(data, container);
      }
    } catch (err) {
      container.innerHTML = `<div class="text-center py-8 text-red-400 text-xs">Failed to load profile details.</div>`;
    }
  },

  renderDashboard(data, container) {
    const u = data.user;
    const m = data.metrics;
    const badges = data.badges || [];
    const recent = data.recent_ideas || [];
    const notifs = data.notifications || [];

    container.innerHTML = `
      <!-- Profile Header Hero -->
      <div class="glass-panel p-6 lg:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}"
                 class="w-24 h-24 rounded-2xl object-cover border-2 border-purple-500/50 shadow-2xl">
            <div>
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 class="text-2xl font-bold text-white">${u.display_name}</h1>
                <span class="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                  @${u.username}
                </span>
                <span class="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  ${u.role.toUpperCase()}
                </span>
              </div>
              <p class="text-xs text-gray-300 mt-2 max-w-lg leading-relaxed">${u.bio || 'Innovator on Novamind'}</p>
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-400 mt-3">
                <span>📍 ${u.location || 'Global'}</span>
                <span>🎓 ${u.education || 'Self-Directed'}</span>
                <span>💼 ${u.occupation || 'Inventor'}</span>
              </div>
            </div>
          </div>

          <!-- Reputation & Streaks Badges Card -->
          <div class="bg-black/40 border border-white/10 rounded-2xl p-4 flex sm:flex-col gap-4 text-center min-w-[160px]">
            <div>
              <span class="text-2xl font-black text-amber-400 block">${m.reputation_score}</span>
              <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Reputation</span>
            </div>
            <div class="border-l sm:border-l-0 sm:border-t border-white/10 pl-4 sm:pl-0 sm:pt-3">
              <span class="text-2xl font-black text-purple-400 block">🔥 ${m.current_streak}d</span>
              <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Streak (${m.longest_streak}d max)</span>
            </div>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div class="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
            <span class="text-lg font-bold text-white block">${m.idea_count}</span>
            <span class="text-[11px] text-gray-400">Concepts Created</span>
          </div>
          <div class="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
            <span class="text-lg font-bold text-cyan-300 block">${m.total_reactions}</span>
            <span class="text-[11px] text-gray-400">Impact Reactions</span>
          </div>
          <div class="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
            <span class="text-lg font-bold text-purple-300 block">${m.total_saves}</span>
            <span class="text-[11px] text-gray-400">Vault Saves</span>
          </div>
          <div class="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
            <span class="text-lg font-bold text-emerald-300 block">${m.connection_count}</span>
            <span class="text-[11px] text-gray-400">Connections</span>
          </div>
        </div>

        <!-- Badges Showcase -->
        <div class="space-y-2">
          <h3 class="text-xs uppercase font-bold text-gray-400 tracking-wider">Earned Recognition Badges</h3>
          <div class="flex flex-wrap gap-2">
            ${badges.map(b => `
              <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs font-semibold text-purple-200">
                <span>${b.icon || '🏅'}</span>
                <span>${b.name}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Dashboard Lower Split: Recent Ideas & Notifications -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- My Ideas List -->
        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">My Created Concepts</h3>
            <button onclick="openCaptureModal()" class="text-xs gradient-btn text-white px-2.5 py-1 rounded-lg">
              + New Concept
            </button>
          </div>
          <div class="space-y-2.5">
            ${recent.map(r => `
              <div class="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-between cursor-pointer transition-colors"
                   onclick="openIdeaDetail('${r.id}')">
                <div>
                  <h4 class="text-xs font-bold text-white line-clamp-1">${r.title}</h4>
                  <span class="text-[10px] text-gray-400 block">${r.category} &bull; Stage: ${r.stage}</span>
                </div>
                <span class="text-xs font-mono text-purple-300">💡 ${r.reaction_count || 0}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Notification History -->
        <div class="glass-panel p-6 space-y-4">
          <h3 class="text-sm font-bold text-white">Innovation Activity Log</h3>
          <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
            ${notifs.map(n => `
              <div class="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-xs space-y-0.5">
                <span class="font-bold text-purple-300 block">${n.title}</span>
                <p class="text-gray-300 text-[11px]">${n.message}</p>
                <span class="text-[9px] text-gray-500 block font-mono">${n.created_at.substring(11, 16)}</span>
              </div>
            `).join("")}
          </div>
        </div>

      </div>
    `;
  },

  renderPublicProfile(data, container) {
    const p = data.profile;
    const isCurrentUser = Auth.currentUser && (Auth.currentUser.id === p.id || Auth.currentUser.username === p.username);
    container.innerHTML = `
      <div class="glass-panel p-6 space-y-4">
        <button onclick="navigate('feed')" class="text-xs text-gray-400 hover:text-white mb-2">← Back to Feed</button>
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <img src="${p.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}" class="w-16 h-16 rounded-2xl object-cover border border-purple-500/40">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl font-bold text-white">${p.display_name}</h1>
                <span class="text-xs text-purple-300">@${p.username}</span>
                <span class="text-[10px] bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  💡 IDEA POSTER
                </span>
              </div>
              <p class="text-xs text-gray-300 mt-1">${p.bio || 'Innovator on Novamind'}</p>
            </div>
          </div>
          ${!isCurrentUser ? `
            <button onclick="toggleFollowPoster('${p.id}', this, event)"
                    class="text-xs px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all shadow">
              + Follow Poster
            </button>
          ` : ''}
        </div>
      </div>
      <div class="space-y-3">
        <h3 class="text-sm font-bold text-white">Published Concepts (${data.ideas.length})</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${data.ideas.map(i => Feed.renderIdeaCard(i)).join("")}
        </div>
      </div>
    `;
  }
};
