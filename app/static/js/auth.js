// Authentication & Onboarding Module (ID & Password + Pseudonymous Imaginary Profiles)

const Auth = {
  currentUser: null,
  activeMode: "login", // 'login' or 'register'

  async init() {
    let user = API.getUser();
    if (!user || !API.getToken()) {
      // Auto-login as default demo innovator for frictionless evaluation
      await this.switchDemoRole("user");
    } else {
      this.currentUser = user;
      this.updateHeaderUI();
    }
  },

  updateHeaderUI() {
    if (!this.currentUser) return;
    const avatarEl = document.getElementById("header-avatar");
    const streakEl = document.getElementById("header-streak-badge");
    const roleBadge = document.getElementById("current-role-badge");

    if (avatarEl && this.currentUser.avatar_url) {
      avatarEl.src = this.currentUser.avatar_url;
    }
    if (streakEl) {
      streakEl.innerText = `${this.currentUser.current_streak || 1}d`;
    }
    if (roleBadge) {
      const r = this.currentUser.role;
      roleBadge.innerText = r === "admin" ? "Admin" : r === "moderator" ? "Moderator" : "Innovator";
    }

    // Connect WebSocket for realtime messaging
    if (window.Messaging && this.currentUser.id) {
      Messaging.connectWebSocket(this.currentUser.id);
    }
  },

  switchAuthMode(mode) {
    this.activeMode = mode;
    const loginTab = document.getElementById("auth-tab-btn-login");
    const regTab = document.getElementById("auth-tab-btn-register");
    const loginPanel = document.getElementById("auth-panel-login");
    const regPanel = document.getElementById("auth-panel-register");

    if (mode === "login") {
      if (loginTab) loginTab.className = "py-2 rounded-lg bg-purple-600 text-white shadow transition-all";
      if (regTab) regTab.className = "py-2 rounded-lg text-gray-400 hover:text-white transition-all";
      if (loginPanel) loginPanel.classList.remove("hidden");
      if (regPanel) regPanel.classList.add("hidden");
    } else {
      if (regTab) regTab.className = "py-2 rounded-lg bg-purple-600 text-white shadow transition-all";
      if (loginTab) loginTab.className = "py-2 rounded-lg text-gray-400 hover:text-white transition-all";
      if (regPanel) regPanel.classList.remove("hidden");
      if (loginPanel) loginPanel.classList.add("hidden");

      // Auto-generate an imaginary persona if fields are empty
      const userField = document.getElementById("reg-username-input");
      if (userField && !userField.value) {
        this.randomizeImaginaryPersona();
      }
    }
  },

  async submitIDPasswordLogin() {
    const identifierInput = document.getElementById("login-identifier-input");
    const passwordInput = document.getElementById("login-password-input");

    const login_identifier = (identifierInput ? identifierInput.value : "").trim();
    const password = (passwordInput ? passwordInput.value : "").trim();

    if (!login_identifier) {
      API.showToast("Please enter your Unique ID or Mobile number", "error");
      return;
    }
    if (!password) {
      API.showToast("Please enter your password", "error");
      return;
    }

    try {
      const res = await API.post("/api/auth/login", {
        login_identifier,
        password
      });

      API.setToken(res.access_token);
      API.setUser(res.user);
      this.currentUser = res.user;
      this.updateHeaderUI();
      this.closeAuthModal();

      API.showToast(`Welcome back, @${res.user.username}!`, "success");
      if (window.App) App.loadViewData("feed");
    } catch (err) {
      console.error("Login failed:", err);
      // Toast displayed automatically by API wrapper
    }
  },

  async requestRegisterOTP() {
    const mobileInput = document.getElementById("reg-mobile-input");
    const mobile = (mobileInput ? mobileInput.value : "").trim();

    if (!mobile) {
      API.showToast("Please enter a valid mobile number for device security", "error");
      return;
    }

    try {
      const res = await API.post("/api/auth/otp/request", { mobile });
      API.showToast(res.message || "Security code sent!", "success");

      const stepMobile = document.getElementById("reg-step-mobile");
      const stepDetails = document.getElementById("reg-step-details");
      if (stepMobile) stepMobile.classList.add("hidden");
      if (stepDetails) stepDetails.classList.remove("hidden");

      if (res.dev_code_hint) {
        const otpInput = document.getElementById("reg-otp-input");
        if (otpInput) otpInput.value = res.dev_code_hint;
      }

      // Generate suggested persona if not already populated
      await this.randomizeImaginaryPersona();
    } catch (err) {
      console.error("OTP request failed:", err);
    }
  },

  async randomizeImaginaryPersona() {
    try {
      const persona = await API.get("/api/auth/suggest-persona");
      const avatarEl = document.getElementById("persona-avatar-preview");
      const displayEl = document.getElementById("reg-display-input");
      const usernameEl = document.getElementById("reg-username-input");

      if (avatarEl && persona.avatar_url) avatarEl.src = persona.avatar_url;
      if (displayEl && persona.display_name) displayEl.value = persona.display_name;
      if (usernameEl && persona.username) usernameEl.value = persona.username;
    } catch (err) {
      console.error("Failed to fetch imaginary persona:", err);
    }
  },

  async submitRegisterAccount() {
    const mobile = (document.getElementById("reg-mobile-input")?.value || "").trim();
    const otp_code = (document.getElementById("reg-otp-input")?.value || "").trim();
    const password = (document.getElementById("reg-password-input")?.value || "").trim();
    const username = (document.getElementById("reg-username-input")?.value || "").trim();
    const display_name = (document.getElementById("reg-display-input")?.value || "").trim();
    const avatar_url = document.getElementById("persona-avatar-preview")?.src || "";

    if (!mobile) {
      API.showToast("Mobile number required", "error");
      return;
    }
    if (!otp_code) {
      API.showToast("Please enter the 6-digit verification code", "error");
      return;
    }
    if (!password || password.length < 6) {
      API.showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (!username) {
      API.showToast("Unique ID is required", "error");
      return;
    }

    try {
      const res = await API.post("/api/auth/register", {
        mobile,
        otp_code,
        username,
        password,
        display_name: display_name || username,
        avatar_url,
        bio: "Autonomous Innovator on Novamind",
        interests: ["Artificial Intelligence", "Clean Energy", "Neurotech"]
      });

      API.setToken(res.access_token);
      API.setUser(res.user);
      this.currentUser = res.user;
      this.updateHeaderUI();
      this.closeAuthModal();

      API.showToast(`Account created! Welcome, @${res.user.username}`, "success");
      if (window.App) App.loadViewData("feed");
    } catch (err) {
      console.error("Registration failed:", err);
    }
  },

  async switchDemoRole(role) {
    try {
      const res = await API.post(`/api/auth/demo-switch?role=${role}`);
      API.setToken(res.access_token);
      API.setUser(res.user);
      this.currentUser = res.user;
      this.updateHeaderUI();
      API.showToast(`Active account: @${res.user.username} (${res.user.role.toUpperCase()})`, "success");
      
      if (window.App && App.currentView) {
        App.loadViewData(App.currentView);
      }
    } catch (err) {
      console.error("Demo switch failed:", err);
    }
  },

  openAuthModal() {
    const modal = document.getElementById("modal-auth");
    if (modal) modal.classList.remove("hidden");
  },

  closeAuthModal() {
    const modal = document.getElementById("modal-auth");
    if (modal) modal.classList.add("hidden");
  }
};

// Global shortcuts for HTML onclick bindings
function switchRole(role) {
  Auth.switchDemoRole(role);
}

function openAuthModal() {
  Auth.openAuthModal();
}

function closeAuthModal() {
  Auth.closeAuthModal();
}
