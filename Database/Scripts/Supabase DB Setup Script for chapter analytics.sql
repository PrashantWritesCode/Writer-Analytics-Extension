-- =====================================================
-- 1. TABLES SETUP
-- =====================================================

-- SUBSCRIPTIONS: Tracks user plans and limits
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
    story_limit INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TRACKED STORIES: Master list of stories per user
CREATE TABLE IF NOT EXISTS public.tracked_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    story_id TEXT NOT NULL, -- Wattpad Story ID
    title TEXT NOT NULL,
    total_chapters INTEGER DEFAULT 0,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete support
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, story_id)
);

-- CHAPTER SNAPSHOTS: Raw analytics data
CREATE TABLE IF NOT EXISTS public.chapter_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    story_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    reads INTEGER DEFAULT 0,
    votes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_snapshots ENABLE ROW LEVEL SECURITY;

-- Subscriptions Policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Tracked Stories Policies
CREATE POLICY "Users can manage own stories" ON public.tracked_stories FOR ALL USING (auth.uid() = user_id);

-- Chapter Snapshots Policies
CREATE POLICY "Users can manage own snapshots" ON public.chapter_snapshots FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. AUTO-CREATE FREE TIER TRIGGER
-- =====================================================

-- Function to insert a free subscription row on signup
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, story_limit)
  VALUES (NEW.id, 'free', 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new user is created in Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_subscription();

-- =====================================================
-- 4. PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tracked_stories_user_id ON public.tracked_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_snapshots_user_story ON public.chapter_snapshots(user_id, story_id);
CREATE INDEX IF NOT EXISTS idx_chapter_snapshots_captured_at ON public.chapter_snapshots(captured_at);