// Idea Detail & Signature Idea Journey Module

const IdeaDetail = {
  currentIdea: null,
  activeDetailTab: "blueprint",

  async load(ideaId) {
    navigate("idea-detail");
    const container = document.getElementById("detail-tab-blueprint");
    if (!container) return;

    try {
      const idea = await API.get(`/api/ideas/${ideaId}`);
      this.currentIdea = idea;
      this.render();
      this.loadComments(ideaId);
      this.loadVersions(ideaId);
    } catch (err) {
      console.error("Failed to load idea detail:", err);
    }
  },

  render() {
    const idea = this.currentIdea;
    if (!idea) return;

    // Header & Meta
    document.getElementById("detail-title").innerText = idea.title;
    document.getElementById("detail-summary").innerText = idea.structured_data?.one_line_summary || idea.raw_content;
    document.getElementById("detail-creator-name").innerText = idea.display_name;
    document.getElementById("detail-creator-handle").innerText = `@${idea.username}`;
    document.getElementById("detail-creator-bio").innerText = idea.bio || "Innovator on Novamind";
    document.getElementById("detail-creator-avatar").src = idea.avatar_url || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150";
    document.getElementById("detail-category-badge").innerText = idea.category;
    document.getElementById("detail-raw-text").innerText = idea.raw_content;

    // Render Signature Idea Journey Stepper
    this.renderIdeaJourney(idea.stage);

    // Render Media (if available)
    const mediaContainer = document.getElementById("detail-media-container");
    if (idea.media_urls && idea.media_urls.length > 0) {
      const url = idea.media_urls[0];
      mediaContainer.classList.remove("hidden");
      if (idea.raw_format === "image" || url.match(/\.(png|jpg|jpeg|webp)/i)) {
        mediaContainer.innerHTML = `<img src="${url}" class="w-full max-h-96 object-cover">`;
      } else if (idea.raw_format === "video" || url.match(/\.(mp4|webm)/i)) {
        mediaContainer.innerHTML = `<video src="${url}" controls class="w-full max-h-96"></video>`;
      } else if (idea.raw_format === "voice" || idea.raw_format === "audio") {
        mediaContainer.innerHTML = `
          <div class="p-6 bg-purple-950/40 flex items-center gap-4">
            <span class="text-3xl">🎙️</span>
            <div class="flex-1">
              <span class="text-xs text-purple-300 font-bold block mb-1">Raw Spoken Recording</span>
              <audio controls src="${url}" class="w-full"></audio>
            </div>
          </div>
        `;
      }
    } else {
      mediaContainer.classList.add("hidden");
    }

    // Render Positive Reactions
    this.renderReactionsBar();

    // Render 22 Fields Blueprint
    this.renderBlueprint();

    // Collaborators
    this.renderCollaborators();
  },

  renderIdeaJourney(currentStage) {
    const stages = [
      { id: "raw_thought", label: "1. Raw Thought", icon: "💭" },
      { id: "structured", label: "2. Structured", icon: "📐" },
      { id: "discussion", label: "3. Discussion", icon: "💬" },
      { id: "improved", label: "4. Improved", icon: "⚡" },
      { id: "prototype", label: "5. Prototype", icon: "🛠️" },
      { id: "project", label: "6. Project", icon: "🚀" },
      { id: "opportunity", label: "7. Opportunity", icon: "🌟" }
    ];

    const stageIdx = stages.findIndex(s => s.id === currentStage);
    const container = document.getElementById("journey-steps-container");
    document.getElementById("journey-stage-indicator").innerHTML = `Current Milestone: <strong class="text-purple-300">${stages[stageIdx]?.label || 'Structured'}</strong>`;

    container.innerHTML = stages.map((s, idx) => {
      const isCompleted = idx < stageIdx;
      const isActive = idx === stageIdx;
      const stateClass = isActive ? "active border-purple-500 bg-purple-500/20" : isCompleted ? "completed border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.02] text-gray-500";

      return `
        <div class="journey-step ${stateClass} border rounded-xl p-2.5 text-center cursor-pointer transition-all hover:border-purple-400"
             onclick="advanceIdeaStage('${s.id}')">
          <span class="text-base block mb-0.5">${s.icon}</span>
          <span class="text-[11px] font-bold block truncate">${s.label}</span>
          <span class="text-[9px] ${isActive ? 'text-purple-300 font-bold' : 'text-gray-500'}">
            ${isActive ? '● In Progress' : isCompleted ? '✓ Done' : 'Click to Set'}
          </span>
        </div>
      `;
    }).join("");
  },

  renderReactionsBar() {
    const reactions = [
      { type: "insightful", label: "💡 Insightful" },
      { type: "interesting", label: "🔍 Interesting" },
      { type: "creative", label: "🎨 Creative" },
      { type: "useful", label: "🛠️ Useful" },
      { type: "inspiring", label: "✨ Inspiring" },
      { type: "potential", label: "🚀 Potential" },
      { type: "collaborate", label: "🤝 Collaborate" },
      { type: "learned", label: "📚 Learned" },
      { type: "solves_problem", label: "🎯 Solves Problem" }
    ];

    const idea = this.currentIdea;
    const breakdown = idea.reaction_breakdown || {};
    const userReacts = idea.user_reactions || [];

    const container = document.getElementById("detail-reactions-bar");
    container.innerHTML = reactions.map(r => {
      const active = userReacts.includes(r.type);
      const count = breakdown[r.type] || 0;
      return `
        <button onclick="toggleDetailReaction('${r.type}')"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${active ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'}">
          <span>${r.label}</span>
          <span class="text-[11px] opacity-80">${count}</span>
        </button>
      `;
    }).join("");
  },

  renderBlueprint() {
    const s = this.currentIdea?.structured_data || {};
    const container = document.getElementById("detail-tab-blueprint");

    container.innerHTML = `
      <!-- AI Disclaimer and Edit Button -->
      <div class="flex items-center justify-between p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl text-xs">
        <span class="text-purple-300">
          🤖 <strong>AI-Structured Blueprint:</strong> Every section is fully editable. User claims &amp; AI inferences are clearly categorized.
        </span>
        <button onclick="openEditBlueprintModal()" class="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg font-semibold">
          ✏️ Edit Blueprint
        </button>
      </div>

      <!-- Problem & Solution Duo -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-rose-400 font-bold block mb-1">🚨 Problem Statement</span>
          <p class="text-xs text-gray-200 leading-relaxed">${s.problem_statement || "Not defined"}</p>
        </div>
        <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-emerald-400 font-bold block mb-1">💡 Proposed Solution</span>
          <p class="text-xs text-gray-200 leading-relaxed">${s.proposed_solution || "Not defined"}</p>
        </div>
      </div>

      <!-- How it Works, Who it Helps, Why it Matters -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-cyan-400 font-bold block mb-1">⚙️ How It Works</span>
          <p class="text-xs text-gray-300 leading-relaxed">${s.how_it_works || "Pending architecture definition."}</p>
        </div>
        <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-purple-400 font-bold block mb-1">👥 Who It Helps</span>
          <p class="text-xs text-gray-300 leading-relaxed">${s.who_it_helps || "Global end users and domain engineers."}</p>
        </div>
        <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-amber-400 font-bold block mb-1">🌍 Why It Matters</span>
          <p class="text-xs text-gray-300 leading-relaxed">${s.why_it_matters || "Significant economic and environmental impact potential."}</p>
        </div>
      </div>

      <!-- Benefits vs Challenges -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-emerald-300 font-bold block mb-2">✨ Potential Benefits</span>
          <ul class="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
            ${(s.possible_benefits || []).map(b => `<li>${b}</li>`).join("")}
          </ul>
        </div>
        <div class="p-4 bg-rose-950/20 border border-rose-500/20 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-rose-300 font-bold block mb-2">⚠️ Potential Challenges</span>
          <ul class="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
            ${(s.possible_challenges || []).map(c => `<li>${c}</li>`).join("")}
          </ul>
        </div>
      </div>

      <!-- Technical & Feasibility Specifications -->
      <div class="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
        <div class="flex items-center justify-between border-b border-white/10 pb-2">
          <h4 class="text-xs uppercase tracking-wider font-bold text-white">🛠️ Technical Implementation Parameters</h4>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Complexity: ${s.estimated_complexity || "Medium"}
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span class="text-gray-400 font-semibold block mb-1">Required Technologies:</span>
            <div class="flex flex-wrap gap-1">
              ${(s.technology_required || []).map(t => `<span class="bg-white/10 px-2 py-0.5 rounded-md text-gray-200">${t}</span>`).join("")}
            </div>
          </div>
          <div>
            <span class="text-gray-400 font-semibold block mb-1">Required Resources:</span>
            <div class="flex flex-wrap gap-1">
              ${(s.required_resources || []).map(r => `<span class="bg-white/10 px-2 py-0.5 rounded-md text-gray-200">${r}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>

      <!-- Actionable Next Steps & Prototype Suggestion -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-purple-300 font-bold block mb-2">🎯 Suggested Next Steps</span>
          <ol class="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
            ${(s.suggested_next_steps || []).map(st => `<li>${st}</li>`).join("")}
          </ol>
        </div>
        <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span class="text-xs uppercase tracking-wider text-cyan-300 font-bold block mb-2">🔬 Prototype Concept</span>
          <p class="text-xs text-gray-300 leading-relaxed">${s.prototype_suggestion || "Assemble breadboard POC."}</p>
          <span class="text-xs uppercase tracking-wider text-amber-300 font-bold block mt-3 mb-1">💼 Business Opportunity</span>
          <p class="text-xs text-gray-300 leading-relaxed">${s.possible_business_opportunity || "B2B IP licensing and OEM hardware kits."}</p>
        </div>
      </div>
    `;
  },

  async loadComments(ideaId) {
    const stream = document.getElementById("detail-comments-stream");
    const countBadge = document.getElementById("detail-comment-count");

    try {
      const res = await API.get(`/api/ideas/${ideaId}/comments`);
      countBadge.innerText = res.total_count;

      if (!res.comments.length) {
        stream.innerHTML = `<div class="text-center py-6 text-xs text-gray-500">No discussions yet. Share constructive insights or ask a question!</div>`;
        return;
      }

      stream.innerHTML = res.comments.map(c => `
        <div class="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="${c.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}" class="w-6 h-6 rounded-lg object-cover">
              <span class="text-xs font-bold text-white">${c.display_name}</span>
              <span class="text-[10px] text-gray-500">@${c.username}</span>
            </div>
            <span class="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
              ${c.comment_type.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p class="text-xs text-gray-300 leading-relaxed pl-8">${c.content}</p>

          <!-- Nested Replies -->
          ${(c.replies || []).map(r => `
            <div class="ml-8 mt-2 p-3 bg-white/[0.02] border-l-2 border-purple-500/50 rounded-r-lg space-y-1 text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-[11px]">${r.display_name}</span>
                <span class="text-[10px] text-gray-500">@${r.username}</span>
              </div>
              <p class="text-gray-300 text-[11px]">${r.content}</p>
            </div>
          `).join("")}
        </div>
      `).join("");

    } catch (err) {}
  },

  async loadVersions(ideaId) {
    const container = document.getElementById("detail-versions-container");
    try {
      const res = await API.get(`/api/ideas/${ideaId}/versions`);
      container.innerHTML = (res.versions || []).map(v => `
        <div class="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-purple-300">Version ${v.version_number}</span>
              <span class="text-gray-400">&bull; ${v.title}</span>
            </div>
            <span class="text-[11px] text-gray-500 block">${v.change_summary || "Updated details"} by @${v.username}</span>
          </div>
          <span class="text-[10px] text-gray-500 font-mono">${v.created_at.substring(0, 10)}</span>
        </div>
      `).join("");
    } catch (err) {}
  },

  async renderCollaborators() {
    const container = document.getElementById("detail-collabs-container");
    if (!container || !this.currentIdea) return;

    try {
      // Fetch full collaboration record including pending proposals
      const res = await API.get(`/api/ideas/${this.currentIdea.id}/collaborations`);
      const allCollabs = res.collaborations || [];
      const accepted = allCollabs.filter(c => c.status === "accepted");
      const pending = allCollabs.filter(c => c.status === "pending");

      const currentUser = Auth.currentUser;
      const isAuthorOrAdmin = currentUser && (
        currentUser.id === this.currentIdea.user_id ||
        currentUser.role === "admin" ||
        currentUser.role === "moderator"
      );

      const roleLabels = {
        advanced_version: "⚡ Advanced Version Architect",
        hardware_materials: "🔬 Hardware & Materials Contributor",
        technical: "🛠️ Technical / Software Engineer",
        design: "🎨 UI / UX & Industrial Designer",
        research: "📚 Scientific & Academic Researcher",
        business: "📈 Commercialization & Growth",
        mentorship: "🧭 Advisor & Mentor",
        general: "✨ Builder & Contributor"
      };

      let html = "";

      // Section 1: Host Review Queue (Only visible to Idea Host or Admin)
      if (isAuthorOrAdmin && pending.length > 0) {
        html += `
          <div class="col-span-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                📥 Incoming Collaboration Proposals (${pending.length})
              </span>
              <span class="text-[11px] text-amber-200/80">You are the host: Review and accept partners into your project</span>
            </div>
            <div class="space-y-2.5">
              ${pending.map(p => `
                <div class="p-3 bg-black/40 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <img src="${p.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}" class="w-10 h-10 rounded-xl object-cover border border-amber-500/30">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white text-xs">${p.display_name}</span>
                        <span class="text-[10px] text-gray-400">@${p.username}</span>
                      </div>
                      <span class="text-[10px] text-cyan-300 font-semibold block">${roleLabels[p.role_type] || p.role_type.toUpperCase()}</span>
                      <p class="text-xs text-gray-200 mt-1 italic">"${p.pitch_message}"</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 self-end sm:self-center">
                    <button onclick="respondToCollaboration('${p.id}', 'accepted')"
                            class="text-xs bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 border border-emerald-500/40 px-3 py-1.5 rounded-lg font-bold transition-all shadow">
                      ✅ Accept &amp; Add to Team
                    </button>
                    <button onclick="respondToCollaboration('${p.id}', 'rejected')"
                            class="text-xs bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-all">
                      ✕ Decline
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      // Section 2: Active Collaborators (Accepted Team Members)
      if (accepted.length === 0) {
        html += `
          <div class="col-span-full p-6 text-center bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
            <span class="text-2xl block">🤝</span>
            <p class="text-xs text-gray-400">No external collaborators on this project yet.</p>
            <p class="text-[11px] text-gray-500">Have an advanced version, raw materials, or engineering skills? Click <strong>Propose Collaboration</strong> above!</p>
          </div>
        `;
      } else {
        html += accepted.map(c => `
          <div class="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
            <img src="${c.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}" class="w-11 h-11 rounded-xl object-cover border border-purple-500/30">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-xs truncate">${c.display_name}</span>
                <span class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Active Partner</span>
              </div>
              <span class="text-[11px] text-purple-300 font-semibold block">${roleLabels[c.role_type] || c.role_type.toUpperCase()}</span>
              <p class="text-[11px] text-gray-300 line-clamp-2 mt-0.5">${c.pitch_message}</p>
            </div>
          </div>
        `).join("");
      }

      container.innerHTML = html;
    } catch (err) {
      console.error("Failed to load collaborations:", err);
    }
  }
};

// Global handlers
function openIdeaDetail(ideaId) {
  IdeaDetail.load(ideaId);
}

function switchDetailTab(tab) {
  IdeaDetail.activeDetailTab = tab;
  const tabs = ["blueprint", "raw", "versions", "collaborations"];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const panel = document.getElementById(`detail-tab-${t}`);
    if (btn && panel) {
      if (t === tab) {
        btn.className = "pb-2 border-b-2 border-purple-500 text-purple-400 font-semibold";
        panel.classList.remove("hidden");
      } else {
        btn.className = "pb-2 text-gray-400 hover:text-white font-semibold";
        panel.classList.add("hidden");
      }
    }
  });
}

async function advanceIdeaStage(stageId) {
  const idea = IdeaDetail.currentIdea;
  if (!idea) return;
  try {
    const res = await API.put(`/api/ideas/${idea.id}/stage`, { stage: stageId });
    API.showToast(res.message, "success");
    IdeaDetail.load(idea.id);
  } catch (err) {}
}

async function toggleDetailReaction(rType) {
  const idea = IdeaDetail.currentIdea;
  if (!idea) return;
  try {
    const res = await API.post(`/api/ideas/${idea.id}/react`, { reaction_type: rType });
    API.showToast(res.message, "success");
    IdeaDetail.load(idea.id);
  } catch (err) {}
}

async function submitComment() {
  const idea = IdeaDetail.currentIdea;
  if (!idea) return;
  const content = document.getElementById("comment-input").value.trim();
  const cType = document.getElementById("comment-type-select").value;

  if (!content) {
    API.showToast("Comment cannot be empty", "error");
    return;
  }

  try {
    const res = await API.post(`/api/ideas/${idea.id}/comments`, {
      content,
      comment_type: cType
    });
    API.showToast("Comment posted constructively!", "success");
    document.getElementById("comment-input").value = "";
    IdeaDetail.loadComments(idea.id);
  } catch (err) {}
}

function openCollabModal() {
  const idea = IdeaDetail.currentIdea;
  if (idea) {
    const idInput = document.getElementById("collab-target-idea-id");
    const titleText = document.getElementById("collab-idea-title-text");
    if (idInput) idInput.value = idea.id;
    if (titleText) titleText.innerText = idea.title;
  }
  const modal = document.getElementById("modal-collab");
  if (modal) modal.classList.remove("hidden");
}

function closeCollabModal() {
  const modal = document.getElementById("modal-collab");
  if (modal) modal.classList.add("hidden");
}

async function submitCollabProposal() {
  const targetId = document.getElementById("collab-target-idea-id")?.value || IdeaDetail.currentIdea?.id;
  if (!targetId) {
    API.showToast("No target idea selected", "error");
    return;
  }
  const role = document.getElementById("collab-role-select").value;
  const pitch = document.getElementById("collab-pitch-input").value.trim();

  if (!pitch) {
    API.showToast("Please provide a pitch or details on what you can contribute", "error");
    return;
  }

  try {
    const res = await API.post(`/api/ideas/${targetId}/collaborate`, {
      role_type: role,
      pitch_message: pitch
    });
    API.showToast(res.message || "Collaboration offer submitted to host!", "success");
    closeCollabModal();
    document.getElementById("collab-pitch-input").value = "";

    // If currently in detail view of this idea, reload collaborations
    if (IdeaDetail.currentIdea && IdeaDetail.currentIdea.id === targetId) {
      IdeaDetail.renderCollaborators();
    }
    if (window.Feed) {
      Feed.loadFeed();
    }
  } catch (err) {
    console.error("Collaboration request failed:", err);
  }
}

async function respondToCollaboration(collabId, status) {
  try {
    const res = await API.put(`/api/ideas/collaborations/${collabId}/status`, { status });
    API.showToast(res.message || (status === 'accepted' ? "Collaborator accepted into team!" : "Proposal declined"), "success");
    if (IdeaDetail.currentIdea) {
      IdeaDetail.renderCollaborators();
    }
    if (window.Feed) {
      Feed.loadFeed();
    }
  } catch (err) {
    console.error("Failed to update collaboration status:", err);
  }
}
