import sqlite3
import json
from contextlib import contextmanager
from datetime import datetime
from app.config import settings

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@contextmanager
def get_db():
    conn = sqlite3.connect(settings.DATABASE_PATH, timeout=20.0)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = dict_factory
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initializes all database tables with production-grade schemas."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            mobile TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user', -- 'user', 'moderator', 'admin'
            avatar_url TEXT DEFAULT '',
            bio TEXT DEFAULT '',
            interests TEXT DEFAULT '[]', -- JSON array
            skills TEXT DEFAULT '[]', -- JSON array
            location TEXT DEFAULT '',
            education TEXT DEFAULT '',
            occupation TEXT DEFAULT '',
            links TEXT DEFAULT '[]', -- JSON array
            reputation_score INTEGER DEFAULT 50,
            current_streak INTEGER DEFAULT 1,
            longest_streak INTEGER DEFAULT 1,
            last_active_date TEXT,
            badges TEXT DEFAULT '[]', -- JSON array
            is_verified INTEGER DEFAULT 0,
            is_suspended INTEGER DEFAULT 0,
            is_banned INTEGER DEFAULT 0,
            is_private INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """)
        
        # 2. OTP Verification
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS otps (
            id TEXT PRIMARY KEY,
            mobile TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            verified INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """)
        
        # 3. User Sessions
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_jti TEXT NOT NULL,
            user_agent TEXT DEFAULT '',
            ip_address TEXT DEFAULT '',
            is_revoked INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            last_used_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 4. Ideas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ideas (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            raw_content TEXT NOT NULL,
            raw_format TEXT DEFAULT 'text', -- 'text', 'voice', 'audio', 'video', 'image', 'poster', 'document', 'quick_capture'
            media_urls TEXT DEFAULT '[]', -- JSON array of file paths/URLs
            structured_data TEXT DEFAULT '{}', -- JSON full AI structured record
            category TEXT DEFAULT 'General',
            tags TEXT DEFAULT '[]', -- JSON array
            status TEXT DEFAULT 'published', -- 'quarantine', 'published', 'rejected', 'needs_edit', 'manual_review'
            stage TEXT DEFAULT 'raw_thought', -- 'raw_thought', 'structured', 'discussion', 'improved', 'prototype', 'project', 'opportunity'
            view_count INTEGER DEFAULT 0,
            save_count INTEGER DEFAULT 0,
            share_count INTEGER DEFAULT 0,
            embedding TEXT DEFAULT '[]', -- JSON array of floats for semantic search
            safety_score REAL DEFAULT 95.0,
            moderation_notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 5. Idea Versions
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS idea_versions (
            id TEXT PRIMARY KEY,
            idea_id TEXT NOT NULL,
            version_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            structured_data TEXT DEFAULT '{}',
            change_summary TEXT DEFAULT '',
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        );
        """)
        
        # 6. Reactions (Positive Reaction System)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reactions (
            id TEXT PRIMARY KEY,
            idea_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            reaction_type TEXT NOT NULL, -- 'insightful', 'interesting', 'creative', 'useful', 'inspiring', 'potential', 'collaborate', 'learned', 'solves_problem'
            created_at TEXT NOT NULL,
            UNIQUE(idea_id, user_id, reaction_type),
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 7. Saved Ideas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_ideas (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            idea_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, idea_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
        );
        """)
        
        # 8. Follows & Connections
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS follows (
            id TEXT PRIMARY KEY,
            follower_id TEXT NOT NULL,
            following_id TEXT NOT NULL,
            is_connection INTEGER DEFAULT 0, -- mutual follow = connection
            created_at TEXT NOT NULL,
            UNIQUE(follower_id, following_id),
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 9. Comments & Discussions
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            idea_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            parent_id TEXT, -- For threaded replies
            content TEXT NOT NULL,
            discussion_type TEXT DEFAULT 'public', -- 'public', 'private', 'direct'
            comment_type TEXT DEFAULT 'comment', -- 'comment', 'constructive_suggestion', 'question', 'collaboration_proposal'
            safety_status TEXT DEFAULT 'approved', -- 'approved', 'flagged', 'hidden'
            created_at TEXT NOT NULL,
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
        );
        """)
        
        # 10. Collaborations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS collaborations (
            id TEXT PRIMARY KEY,
            idea_id TEXT NOT NULL,
            requester_id TEXT NOT NULL,
            role_type TEXT NOT NULL, -- 'technical', 'design', 'business', 'research', 'mentorship', 'general'
            pitch_message TEXT NOT NULL,
            status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
            created_at TEXT NOT NULL,
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
            FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 11. Conversations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            type TEXT DEFAULT 'direct', -- 'direct', 'group'
            title TEXT DEFAULT '',
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id)
        );
        """)
        
        # 12. Conversation Members
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversation_members (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            last_read_at TEXT,
            UNIQUE(conversation_id, user_id),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 13. Messages
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            content TEXT NOT NULL,
            media_url TEXT DEFAULT '',
            is_deleted INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 14. Moderation Reports
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS moderation_reports (
            id TEXT PRIMARY KEY,
            reporter_id TEXT NOT NULL,
            target_type TEXT NOT NULL, -- 'idea', 'comment', 'user', 'conversation'
            target_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            details TEXT DEFAULT '',
            status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'action_taken'
            action_notes TEXT DEFAULT '',
            moderator_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (moderator_id) REFERENCES users(id)
        );
        """)
        
        # 15. Moderation Strikes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS moderation_strikes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            severity TEXT NOT NULL, -- 'warning', 'restricted', 'suspended', 'banned'
            issued_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (issued_by) REFERENCES users(id)
        );
        """)
        
        # 16. Moderation Appeals
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS moderation_appeals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            strike_id TEXT,
            appeal_text TEXT NOT NULL,
            status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
            reviewer_id TEXT,
            review_notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (strike_id) REFERENCES moderation_strikes(id),
            FOREIGN KEY (reviewer_id) REFERENCES users(id)
        );
        """)
        
        # 17. Agent Registry Definitions (~50 Specialized Agents)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_definitions (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL, -- 'generation', 'analysis', 'safety', 'recommendation', 'quality', 'operations'
            input_type TEXT DEFAULT 'json',
            output_type TEXT DEFAULT 'json',
            is_active INTEGER DEFAULT 1
        );
        """)
        
        # 18. Agent Runs & Telemetry
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_runs (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            agent_name TEXT NOT NULL,
            trigger_event TEXT NOT NULL,
            input_payload TEXT DEFAULT '{}',
            output_payload TEXT DEFAULT '{}',
            status TEXT DEFAULT 'success', -- 'running', 'success', 'failed'
            latency_ms INTEGER DEFAULT 0,
            tokens_used INTEGER DEFAULT 0,
            confidence REAL DEFAULT 0.95,
            error_message TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        """)
        
        # 19. User Streaks Log
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_streaks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            activity_date TEXT NOT NULL, -- YYYY-MM-DD
            activity_type TEXT NOT NULL, -- 'capture', 'improve', 'comment', 'collaborate'
            UNIQUE(user_id, activity_date, activity_type),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 20. Notifications
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL, -- 'reaction', 'comment', 'collaboration', 'system', 'streak', 'strike'
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT DEFAULT '',
            is_read INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        
        # 21. System Settings & Configuration
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 22. Polls & Community Voting (Instagram-Style)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS polls (
            id TEXT PRIMARY KEY,
            idea_id TEXT NOT NULL,
            question TEXT NOT NULL,
            options TEXT NOT NULL, -- JSON array of up to 4 options
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS poll_votes (
            id TEXT PRIMARY KEY,
            poll_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            option_index INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(poll_id, user_id),
            FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)

        # Migration: Add AI screening columns to collaborations if not present
        cursor.execute("PRAGMA table_info(collaborations);")
        collab_cols = [c["name"] for c in cursor.fetchall()]
        if "ai_seriousness_score" not in collab_cols:
            cursor.execute("ALTER TABLE collaborations ADD COLUMN ai_seriousness_score INTEGER DEFAULT 0;")
        if "ai_classification" not in collab_cols:
            cursor.execute("ALTER TABLE collaborations ADD COLUMN ai_classification TEXT DEFAULT 'unreviewed';")
        if "ai_rationale" not in collab_cols:
            cursor.execute("ALTER TABLE collaborations ADD COLUMN ai_rationale TEXT DEFAULT '';")
        if "ai_skills_matched" not in collab_cols:
            cursor.execute("ALTER TABLE collaborations ADD COLUMN ai_skills_matched TEXT DEFAULT '[]';")

        # Create Indexes for lightning fast queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reactions_idea ON reactions(idea_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_comments_idea ON comments(idea_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_polls_idea ON polls(idea_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_poll_votes ON poll_votes(poll_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_agent_runs_run_id ON agent_runs(run_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON agent_runs(created_at);")
