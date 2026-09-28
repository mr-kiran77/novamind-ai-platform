// NovaMind Frontend API Service Layer

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

  // Social Interactions (Like, Save, Follow, Comments)
  likeIdea(ideaId: string) {
    return this.request<any>(`/api/ideas/${ideaId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: 'like' }),
    });
  },

  saveIdea(ideaId: string) {
    return this.request<{ is_saved: boolean; message: string }>(`/api/ideas/${ideaId}/save`, {
      method: 'POST',
    });
  },

  followUser(userId: string) {
    return this.request<{ is_following: boolean; is_connection: boolean; message: string }>(`/api/users/${userId}/follow`, {
      method: 'POST',
    });
  },

  getComments(ideaId: string) {
    return this.request<{ comments: any[]; total_count: number }>(`/api/ideas/${ideaId}/comments`);
  },

  postComment(ideaId: string, content: string) {
    return this.request<any>(`/api/ideas/${ideaId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, comment_type: 'comment' }),
    });
  },

  // Instagram-Style Community Polls
  getPoll(ideaId: string) {
    return this.request<{ poll: any | null }>(`/api/ideas/${ideaId}/poll`);
  },

  createPoll(ideaId: string, question: string, options: string[]) {
    return this.request<{ poll: any }>(`/api/ideas/${ideaId}/poll`, {
      method: 'POST',
      body: JSON.stringify({ question, options }),
    });
  },

  votePoll(pollId: string, optionIndex: number) {
    return this.request<{ poll: any }>(`/api/ideas/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option_index: optionIndex }),
    });
  },

  // AI Collaborator Screening (Genuine vs Time-pass)
  screenCollaborations(ideaId: string) {
    return this.request<any>(`/api/ideas/${ideaId}/collaborations/ai-screen`, {
      method: 'POST',
    });
  },

  // LinkedIn & Naukri Talent Search Matcher
  getTalentMatch(ideaId: string) {
    return this.request<any>(`/api/ideas/${ideaId}/talent-match`);
  },

  // Government Schemes & Grants Intelligence
  searchSchemes(ideaId: string, customUrl?: string) {
    return this.request<any>(`/api/ideas/${ideaId}/schemes-search`, {
      method: 'POST',
      body: JSON.stringify({ custom_url: customUrl || null }),
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

  // Authentication & Demo
  demoSwitch(role: string = 'user') {
    return this.request<any>(`/api/auth/demo-switch?role=${role}`, {
      method: 'POST',
    });
  }
};
