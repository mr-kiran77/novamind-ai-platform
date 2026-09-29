-- =====================================================================
-- NOVAMIND - SUPABASE / POSTGRESQL SCHEMA WITH PGVECTOR
-- Paste this entire script into your Supabase SQL Editor and click "RUN"
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'user', 'moderator', 'admin'
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    interests JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    location TEXT DEFAULT '',
    education TEXT DEFAULT '',
    occupation TEXT DEFAULT '',
    links JSONB DEFAULT '[]'::jsonb,
    reputation_score INT DEFAULT 50,
    current_streak INT DEFAULT 1,
    longest_streak INT DEFAULT 1,
    last_active_date DATE,
    badges JSONB DEFAULT '[]'::jsonb,
    is_verified BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Mobile OTP Verification Table
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. User Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token_jti TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Ideas Table (with 22 Structured Fields & Vector Embeddings)
CREATE TABLE IF NOT EXISTS public.ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    raw_format TEXT DEFAULT 'text', -- 'text', 'voice', 'audio', 'video', 'image', 'poster', 'document', 'quick_capture'
    media_urls JSONB DEFAULT '[]'::jsonb,
    structured_data JSONB DEFAULT '{}'::jsonb,
    category TEXT DEFAULT 'General',
    tags JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'published', -- 'quarantine', 'published', 'rejected', 'needs_edit', 'manual_review'
    stage TEXT DEFAULT 'raw_thought', -- 'raw_thought', 'structured', 'discussion', 'improved', 'prototype', 'project', 'opportunity'
    view_count INT DEFAULT 0,
    save_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    embedding vector(64), -- High-dimensional semantic vector for Supabase AI search
    safety_score REAL DEFAULT 95.0,
    moderation_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Idea Versions Table (Evolution Tracking)
CREATE TABLE IF NOT EXISTS public.idea_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    structured_data JSONB DEFAULT '{}'::jsonb,
    change_summary TEXT DEFAULT '',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Positive Reactions Table (9 Purposeful Tokens)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL, -- 'insightful', 'interesting', 'creative', 'useful', 'inspiring', 'potential', 'collaborate', 'learned', 'solves_problem'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(idea_id, user_id, reaction_type)
);

-- 8. Saved Ideas (Personal Vault)
CREATE TABLE IF NOT EXISTS public.saved_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, idea_id)
);

-- 9. Follows & Mutual Connections
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_connection BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

-- 10. Threaded Comments & Discussions
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    discussion_type TEXT DEFAULT 'public',
    comment_type TEXT DEFAULT 'comment', -- 'comment', 'constructive_suggestion', 'question', 'collaboration_proposal'
    safety_status TEXT DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Collaborations Table (with AI Screening)
CREATE TABLE IF NOT EXISTS public.collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL, -- 'advanced_version', 'hardware_materials', 'technical', 'design', 'research', 'business'
    pitch_message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    ai_seriousness_score INT DEFAULT 0, -- 0 to 100%
    ai_classification TEXT DEFAULT 'pending', -- 'genuine_serious', 'moderate', 'low_effort_time_pass'
    ai_rationale TEXT DEFAULT '',
    ai_skills_matched JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11b. Community Polls (Instagram-Style)
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of 2 to 4 options
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    option_index INT NOT NULL, -- 0 to 3
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(poll_id, user_id)
);

-- 12. Conversations & Realtime Messages
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT DEFAULT 'direct', -- 'direct', 'group'
    title TEXT DEFAULT '',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT DEFAULT '',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Moderation Reports & Strikes
CREATE TABLE IF NOT EXISTS public.moderation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    action_notes TEXT DEFAULT '',
    moderator_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_strikes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL,
    issued_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    strike_id UUID REFERENCES public.moderation_strikes(id),
    appeal_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reviewer_id UUID REFERENCES public.users(id),
    review_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. 50 Specialist Agent Registry & Telemetry Runs
CREATE TABLE IF NOT EXISTS public.agent_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    input_type TEXT DEFAULT 'json',
    output_type TEXT DEFAULT 'json',
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    input_payload JSONB DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'success',
    latency_ms INT DEFAULT 0,
    tokens_used INT DEFAULT 0,
    confidence REAL DEFAULT 0.95,
    error_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. User Streaks & Notifications
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    UNIQUE(user_id, activity_date, activity_type)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_supabase_ideas_user ON public.ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_supabase_ideas_category ON public.ideas(category);
CREATE INDEX IF NOT EXISTS idx_supabase_ideas_status ON public.ideas(status);
CREATE INDEX IF NOT EXISTS idx_supabase_reactions_idea ON public.reactions(idea_id);
CREATE INDEX IF NOT EXISTS idx_supabase_comments_idea ON public.comments(idea_id);
