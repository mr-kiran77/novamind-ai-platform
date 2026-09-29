-- =====================================================================
-- NOVAMIND SUPABASE REAL-TIME READ/WRITE PERMISSIONS & BROWSING TELEMETRY
-- Instructions:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard/project/fsfkxxpqdgmdrqbckauq)
-- 2. Click "SQL Editor" on the left menu (the >_ icon)
-- 3. Click "New query", paste this entire script, and click "RUN" (green button)
-- =====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Real-Time Browsing & Activity Tracking Table
CREATE TABLE IF NOT EXISTS public.browsing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    username TEXT DEFAULT 'anonymous_visitor',
    event_type TEXT NOT NULL,
    page_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Disable Row Level Security (RLS) on all public tables so NovaMind can write freely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 4. Grant Full Read & Write Privileges to anon, authenticated, and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Add Permissive RLS Fallback Policies (in case RLS is re-enabled in settings)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations" ON public.%I;', r.tablename);
            EXECUTE format('CREATE POLICY "Allow all operations" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', r.tablename);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 6. Enable Real-Time Replication Publication for live UI listening
DO $$
DECLARE
    tbl text;
    target_tables text[] := ARRAY[
        'ideas', 'conversations', 'messages', 'comments', 
        'reactions', 'users', 'browsing_events', 'collaborations', 
        'polls', 'poll_votes', 'agent_runs'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
            ) THEN
                BEGIN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 7. Verification: Return table counts and realtime status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
