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

  captureIdea(payload: {
    raw_content: string;
    raw_format: string;
    title?: string;
    category?: string;
    jurisdiction?: string;
    poll?: { question: string; options: string[]; closes_at?: string };
  }) {
    return this.request<any>('/api/ideas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Idea Copilot Background Intelligence
  getCopilotReport(ideaId: string) {
    return this.request<any>(`/api/ideas/${ideaId}/copilot`);
  },

  runCopilot(ideaId: string, force: boolean = false, jurisdiction?: string) {
    return this.request<any>(`/api/ideas/${ideaId}/copilot/run`, {
      method: 'POST',
      body: JSON.stringify({ force, jurisdiction: jurisdiction || undefined }),
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

  createPoll(ideaId: string, question: string, options: string[], closes_at?: string) {
    return this.request<{ poll: any }>(`/api/ideas/${ideaId}/poll`, {
      method: 'POST',
      body: JSON.stringify({ question, options, closes_at: closes_at || null }),
    });
  },

  deletePoll(pollId: string) {
    return this.request<any>(`/api/ideas/polls/${pollId}`, {
      method: 'DELETE',
    });
  },

  votePoll(pollId: string, optionIndex: number) {
    return this.request<{ poll: any }>(`/api/ideas/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option_index: optionIndex }),
    });
  },

  // AI Collaborator Screening (Structured Gemini Evaluation & Shortlisting)
  screenCollaborations(ideaId: string, force: boolean = false) {
    return this.request<any>(`/api/ideas/${ideaId}/collaborations/ai-screen?force=${force}`, {
      method: 'POST',
    });
  },

  analyzeProposal(ideaId: string, collabId: string, force: boolean = false) {
    return this.request<any>(`/api/ideas/${ideaId}/collaborations/${collabId}/analyze?force=${force}`, {
      method: 'POST',
    });
  },

  updateCollaborationStatus(collabId: string, status: 'accepted' | 'declined') {
    return this.request<any>(`/api/ideas/collaborations/${collabId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
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
  chatWithNova(message: string, context_idea_id?: string, history?: any[]) {
    return this.request<{ reply: string; model_used?: string; context_used?: boolean }>('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context_idea_id, history }),
    });
  },

  // Discovery & Semantic Search
  semanticSearch(query: string, category?: string, stage?: string) {
    return this.request<{ results: any[]; query: string; count: number }>('/api/discovery/search', {
      method: 'POST',
      body: JSON.stringify({ query, category, stage, limit: 12 }),
    });
  },

  getCategories() {
    return this.request<{ categories: { name: string; count: number }[] }>('/api/discovery/categories');
  },

  // Moderation Operations
  getModerationQueue() {
    return this.request<{ pending_reports: any[]; quarantined_ideas: any[] }>('/api/moderation/queue');
  },

  reviewReport(reportId: string, action: string, notes: string = '') {
    return this.request<any>(`/api/moderation/review/${reportId}?action=${encodeURIComponent(action)}&notes=${encodeURIComponent(notes)}`, {
      method: 'POST',
    });
  },

  reportContent(targetType: 'idea' | 'comment', targetId: string, reason: string, details?: string) {
    return this.request<any>('/api/moderation/report', {
      method: 'POST',
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details }),
    });
  },

  getAppeals() {
    return this.request<{ appeals: any[] }>('/api/moderation/appeals');
  },

  reviewAppeal(appealId: string, approved: boolean, notes: string = '') {
    return this.request<any>(`/api/moderation/appeal/${appealId}/review`, {
      method: 'POST',
      body: JSON.stringify({ approved, review_notes: notes }),
    });
  },

  // Authentication & Demo
  demoSwitch(role: string = 'user') {
    return this.request<any>(`/api/auth/demo-switch?role=${role}`, {
      method: 'POST',
    });
  },

  // User Profile & Settings Management
  getUserProfile(username: string) {
    return this.request<{
      profile: any;
      follower_count: number;
      following_count: number;
      is_following: boolean;
      ideas: any[];
    }>(`/api/users/${username}`);
  },

  updateProfile(data: Record<string, any>) {
    return this.request<any>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getUserSettings() {
    return this.request<any>('/api/users/me/settings');
  },

  updateUserSettings(settings: Record<string, any>) {
    return this.request<any>('/api/users/me/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  changePassword(current_password: string, new_password: string, confirm_password: string) {
    return this.request<{ status: string; message: string }>('/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password, confirm_password }),
    });
  },

  getSessions() {
    return this.request<{ sessions: any[] }>('/api/users/me/sessions');
  },

  revokeSession(sessionId: string) {
    return this.request<{ status: string; message: string }>(`/api/users/me/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  revokeAllOtherSessions() {
    return this.request<{ status: string; message: string }>('/api/users/me/sessions/revoke-all-others', {
      method: 'POST',
    });
  },

  async uploadAvatar(file: File) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/users/me/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Avatar upload failed' }));
      throw new Error(errorData.detail || errorData.message || `HTTP ${res.status}`);
    }

    return res.json();
  },

  removeAvatar() {
    return this.request<{ status: string; avatar_url: string; user: any; message: string }>('/api/users/me/avatar', {
      method: 'DELETE',
    });
  },

  submitFeedback(payload: { category: string; message: string; rating?: number; email?: string }) {
    return this.request<{ status: string; id: string; message: string }>('/api/users/me/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteAccount(password: string, confirm_phrase: string) {
    return this.request<{ status: string; message: string }>('/api/users/me', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirm_phrase }),
    });
  },
};
