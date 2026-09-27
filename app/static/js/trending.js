// Trending Innovation Radar Module

const Trending = {
  async loadTrending() {
    const risingContainer = document.getElementById("trending-rising-container");
    const discussionsContainer = document.getElementById("trending-discussions-container");
    const breakthroughContainer = document.getElementById("trending-breakthrough-container");

    try {
      const data = await API.get("/api/trending");
      
      this.renderSection(data.rising_now || [], risingContainer, "⚡ Rising Velocity");
      this.renderSection(data.hot_discussions || [], discussionsContainer, "💬 Hot Debate");
      this.renderSection(data.breakthrough_concepts || [], breakthroughContainer, "🚀 Moonshot");
    } catch (err) {
      console.error("Failed to load trending feed:", err);
    }
  },

  renderSection(items, container, badgeLabel) {
    if (!items.length) {
      container.innerHTML = `<div class="col-span-full text-xs text-gray-500 py-6">No trending signals calculated yet.</div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="glass-panel glass-panel-hover p-4 cursor-pointer flex flex-col justify-between"
           onclick="openIdeaDetail('${item.id}')">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              ${badgeLabel}
            </span>
            <span class="text-[10px] font-mono text-cyan-300">
              Score: ${item.trending_score || item.reaction_count || 0}
            </span>
          </div>
          <h4 class="text-sm font-bold text-white line-clamp-2 hover:text-purple-300 transition-colors">
            ${item.title}
          </h4>
          <p class="text-xs text-gray-400 mt-1 line-clamp-2">
            ${item.structured_data?.one_line_summary || item.raw_content}
          </p>
        </div>

        <div class="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <div class="flex items-center gap-2">
            <img src="${item.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}" class="w-5 h-5 rounded-md object-cover">
            <span class="text-[11px] text-gray-300">@${item.username}</span>
          </div>
          <div class="flex items-center gap-2 text-[11px]">
            <span>💡 ${item.reaction_count || 0}</span>
            <span>💬 ${item.comment_count || 0}</span>
          </div>
        </div>
      </div>
    `).join("");
  }
};
