// Discovery & Semantic Vector Search Module

const Discovery = {
  selectedCategory: "all",

  async loadCategories() {
    const pillsContainer = document.getElementById("discover-categories-pills");
    if (!pillsContainer) return;

    try {
      const data = await API.get("/api/discovery/categories");
      pillsContainer.innerHTML = `
        <button onclick="filterDiscoveryCategory('all')" class="category-pill px-3 py-1 rounded-full text-xs font-medium bg-purple-500 text-white">
          All Disciplines
        </button>
      ` + (data.categories || []).map(c => `
        <button onclick="filterDiscoveryCategory('${c.name}')" class="category-pill px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5 flex items-center gap-1.5">
          <span>${c.name}</span>
          <span class="text-[10px] text-gray-500 font-mono">(${c.count})</span>
        </button>
      `).join("");
    } catch (err) {}
  },

  async executeSearch(queryOverride = null) {
    const input = document.getElementById("semantic-search-input");
    const query = queryOverride || (input ? input.value.trim() : "");
    if (!query) return;

    if (queryOverride && input) input.value = queryOverride;

    const container = document.getElementById("discover-results-container");
    container.innerHTML = `<div class="col-span-full text-center py-10 text-cyan-300 text-xs">Projecting query into 64-dimensional semantic space &amp; computing cosine similarity...</div>`;

    try {
      const res = await API.post("/api/discovery/search", {
        query,
        category: this.selectedCategory !== "all" ? this.selectedCategory : undefined,
        limit: 16
      });

      this.renderResults(res.results || [], container);
    } catch (err) {
      container.innerHTML = `<div class="col-span-full text-center py-6 text-red-400 text-xs">Search error. Please retry.</div>`;
    }
  },

  renderResults(results, container) {
    if (!results.length) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 glass-panel p-6">
          <span class="text-3xl block mb-2">🔍</span>
          <h4 class="text-sm font-bold text-white mb-1">No semantic vector matches found</h4>
          <p class="text-xs text-gray-400">Try broader terms or capture this concept yourself!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map(r => Feed.renderIdeaCard(r)).join("");
  }
};

// Global shortcuts
function triggerSemanticSearch() {
  Discovery.executeSearch();
}

function runSampleSearch(query) {
  Discovery.executeSearch(query);
}

function filterDiscoveryCategory(cat) {
  Discovery.selectedCategory = cat;
  Discovery.executeSearch();
}
