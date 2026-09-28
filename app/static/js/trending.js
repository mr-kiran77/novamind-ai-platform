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

    container.innerHTML = items.map(item => Feed.renderIdeaCard(item)).join("");
  }
};
