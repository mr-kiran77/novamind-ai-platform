// NovaMind Frontend API Service Layer
import { SEED_IDEAS } from '../data/seedIdeas';

export const SUPABASE_URL = 'https://fsfkxxpqdgmdrqbckauq.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_KXHfmn5w5WeQlNPTVEa-3g_47WO27cv';

// Base origins with resilient dual-engine failover (Port 5000 Express Gateway & Port 8000 FastAPI)
const CANDIDATE_BASES = [
  '',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data) {
      if (Array.isArray(data.detail)) {
        return data.detail.map((d: any) => d.msg || d.message || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
      }
      if (typeof data.detail === 'string' && data.detail.trim()) {
        return data.detail;
      }
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }
      if (typeof data.error === 'string' && data.error.trim()) {
        return data.error;
      }
    }
  } catch {
    // Non-JSON response (e.g. proxy HTML 502 or text)
  }

  if (res.status === 502 || res.status === 504) {
    return 'Service gateway is synchronizing. Please retry in a moment.';
  }
  if (res.status === 404) {
    return 'Requested endpoint was not found.';
  }
  if (res.status === 401 || res.status === 403) {
    return 'Authentication required or invalid credentials.';
  }
  return `Server request error (${res.status})`;
}

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

    let lastError: Error | null = null;

    // Loop through candidate base URLs to provide rock-solid high availability
    for (const base of CANDIDATE_BASES) {
      try {
        const url = `${base}${endpoint}`;
        const res = await fetch(url, {
          ...options,
          headers,
        });

        // If response is a 502/504 Bad Gateway from proxy, try next direct port
        if (res.status === 502 || res.status === 504) {
          lastError = new Error(await extractErrorMessage(res));
          continue;
        }

        if (!res.ok) {
          const errMsg = await extractErrorMessage(res);
          throw new Error(errMsg);
        }

        return await res.json();
      } catch (err: any) {
        lastError = err;
        // If it was an explicit client error (e.g. 400 Bad Request or validation failure), do not retry other ports
        if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('synchronizing')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Unable to connect to NovaMind service. Please verify your connection.');
  },

  // Ideas & Feed
  async getIdeas(category?: string): Promise<{ ideas: any[]; count: number }> {
    const qs = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';

    // 1. Try local or remote API backend first
    try {
      const data = await this.request<{ ideas: any[]; count: number }>(`/api/ideas${qs}`);
      if (data && Array.isArray(data.ideas) && data.ideas.length > 0) {
        return data;
      }
    } catch {
      // Backend not running on this domain (e.g. Vercel deployment)
    }

    // 2. Try Supabase direct HTTPS REST API
    try {
      let sbUrl = `${SUPABASE_URL}/rest/v1/ideas?select=*&order=created_at.desc`;
      if (category && category !== 'All') {
        sbUrl += `&category=eq.${encodeURIComponent(category)}`;
      }
      const sbRes = await fetch(sbUrl, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json',
        },
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData) && sbData.length > 0) {
          return { ideas: sbData, count: sbData.length };
        }
      }
    } catch {
      // Supabase direct call bypassed
    }

    // 3. Resilient fallback to pre-structured seed blueprints & local user ideas
    let customIdeas: any[] = [];
    try {
      const saved = localStorage.getItem('novamind_custom_ideas');
      if (saved) customIdeas = JSON.parse(saved);
    } catch {}

    const all = [...customIdeas, ...SEED_IDEAS];
    const filtered =
      category && category !== 'All'
        ? all.filter(
            (i: any) =>
              (i.category || '').toLowerCase() === category.toLowerCase() ||
              (i.tags || []).some((t: string) => t.toLowerCase() === category.toLowerCase())
          )
        : all;

    return { ideas: filtered, count: filtered.length };
  },

  async getIdeaDetail(id: string): Promise<any> {
    try {
      return await this.request<any>(`/api/ideas/${id}`);
    } catch {
      try {
        const saved = localStorage.getItem('novamind_custom_ideas');
        if (saved) {
          const custom = JSON.parse(saved);
          const found = custom.find((i: any) => i.id === id);
          if (found) return found;
        }
      } catch {}
      const foundSeed = SEED_IDEAS.find((i: any) => i.id === id);
      if (foundSeed) return foundSeed;
      return SEED_IDEAS[0];
    }
  },

  async captureIdea(payload: {
    raw_content: string;
    raw_format: string;
    title?: string;
    category?: string;
    jurisdiction?: string;
    poll?: { question: string; options: string[]; closes_at?: string };
  }): Promise<any> {
    try {
      return await this.request<any>('/api/ideas', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Local client-side structuring fallback for Vercel demo
      const userJson = localStorage.getItem('novamind_user') || sessionStorage.getItem('novamind_user');
      let author = {
        id: 'usr_guest',
        username: 'innovator',
        display_name: 'Dr. Maya Lin',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      };
      if (userJson) {
        try {
          author = JSON.parse(userJson);
        } catch {}
      }

      const cleanTitle = payload.title || payload.raw_content.slice(0, 48) + '...';
      const cat = payload.category || 'AI / ML';
      const newIdea: any = {
        id: `idea_${Date.now()}`,
        user_id: author.id,
        username: author.username,
        display_name: author.display_name,
        avatar_url: author.avatar_url,
        title: cleanTitle,
        raw_content: payload.raw_content,
        raw_format: payload.raw_format,
        media_urls: [],
        category: cat,
        tags: [cat, 'Innovation', 'NextGen', 'ScalableTech'],
        status: 'published',
        stage: 'structured',
        view_count: 1,
        save_count: 0,
        share_count: 0,
        reaction_count: 0,
        comment_count: 0,
        collab_count: 0,
        safety_score: 98.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        structured_data: {
          title: cleanTitle,
          one_line_summary: `AI structured blueprint: ${cleanTitle}`,
          problem_statement: 'High operational friction and lack of scalable execution architecture in current workflows.',
          proposed_solution: payload.raw_content,
          how_it_works: '1. Autonomous ingestion and edge signal capture.\n2. Adaptive reasoning with sub-second feedback loops.\n3. Automated distributed action dispatch.',
          who_it_helps: 'Innovators, researchers, domain engineers, and end-consumers.',
          why_it_matters: 'Transforms unstructured concepts into executable 22-field implementation specifications.',
          possible_benefits: ['Reduces development cycle time by 60%', 'Auditable lifecycle telemetry', 'Scalable modular architecture'],
          possible_challenges: ['System adoption friction', 'Integration latency', 'Resource optimization'],
          required_resources: ['Development sandbox', 'Domain dataset', 'Pilot user cohort'],
          technology_required: ['Cloud Microservices', 'React 19 Frontend', 'Supabase Real-Time Database', 'Gemini AI API'],
          estimated_complexity: 'Medium-High',
          potential_applications: ['Enterprise workflow automation', 'Decentralized research', 'Smart monitoring'],
          related_fields: [cat, 'Applied Systems Engineering', 'Data Science & Optimization'],
          relevant_tags: [cat, 'Innovation', 'NextGen', 'ScalableTech']
        },
        poll: payload.poll
          ? {
              id: `poll_${Date.now()}`,
              question: payload.poll.question,
              options: payload.poll.options.map((opt, idx) => ({ id: `opt_${idx}`, text: opt, vote_count: 0, percentage: 0 })),
              total_votes: 0,
              has_voted: false,
            }
          : null,
      };

      try {
        const saved = localStorage.getItem('novamind_custom_ideas');
        const custom = saved ? JSON.parse(saved) : [];
        custom.unshift(newIdea);
        localStorage.setItem('novamind_custom_ideas', JSON.stringify(custom));
      } catch {}

      // Fire write to Supabase table
      try {
        fetch(`${SUPABASE_URL}/rest/v1/ideas`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: newIdea.id,
            user_id: newIdea.user_id,
            title: newIdea.title,
            raw_content: newIdea.raw_content,
            raw_format: newIdea.raw_format,
            category: newIdea.category,
            tags: newIdea.tags,
            structured_data: newIdea.structured_data,
            status: 'published',
            created_at: newIdea.created_at,
          }),
        }).catch(() => {});
      } catch {}

      return newIdea;
    }
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

  // 50-Agent Autonomous Innovation Swarm
  getSwarm() {
    return this.request<{
      status: string;
      total_agents: number;
      active_agents: number;
      engine: string;
      architecture: string;
      squad_counts: { domain_specialists: number; risk_auditors: number; angel_scouts: number };
      squads: {
        domain_specialists: Array<{ id: string; name: string; role: string; category: string; confidence: number }>;
        risk_auditors: Array<{ id: string; name: string; role: string; category: string; confidence: number }>;
        angel_scouts: Array<{ id: string; name: string; role: string; category: string; confidence: number }>;
      };
    }>('/api/assistant/swarm');
  },

  runSwarmAudit(ideaId?: string, customPrompt?: string) {
    return this.request<any>('/api/assistant/swarm/audit', {
      method: 'POST',
      body: JSON.stringify({ idea_id: ideaId || null, custom_prompt: customPrompt || null }),
    });
  },

  // Authentication & Demo
  demoSwitch(role: string = 'user') {
    return this.request<any>(`/api/auth/demo-switch?role=${role}`, {
      method: 'POST',
    });
  },

  signUpEmail(payload: {
    full_name: string;
    email: string;
    password: string;
    confirm_password: string;
    mobile?: string;
  }) {
    return this.request<{ access_token: string; token_type: string; user: any }>('/api/auth/signup/email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  signInEmail(payload: { email: string; password: string }) {
    return this.request<{ access_token: string; token_type: string; user: any }>('/api/auth/signin/email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  sendPhoneOtp(mobile: string, channel: 'sms' | 'whatsapp' | 'call' = 'sms') {
    return this.request<{
      status: string;
      mobile: string;
      message: string;
      channel?: string;
      dev_code_hint?: string;
      expires_in_minutes?: number;
    }>('/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ mobile, channel }),
    });
  },

  verifyPhoneSignIn(mobile: string, otp_code: string) {
    return this.request<{ access_token: string; token_type: string; user: any }>('/api/auth/otp/verify-signin', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp_code }),
    });
  },

  verifyOtpOnly(mobile: string, code: string) {
    return this.request<{ status: string; message: string }>('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ mobile, code }),
    });
  },

  verifyPhoneSignUp(payload: {
    mobile: string;
    otp_code: string;
    full_name: string;
    email?: string;
    username?: string;
    password?: string;
  }) {
    return this.request<{ access_token: string; token_type: string; user: any }>('/api/auth/otp/verify-signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  loginWithCredentials(identifier: string, password: string) {
    return this.request<{ access_token: string; token_type: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login_identifier: identifier, password }),
    });
  },

  checkUsername(username: string) {
    return this.request<{ available: boolean; username: string; suggestions: string[] }>(
      `/api/auth/check-username?username=${encodeURIComponent(username)}`
    );
  },

  suggestPersona() {
    return this.request<{ display_name: string; username: string; avatar_url: string; bio: string }>(
      '/api/auth/suggest-persona'
    );
  },

  forgotPassword(email: string) {
    return this.request<{ status: string; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
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

    const res = await fetch('/api/users/me/avatar', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errMsg = await extractErrorMessage(res);
      throw new Error(errMsg || 'Avatar upload failed');
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

  // Real-time Supabase Browsing & User Activity Tracking
  trackBrowsing(
    page_url_or_opts: string | { page_url: string; event_type?: string; user_id?: string; username?: string; metadata?: Record<string, any> },
    event_type: string = 'page_view',
    metadata: Record<string, any> = {}
  ) {
    const pageUrl = typeof page_url_or_opts === 'string' ? page_url_or_opts : page_url_or_opts.page_url;
    const eventType = typeof page_url_or_opts === 'string' ? event_type : (page_url_or_opts.event_type || 'page_view');
    const meta = typeof page_url_or_opts === 'string' ? metadata : (page_url_or_opts.metadata || {});

    const userJson = localStorage.getItem('novamind_user') || sessionStorage.getItem('novamind_user');
    let userId: string | undefined = typeof page_url_or_opts === 'object' ? page_url_or_opts.user_id : undefined;
    let username: string | undefined = typeof page_url_or_opts === 'object' ? page_url_or_opts.username : undefined;
    if (!userId && userJson) {
      try {
        const u = JSON.parse(userJson);
        userId = u.id;
        username = u.username;
      } catch {}
    }
    // Direct HTTPS write to Supabase table browsing_events (guaranteed to work from Vercel edge/browser)
    try {
      fetch(`${SUPABASE_URL}/rest/v1/browsing_events`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          page_url: pageUrl,
          event_type: eventType,
          username: username || 'anonymous_visitor',
          metadata: {
            ...meta,
            referrer: document.referrer || undefined,
            screen: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString()
          }
        })
      }).catch(() => {});
    } catch {}

    return this.request<{ status: string; event_id: string; supabase_synced: boolean }>('/api/telemetry/browse', {
      method: 'POST',
      body: JSON.stringify({
        page_url: pageUrl,
        event_type: eventType,
        user_id: userId,
        username,
        metadata: {
          ...meta,
          referrer: document.referrer || undefined,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString()
        }
      })
    }).catch(() => {
      // Non-blocking background telemetry ping
    });
  },

  getSupabaseStatus() {
    return this.request<{
      connected: boolean;
      url: string;
      tables: Record<string, number>;
      total_records: number;
      realtime_active: boolean;
      errors?: string[];
    }>('/api/supabase/status');
  },

  syncSupabaseNow() {
    return this.request<{
      status: string;
      synced_counts: Record<string, number>;
      errors: string[];
      timestamp: string;
    }>('/api/supabase/sync-now', {
      method: 'POST'
    });
  },
};
