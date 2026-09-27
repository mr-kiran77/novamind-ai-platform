// Private Messaging & Realtime WebSockets Module

const Messaging = {
  socket: null,
  activeConversationId: null,
  activeConversationsList: [],

  connectWebSocket(userId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${userId}`;
    
    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("WebSocket connected to Novamind realtime gateway");
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleIncomingSocketMessage(payload);
        } catch (e) {}
      };

      this.socket.onclose = () => {
        console.log("WebSocket closed. Reconnecting in 3s...");
        setTimeout(() => {
          if (Auth.currentUser) this.connectWebSocket(Auth.currentUser.id);
        }, 3000);
      };
    } catch (e) {
      console.warn("WebSocket connection error:", e);
    }
  },

  handleIncomingSocketMessage(payload) {
    if (payload.type === "chat_message") {
      const msg = payload.message;
      if (this.activeConversationId === msg.conversation_id) {
        this.appendMessageToDOM(msg);
      } else {
        API.showToast(`New message from @${msg.sender_username}`, "info");
        const badge = document.getElementById("unread-msg-badge");
        if (badge) badge.classList.remove("hidden");
      }
      this.loadConversations();
    }
  },

  async loadConversations() {
    const listEl = document.getElementById("conversations-list");
    if (!listEl) return;

    try {
      const res = await API.get("/api/messages/conversations");
      this.activeConversationsList = res.conversations || [];

      if (!this.activeConversationsList.length) {
        listEl.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">No private discussions yet.</div>`;
        return;
      }

      listEl.innerHTML = this.activeConversationsList.map(c => {
        const otherUser = c.participants?.find(p => p.id !== Auth.currentUser?.id) || c.participants?.[0] || {};
        const isActive = c.id === this.activeConversationId;
        return `
          <div class="p-3.5 cursor-pointer hover:bg-white/5 transition-colors ${isActive ? 'bg-purple-500/15 border-l-2 border-purple-500' : ''}"
               onclick="Messaging.openConversation('${c.id}')">
            <div class="flex items-center gap-2.5">
              <img src="${otherUser.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}"
                   class="w-9 h-9 rounded-xl object-cover border border-white/10">
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-white truncate">${c.title || otherUser.display_name || 'Innovator'}</span>
                  <span class="text-[9px] text-gray-500">${c.last_message_at ? c.last_message_at.substring(11, 16) : ''}</span>
                </div>
                <p class="text-[11px] text-gray-400 truncate mt-0.5">${c.last_message || 'Start discussion'}</p>
              </div>
            </div>
          </div>
        `;
      }).join("");

      if (!this.activeConversationId && this.activeConversationsList.length > 0) {
        this.openConversation(this.activeConversationsList[0].id);
      }
    } catch (err) {}
  },

  async openConversation(convId) {
    this.activeConversationId = convId;
    const conv = this.activeConversationsList.find(c => c.id === convId);
    const otherUser = conv?.participants?.find(p => p.id !== Auth.currentUser?.id) || {};

    document.getElementById("active-chat-title").innerText = conv?.title || otherUser.display_name || "Private Discussion";
    document.getElementById("active-chat-subtitle").innerText = otherUser.username ? `@${otherUser.username} &bull; Active Team Member` : "Encrypted channel";

    const messagesEl = document.getElementById("chat-messages-container");
    messagesEl.innerHTML = `<div class="text-center py-6 text-xs text-gray-500">Loading messages...</div>`;

    try {
      const res = await API.get(`/api/messages/conversations/${convId}`);
      messagesEl.innerHTML = "";
      (res.messages || []).forEach(m => this.appendMessageToDOM(m));
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (err) {}
  },

  appendMessageToDOM(msg) {
    const messagesEl = document.getElementById("chat-messages-container");
    if (!messagesEl) return;

    const isMine = msg.sender_id === Auth.currentUser?.id;
    const msgEl = document.createElement("div");
    msgEl.className = `flex ${isMine ? 'justify-end' : 'justify-start'}`;

    msgEl.innerHTML = `
      <div class="max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
        isMine ? 'bg-purple-600 text-white rounded-br-none shadow-lg shadow-purple-600/20' : 'bg-white/10 text-gray-200 rounded-bl-none border border-white/5'
      }">
        <span class="text-[10px] font-bold block opacity-75 mb-0.5">${isMine ? 'You' : msg.sender_display_name || msg.sender_username}</span>
        <p class="whitespace-pre-wrap">${msg.content}</p>
        <span class="text-[9px] block text-right opacity-60 mt-1">${msg.created_at ? msg.created_at.substring(11, 16) : ''}</span>
      </div>
    `;

    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  },

  async sendMessage() {
    if (!this.activeConversationId) {
      API.showToast("Please select a conversation first", "error");
      return;
    }

    const input = document.getElementById("chat-message-input");
    const content = input.value.trim();
    if (!content) return;

    try {
      input.value = "";
      await API.post(`/api/messages/conversations/${this.activeConversationId}`, { content });
    } catch (err) {}
  }
};

// Global shortcuts
function sendChatMessage() {
  Messaging.sendMessage();
}

function openNewChatModal() {
  const handle = prompt("Enter username of innovator to message (e.g. rajpatel, mayalin, alexvance):");
  if (!handle) return;

  API.get(`/api/users/${handle}`).then(res => {
    return API.post("/api/messages/conversations", {
      participant_ids: [res.profile.id],
      type: "direct"
    });
  }).then(conv => {
    API.showToast("Conversation started", "success");
    Messaging.loadConversations();
  }).catch(() => {
    API.showToast("User not found", "error");
  });
}
