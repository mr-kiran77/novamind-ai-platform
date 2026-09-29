// Home Feed Module - Poster vs User Enhanced Architecture

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
          <p class="text-xs text-gray-400 mb-4">Be the first poster to record an idea in this domain!</p>
          <button onclick="openCaptureModal()" class="gradient-btn text-white text-xs px-4 py-2 rounded-xl font-semibold">
            ✨ Post an Idea
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = ideas.map(idea => this.renderIdeaCard(idea)).join("");
  },

  renderIdeaCard(idea) {
    const currentUser = Auth.currentUser;
    const isCurrentUserPoster = currentUser && (currentUser.id === idea.user_id || currentUser.username === idea.username);

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

    const isLiked = idea.is_liked || (idea.user_reactions && idea.user_reactions.length > 0);
    const isSaved = idea.is_saved;

    return `
      <div class="glass-panel glass-panel-hover p-5 flex flex-col justify-between transition-all group rounded-2xl shadow-lg border border-white/10">
        <!-- Card Header: Poster Identification & Follow Action -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${idea.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}"
                   class="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shrink-0 cursor-pointer"
                   onclick="navigate('profile', {username: '${idea.username}'})">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-white hover:text-purple-300 transition-colors cursor-pointer truncate"
                        onclick="navigate('profile', {username: '${idea.username}'})">
                    ${idea.display_name}
                  </span>
                  
                  <!-- Explicit Poster Badge -->
                  <span class="text-[9px] bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-extrabold uppercase shadow-sm">
                    💡 POSTER
                  </span>
                  
                  ${isCurrentUserPoster ? `
                    <span class="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded font-semibold">(You)</span>
                  ` : ''}
                </div>

                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[10px] text-gray-400">@${idea.username}</span>

                  <!-- Follow Poster Button (For other Users) -->
                  ${!isCurrentUserPoster ? `
                    <button onclick="toggleFollowPoster('${idea.user_id}', this, event)"
                            class="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                              idea.is_following_author
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                                : 'bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10'
                            }">
                      <span>${idea.is_following_author ? '✓ Following' : '+ Follow Poster'}</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                ${formatBadge}
              </span>
              <span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
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

        <!-- Card Footer & Actions for Any User: Like, Comment, Save, Share, Collaborate -->
        <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs flex-wrap">
          <!-- Positive Reactions Bar Preview -->
          <div class="flex items-center gap-1.5">
            <!-- 1. Like Poster's Idea Button -->
            <button onclick="toggleCardReaction('${idea.id}', 'like', event)" title="Like Poster's Idea"
                    class="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg transition-all ${
                      isLiked
                        ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold'
                        : 'bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-300 border border-white/5'
                    }">
              <span>❤️</span>
              <span id="react-count-${idea.id}">${idea.reaction_count || 0}</span>
            </button>

            <!-- 2. Comment on Poster's Idea Button (Opens instant comment dialogue) -->
            <button onclick="openInstantCommentModal('${idea.id}', '${idea.title.replace(/'/g, "\\'")}', '${idea.display_name.replace(/'/g, "\\'")}', '${idea.username}', '${idea.user_id}', event)"
                    title="Comment on Poster's Idea as a User"
                    class="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 transition-colors border border-white/5">
              <span>💬</span>
              <span>${idea.comment_count || 0}</span>
            </button>

            <!-- 3. Save to Vault Button -->
            <button onclick="toggleSaveIdea('${idea.id}', this, event)"
                    title="${isSaved ? 'Saved in your Vault' : 'Save to Vault'}"
                    class="p-1.5 rounded-lg border transition-all ${
                      isSaved
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/5'
                    }">
              <span>${isSaved ? '★ Saved' : '☆ Save'}</span>
            </button>

            <!-- 4. Share Poster's Idea Button -->
            <button onclick="shareIdea('${idea.id}', '${idea.title.replace(/'/g, "\\'")}', event)"
                    class="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/15 text-gray-400 hover:text-cyan-300 transition-colors border border-white/5"
                    title="Share Poster's Idea">
              <span>🔗 Share</span>
            </button>
          </div>

          <!-- Direct Collaboration with Poster Button -->
          <div class="flex items-center gap-2">
            <button onclick="openCollabModalForIdea('${idea.id}', '${idea.title.replace(/'/g, "\\'")}', event)"
                    title="Collaborate with Idea Poster"
                    class="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 font-semibold transition-all hover:scale-105 shadow-sm">
              <span>🤝</span>
              <span>Collaborate</span>
              ${idea.collab_count && idea.collab_count > 0 ? `<span class="bg-purple-500/30 px-1 rounded text-[10px] text-purple-300 font-bold">${idea.collab_count}</span>` : ''}
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
  if (event && event.target) {
    event.target.classList.remove("bg-white/5", "text-gray-400");
    event.target.classList.add("bg-purple-500", "text-white");
  }
  Feed.loadFeed();
}

async function toggleCardReaction(ideaId, reactionType, e) {
  if (e) e.stopPropagation();
  try {
    const res = await API.post(`/api/ideas/${ideaId}/react`, { reaction_type: reactionType });
    API.showToast(res.message || "Reaction updated!", "success");
    Feed.loadFeed();
  } catch (err) {}
}

async function toggleSaveIdea(ideaId, btn, e) {
  if (e) e.stopPropagation();
  try {
    const res = await API.post(`/api/ideas/${ideaId}/save`, {});
    API.showToast(res.message || (res.is_saved ? "Saved to vault!" : "Removed from vault"), "success");
    Feed.loadFeed();
  } catch (err) {}
}

async function toggleFollowPoster(userId, btn, e) {
  if (e) e.stopPropagation();
  try {
    const res = await API.post(`/api/users/${userId}/follow`, {});
    API.showToast(res.message || (res.is_following ? "Now following Idea Poster!" : "Unfollowed Idea Poster"), "success");
    Feed.loadFeed();
  } catch (err) {
    API.showToast(err.message || "Failed to update follow status", "error");
  }
}

function shareIdea(ideaId, title, e) {
  if (e) e.stopPropagation();
  const url = `${window.location.origin}/#idea=${ideaId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    API.showToast(`Link to poster's idea copied: "${title}"`, "success");
  } else {
    prompt("Copy idea link:", url);
  }
}

// ==========================================
// INSTANT COMMENT MODAL LOGIC (POSTER VS USER)
// ==========================================
let currentInstantIdea = {
  id: null,
  posterId: null,
  isFollowing: false
};

async function openInstantCommentModal(ideaId, title, posterName, posterHandle, posterId, e) {
  if (e) e.stopPropagation();
  
  currentInstantIdea.id = ideaId;
  currentInstantIdea.posterId = posterId;

  document.getElementById("instant-comment-idea-id").value = ideaId;
  document.getElementById("instant-comment-idea-title").innerText = title;
  document.getElementById("instant-comment-poster-name").innerText = posterName;
  document.getElementById("instant-comment-poster-handle").innerText = `@${posterHandle}`;

  const currentUser = Auth.currentUser;
  const isPoster = currentUser && (currentUser.id === posterId || currentUser.username === posterHandle);
  
  const followBtn = document.getElementById("instant-comment-follow-btn");
  if (followBtn) {
    if (isPoster) {
      followBtn.style.display = "none";
    } else {
      followBtn.style.display = "block";
      followBtn.innerText = "+ Follow Poster";
    }
  }

  const input = document.getElementById("instant-comment-input");
  if (input) {
    input.placeholder = isPoster
      ? "Reply to community users as the Idea Poster..."
      : `Comment on @${posterHandle}'s posted idea as a User...`;
  }

  const modal = document.getElementById("modal-instant-comment");
  if (modal) modal.classList.remove("hidden");

  await loadInstantComments(ideaId, posterHandle, posterId);
}

function closeInstantCommentModal() {
  const modal = document.getElementById("modal-instant-comment");
  if (modal) modal.classList.add("hidden");
}

async function loadInstantComments(ideaId, posterHandle, posterId) {
  const list = document.getElementById("instant-comments-list");
  const countBadge = document.getElementById("instant-comment-count-badge");
  if (!list) return;

  list.innerHTML = `<div class="text-center py-8 text-xs text-gray-400">Loading comments...</div>`;

  try {
    const res = await API.get(`/api/ideas/${ideaId}/comments`);
    const comments = res.comments || [];
    if (countBadge) countBadge.innerText = `${comments.length} Comments`;

    if (!comments.length) {
      list.innerHTML = `
        <div class="text-center py-10 text-xs text-gray-500 space-y-1">
          <p class="font-semibold text-gray-400">No comments yet on this posted idea.</p>
          <p>Be the first User to comment and give constructive feedback to the Poster!</p>
        </div>
      `;
      return;
    }

    const currentUser = Auth.currentUser;

    list.innerHTML = comments.map(c => {
      const isCommentPoster = c.user_id === posterId || c.username === posterHandle;
      const isMe = currentUser && (c.username === currentUser.username || c.user_id === currentUser.id);

      return `
        <div class="p-3.5 rounded-xl border transition-all ${
          isCommentPoster ? 'bg-amber-950/20 border-amber-500/40 shadow-sm' : 'bg-white/[0.03] border-white/10'
        }">
          <div class="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div class="flex items-center gap-2">
              <img src="${c.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}" class="w-6 h-6 rounded-lg object-cover">
              <span class="text-xs font-bold text-white">${c.display_name || c.username}</span>
              <span class="text-[10px] text-gray-400">@${c.username}</span>

              <!-- Poster vs User Badge -->
              ${isCommentPoster ? `
                <span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-extrabold">
                  💡 POSTER
                </span>
              ` : `
                <span class="text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.2 rounded font-medium">
                  👤 USER
                </span>
              `}

              ${isMe ? `
                <span class="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded font-semibold">You</span>
              ` : ''}
            </div>
            <span class="text-[10px] text-gray-500">${c.created_at || 'Just now'}</span>
          </div>
          <p class="text-xs text-gray-200 leading-relaxed pl-8 whitespace-pre-line">${c.content}</p>
        </div>
      `;
    }).join("");
  } catch (err) {
    list.innerHTML = `<div class="text-center py-4 text-xs text-red-400">Failed to load comments.</div>`;
  }
}

async function submitInstantComment(e) {
  e.preventDefault();
  const ideaId = document.getElementById("instant-comment-idea-id").value;
  const input = document.getElementById("instant-comment-input");
  const content = input.value.trim();

  if (!content) return;

  try {
    await API.post(`/api/ideas/${ideaId}/comments`, {
      content,
      comment_type: "comment"
    });
    input.value = "";
    API.showToast("Comment posted on idea!", "success");
    const posterHandle = document.getElementById("instant-comment-poster-handle").innerText.replace("@", "");
    await loadInstantComments(ideaId, posterHandle, currentInstantIdea.posterId);
    Feed.loadFeed();
  } catch (err) {
    API.showToast("Failed to post comment", "error");
  }
}

async function toggleFollowPosterFromModal() {
  if (!currentInstantIdea.posterId) return;
  const btn = document.getElementById("instant-comment-follow-btn");
  try {
    const res = await API.post(`/api/users/${currentInstantIdea.posterId}/follow`, {});
    API.showToast(res.message || "Follow status updated!", "success");
    if (btn) {
      btn.innerText = res.is_following ? "✓ Following Poster" : "+ Follow Poster";
    }
    Feed.loadFeed();
  } catch (err) {
    API.showToast(err.message || "Failed to update follow status", "error");
  }
}
