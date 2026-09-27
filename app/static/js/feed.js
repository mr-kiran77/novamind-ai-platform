// Home Feed Module

const Feed = {
  activeFormat: "all",
  activeCategory: "all",

  async loadFeed() {
    const container = document.getElementById("feed-cards-container");
    if (!container) return;

    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500">
        <span class="animate-spin inline-block text-2xl mb-2">⚙️</span>
        <p class="text-xs">Curating personalized innovation feed...</p>
      </div>
    `;

    try {
      let url = "/api/ideas?limit=24";
      if (this.activeFormat !== "all") url += `&raw_format=${this.activeFormat}`;
      if (this.activeCategory !== "all") url += `&category=${encodeURIComponent(this.activeCategory)}`;

      const data = await API.get(url);
      this.renderIdeas(data.ideas || [], container);
    } catch (err) {
      container.innerHTML = `<div class="col-span-full text-center py-8 text-red-400 text-xs">Failed to load innovation feed. Please retry.</div>`;
    }
  },

  renderIdeas(ideas, container) {
    if (!ideas.length) {
      container.innerHTML = `
        <div class="col-span-full text-center py-16 glass-panel p-8">
          <span class="text-4xl block mb-2">💡</span>
          <h3 class="text-base font-bold text-white mb-1">No ideas found in this category</h3>
          <p class="text-xs text-gray-400 mb-4">Be the first to record a raw thought in this discipline!</p>
          <button onclick="openCaptureModal()" class="gradient-btn text-white text-xs px-4 py-2 rounded-xl font-semibold">
            ✨ Capture an Idea
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = ideas.map(idea => this.renderIdeaCard(idea)).join("");
  },

  renderIdeaCard(idea) {
    const formatIcons = {
      voice: "🎙️ Voice",
      video: "📹 Video",
      image: "🖼️ Diagram",
      document: "📄 Doc",
      text: "✍️ Quick"
    };
    const formatBadge = formatIcons[idea.raw_format] || "💡 Concept";

    const stageNames = {
      raw_thought: "1. Raw Thought",
      structured: "2. Structured",
      discussion: "3. Discussion",
      improved: "4. Improved",
      prototype: "5. Prototype",
      project: "6. Project",
      opportunity: "7. Opportunity"
    };
    const stageBadge = stageNames[idea.stage] || "Structured";

    // Media Preview Element
    let mediaHtml = "";
    if (idea.media_urls && idea.media_urls.length > 0) {
      const url = idea.media_urls[0];
      if (idea.raw_format === "image" || url.match(/\.(png|jpg|jpeg|webp|gif)/i)) {
        mediaHtml = `
          <div class="rounded-xl overflow-hidden my-3 border border-white/10 max-h-56 bg-black/40">
            <img src="${url}" class="w-full h-48 object-cover hover:scale-105 transition-transform duration-300" loading="lazy">
          </div>
        `;
      } else if (idea.raw_format === "video" || url.match(/\.(mp4|webm)/i)) {
        mediaHtml = `
          <div class="rounded-xl overflow-hidden my-3 border border-white/10 max-h-56 bg-black">
            <video src="${url}" controls class="w-full max-h-48"></video>
          </div>
        `;
      } else if (idea.raw_format === "voice" || idea.raw_format === "audio") {
        mediaHtml = `
          <div class="my-3 p-3 bg-purple-950/40 rounded-xl border border-purple-500/20 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg gradient-btn flex items-center justify-center text-sm shadow">🎙️</div>
            <div class="flex-1">
              <span class="text-[11px] text-purple-300 font-semibold block">Spoken Audio Note</span>
              <audio controls src="${url}" class="w-full h-8 mt-1"></audio>
            </div>
          </div>
        `;
      }
    }

    const summary = idea.structured_data?.one_line_summary || idea.raw_content;
    const truncatedSummary = summary.length > 140 ? summary.substring(0, 140) + "..." : summary;

    const tagsHtml = (idea.tags || []).slice(0, 4).map(t => 
      `<span class="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded-full border border-white/5">#${t}</span>`
    ).join("");

    const isSaved = idea.is_saved ? "text-amber-400" : "text-gray-400 hover:text-white";

    return `
      <div class="glass-panel glass-panel-hover p-5 flex flex-col justify-between transition-all group">
        <!-- Card Header -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2.5 cursor-pointer" onclick="navigate('profile', {username: '${idea.username}'})">
              <img src="${idea.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}"
                   class="w-9 h-9 rounded-xl object-cover border border-purple-500/30">
              <div>
                <span class="text-xs font-bold text-white hover:text-purple-300 block">${idea.display_name}</span>
                <span class="text-[10px] text-gray-500">@${idea.username}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                ${formatBadge}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                ${stageBadge}
              </span>
            </div>
          </div>

          <!-- Title & Summary (Clickable to open Detail) -->
          <div class="cursor-pointer" onclick="openIdeaDetail('${idea.id}')">
            <h3 class="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
              ${idea.title}
            </h3>
            <p class="text-xs text-gray-300 mt-2 leading-relaxed">
              ${truncatedSummary}
            </p>
          </div>

          <!-- Media Preview -->
          ${mediaHtml}

          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5 mt-3">
            ${tagsHtml}
          </div>
        </div>

        <!-- Card Footer & Actions (Reactions, Collaborate, Save, Share) -->
        <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs flex-wrap">
          <!-- Positive Reactions Bar Preview -->
          <div class="flex items-center gap-2">
            <button onclick="toggleCardReaction('${idea.id}', 'insightful', event)" title="Insightful"
                    class="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 transition-colors ${idea.user_reactions?.includes('insightful') ? 'text-purple-300 border border-purple-500/30' : 'text-gray-400'}">
              <span>💡</span>
              <span id="react-count-${idea.id}">${idea.reaction_count || 0}</span>
            </button>

            <button onclick="openIdeaDetail('${idea.id}')" title="Discussions"
                    class="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <span>💬</span>
              <span>${idea.comment_count || 0}</span>
            </button>
          </div>

          <!-- Direct Collaboration Button -->
          <button onclick="openCollabModalForIdea('${idea.id}', '${idea.title.replace(/'/g, "\\'")}', event)"
                  title="Request to collaborate on this idea"
                  class="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 font-semibold transition-all hover:scale-105 shadow-sm">
            <span>🤝</span>
            <span>Collaborate</span>
            ${idea.collab_count && idea.collab_count > 0 ? `<span class="bg-purple-500/30 px-1 rounded text-[10px] text-purple-300 font-bold">${idea.collab_count}</span>` : ''}
          </button>

          <!-- Save & Share Action Buttons -->
          <div class="flex items-center gap-2">
            <button onclick="toggleSaveIdea('${idea.id}', this)" class="${isSaved} p-1 text-sm transition-colors" title="Save to Vault">
              ★
            </button>
            <button onclick="shareIdea('${idea.id}', '${idea.title.replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-white p-1 text-xs" title="Share Concept">
              🔗
            </button>
          </div>
        </div>
      </div>
    `;
  }
};

function openCollabModalForIdea(ideaId, ideaTitle, e) {
  if (e) e.stopPropagation();
  const idInput = document.getElementById("collab-target-idea-id");
  const titleText = document.getElementById("collab-idea-title-text");
  if (idInput) idInput.value = ideaId;
  if (titleText) titleText.innerText = ideaTitle || "Selected Concept";
  
  const modal = document.getElementById("modal-collab");
  if (modal) modal.classList.remove("hidden");
}

// Global helpers for Feed
function filterFeedFormat(format) {
  Feed.activeFormat = format;
  document.querySelectorAll(".feed-filter-btn").forEach(b => {
    b.classList.remove("bg-purple-500", "text-white");
    b.classList.add("bg-white/5", "text-gray-400");
  });
  event.target.classList.remove("bg-white/5", "text-gray-400");
  event.target.classList.add("bg-purple-500", "text-white");
  Feed.loadFeed();
}

async function toggleCardReaction(ideaId, reactionType, e) {
  e.stopPropagation();
  try {
    const res = await API.post(`/api/ideas/${ideaId}/react`, { reaction_type: reactionType });
    API.showToast(res.message, "success");
    Feed.loadFeed();
  } catch (err) {}
}

async function toggleSaveIdea(ideaId, btn) {
  try {
    const res = await API.post(`/api/ideas/${ideaId}/save`, {});
    API.showToast(res.message, "success");
    btn.classList.toggle("text-amber-400");
  } catch (err) {}
}

function shareIdea(ideaId, title) {
  const url = `${window.location.origin}/#idea=${ideaId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    API.showToast(`Link copied to clipboard: "${title}"`, "success");
  } else {
    prompt("Copy idea link:", url);
  }
}
