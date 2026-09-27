// Floating AI Personal Assistant ("Nova") Module

const Assistant = {
  isOpen: false,
  isSpeakingEnabled: true,

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    const drawer = document.getElementById("assistant-drawer");
    if (drawer) {
      if (this.isOpen) {
        drawer.classList.remove("hidden");
        document.getElementById("assistant-input").focus();
      } else {
        drawer.classList.add("hidden");
      }
    }
  },

  async sendMessage(overrideText = null) {
    const input = document.getElementById("assistant-input");
    const text = overrideText || (input ? input.value.trim() : "");
    if (!text) return;

    if (!overrideText && input) input.value = "";

    this.appendMessage("user", text);

    const stream = document.getElementById("assistant-messages");
    const loadingId = `nova-loading-${Date.now()}`;
    const loadingEl = document.createElement("div");
    loadingEl.id = loadingId;
    loadingEl.className = "bg-purple-950/40 border border-purple-500/20 rounded-xl p-3 text-purple-300 text-xs animate-pulse";
    loadingEl.innerText = "Nova is thinking & consulting specialist agents...";
    stream.appendChild(loadingEl);
    stream.scrollTop = stream.scrollHeight;

    try {
      const contextIdeaId = IdeaDetail.currentIdea?.id || null;
      const res = await API.post("/api/assistant/chat", {
        message: text,
        context_idea_id: contextIdeaId
      });

      document.getElementById(loadingId)?.remove();
      this.appendMessage("assistant", res.reply);

      // Voice read aloud if enabled
      if (this.isSpeakingEnabled && window.Voice) {
        Voice.speak(res.reply);
      }
    } catch (err) {
      document.getElementById(loadingId)?.remove();
      this.appendMessage("assistant", "Sorry, I encountered an issue processing your request. Please retry.");
    }
  },

  appendMessage(sender, text) {
    const stream = document.getElementById("assistant-messages");
    if (!stream) return;

    const el = document.createElement("div");
    if (sender === "user") {
      el.className = "bg-white/10 rounded-xl p-2.5 text-xs text-white max-w-[85%] ml-auto";
      el.innerText = text;
    } else {
      el.className = "bg-purple-950/40 border border-purple-500/20 rounded-xl p-3 text-xs text-gray-200 leading-relaxed";
      el.innerHTML = `<strong>Nova:</strong> ${text}`;
    }

    stream.appendChild(el);
    stream.scrollTop = stream.scrollHeight;
  }
};

function toggleAssistantDrawer() {
  Assistant.toggleDrawer();
}

function sendAssistantMessage() {
  Assistant.sendMessage();
}

function sendAssistantQuickPrompt(promptText) {
  Assistant.sendMessage(promptText);
}
