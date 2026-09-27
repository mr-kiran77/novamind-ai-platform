// Centralized API client with JWT authentication and toast notifications

const API = {
  getToken() {
    return localStorage.getItem("novamind_token") || "";
  },

  setToken(token) {
    localStorage.setItem("novamind_token", token);
  },

  clearToken() {
    localStorage.removeItem("novamind_token");
    localStorage.removeItem("novamind_user");
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem("novamind_user") || "null");
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem("novamind_user", JSON.stringify(user));
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        console.warn("Session expired or unauthorized. Showing auth dialog.");
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || `Server error (${response.status})`);
      }
      return data;
    } catch (err) {
      this.showToast(err.message, "error");
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `p-3.5 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all transform translate-y-2 opacity-0 duration-200 ${
      type === "error"
        ? "bg-red-950/90 text-red-200 border-red-500/30"
        : type === "success"
        ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
        : "bg-purple-950/90 text-purple-200 border-purple-500/30"
    }`;

    const icon = type === "error" ? "⚠️" : type === "success" ? "✅" : "✨";
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("translate-y-2", "opacity-0");
    }, 10);

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },
};
