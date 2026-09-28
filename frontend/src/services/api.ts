// Use relative URL so requests adapt automatically to Port 5000 (Gateway) or Port 8000 (FastAPI)
const API_BASE = '';

export const api = {
  // Token management
  getToken(): string | null {
    return localStorage.getItem('novamind_token');
  },
  setToken(token: string) {
    localStorage.setItem('novamind_token', token);
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'API request failed' }));
      throw new Error(errorData.detail || errorData.message || `HTTP ${res.status}`);
    }

    return res.json();
  },

  // Ideas & Feed
  getIdeas(category?: string) {
    const qs = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<{ ideas: any[]; count: number }>(`/api/ideas${qs}`);
  },

  getIdeaDetail(id: string) {
    return this.request<any>(`/api/ideas/${id}`);
  },

  captureIdea(payload: { raw_content: string; raw_format: string; title?: string; category?: string }) {
    return this.request<any>('/api/ideas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  reactToIdea(ideaId: string, reactionType: string) {
    return this.request<any>(`/api/ideas/${ideaId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: reactionType }),
    });
  },

  // Collaboration
  proposeCollaboration(ideaId: string, role_type: string, pitch_message: string) {
    return this.request<any>(`/api/ideas/${ideaId}/collaborate`, {
      method: 'POST',
      body: JSON.stringify({ role_type, pitch_message }),
    });
  },

  // Nova AI Chat
  chatWithNova(message: string, context_idea_id?: string) {
    return this.request<{ reply: string }>('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context_idea_id }),
    });
  },

  // Authentication
  login(login_identifier: string, password: string) {
    return this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login_identifier, password }),
    });
  },

  demoSwitch(role: string = 'user') {
    return this.request<any>(`/api/auth/demo-switch?role=${role}`, {
      method: 'POST',
    });
  }
};
