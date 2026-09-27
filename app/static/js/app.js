// Novamind Main Application Router & Orchestrator

const App = {
  currentView: "feed",

  async init() {
    console.log("Novamind Platform v1.0.0 initializing...");
    
    // 1. Initialize Auth
    await Auth.init();

    // 2. Initialize Voice Service
    Voice.init();

    // 3. Handle initial hash routing
    this.handleRouting();
    window.addEventListener("hashchange", () => this.handleRouting());

    // 4. Global Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        Capture.closeModal();
        Auth.closeAuthModal();
        closeCollabModal();
        if (Assistant.isOpen) Assistant.toggleDrawer();
      } else if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        navigate("discover");
        document.getElementById("semantic-search-input")?.focus();
      }
    });
  },

  handleRouting() {
    const hash = window.location.hash.replace("#", "");
    if (hash.startsWith("idea=")) {
      const ideaId = hash.split("=")[1];
      openIdeaDetail(ideaId);
    } else if (hash.startsWith("profile=")) {
      const username = hash.split("=")[1];
      this.navigate("profile", { username });
    } else if (["feed", "discover", "trending", "messages", "profile", "moderation", "admin"].includes(hash)) {
      this.navigate(hash);
    } else {
      this.navigate("feed");
    }
  },

  navigate(viewName, params = {}) {
    this.currentView = viewName;
    window.location.hash = viewName;

    // Toggle Nav Button Styles
    const navTabs = ["feed", "discover", "trending", "moderation", "admin"];
    navTabs.forEach(t => {
      const btn = document.getElementById(`nav-t-${t}`) || document.getElementById(`nav-${t}`);
      if (btn) {
        if (t === viewName) {
          btn.className = "nav-tab px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all text-purple-400 bg-white/10";
        } else {
          btn.className = "nav-tab px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all text-gray-400 hover:text-white";
        }
      }
    });

    // Toggle Views
    document.querySelectorAll(".view-panel").forEach(p => p.classList.add("hidden"));
    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) {
      activePanel.classList.remove("hidden");
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Load view data
    this.loadViewData(viewName, params);
  },

  loadViewData(viewName, params = {}) {
    if (viewName === "feed") {
      Feed.loadFeed();
    } else if (viewName === "discover") {
      Discovery.loadCategories();
      Discovery.executeSearch("energy");
    } else if (viewName === "trending") {
      Trending.loadTrending();
    } else if (viewName === "messages") {
      Messaging.loadConversations();
    } else if (viewName === "profile") {
      Profile.load(params.username || null);
    } else if (viewName === "moderation") {
      ModerationPortal.load();
    } else if (viewName === "admin") {
      AdminPortal.load();
    }
  }
};

// Global navigate function
function navigate(viewName, params = {}) {
  App.navigate(viewName, params);
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
