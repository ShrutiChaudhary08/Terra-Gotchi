-- ====================================================================
-- TERRAGOTCHI SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Multi-user nature exploration virtual pet platform
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT DEFAULT 'Nature Explorer',
    avatar_url TEXT,
    sound_enabled BOOLEAN DEFAULT true,
    tts_enabled BOOLEAN DEFAULT true,
    preferred_camera TEXT DEFAULT 'environment',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pets Table (one pet per user, evolution stages and stats)
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Terra',
    level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
    xp_to_next_level INT NOT NULL DEFAULT 100,
    happiness INT NOT NULL DEFAULT 80 CHECK (happiness >= 0 AND happiness <= 100),
    hunger INT NOT NULL DEFAULT 30 CHECK (hunger >= 0 AND hunger <= 100),
    energy INT NOT NULL DEFAULT 90 CHECK (energy >= 0 AND energy <= 100),
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    last_fed_at TIMESTAMPTZ,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    growth_stage TEXT NOT NULL DEFAULT 'Seedling' CHECK (growth_stage IN ('Seedling', 'Sprout', 'Explorer', 'Forest Friend', 'Nature Guardian')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Challenges Table (active and historical nature cravings)
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Plant Patterns', 'Botanical Textures', 'Flora & Petals', 'Earth & Geology', 'Foliage', 'Forest Floor', 'Water & Sky', 'Urban Nature')),
    difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    xp_reward INT NOT NULL DEFAULT 25 CHECK (xp_reward >= 10 AND xp_reward <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Feeding Attempts Table (every verification attempt with Gemini)
CREATE TABLE IF NOT EXISTS feeding_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    detected_object TEXT,
    reason TEXT NOT NULL,
    pet_feedback TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Nature Journal Table (permanent record of approved discoveries)
CREATE TABLE IF NOT EXISTS nature_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE SET NULL,
    feeding_attempt_id UUID REFERENCES feeding_attempts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    detected_object TEXT NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL,
    xp_awarded INT NOT NULL DEFAULT 25,
    location_label TEXT DEFAULT 'Outdoors',
    discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Achievements Catalog Table
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    required_count INT NOT NULL DEFAULT 1,
    xp_bonus INT NOT NULL DEFAULT 50
);

-- 8. User Achievements Table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- 9. Daily Activity Table (track streaks accurately)
CREATE TABLE IF NOT EXISTS daily_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    feed_count INT NOT NULL DEFAULT 1,
    UNIQUE(user_id, activity_date)
);

-- --------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user_active ON challenges(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_feeding_attempts_user ON feeding_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_nature_journal_user ON nature_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date);

-- --------------------------------------------------------------------
-- SEED ACHIEVEMENTS
-- --------------------------------------------------------------------
INSERT INTO achievements (id, title, description, category, icon, required_count, xp_bonus) VALUES
('first_discovery', 'First Discovery', 'Complete your first nature challenge and feed Terra.', 'Milestone', '🌱', 1, 50),
('green_explorer', 'Green Explorer', 'Successfully complete 5 nature challenges outdoors.', 'Exploration', '🌿', 5, 100),
('pattern_hunter', 'Pattern Hunter', 'Discover 5 distinct natural patterns and textures.', 'Mastery', '🔍', 5, 100),
('botanical_scholar', 'Botanical Scholar', 'Photograph 10 plant, flower or leaf specimens.', 'Flora', '🌸', 10, 150),
('consistent_explorer', 'Consistent Explorer', 'Maintain an active 3-day exploration streak.', 'Streak', '🔥', 3, 150),
('week_in_the_wild', 'Week in the Wild', 'Touch grass 7 days in a row with your pet.', 'Streak', '⭐', 7, 300),
('nature_guardian', 'Nature Guardian', 'Evolve your Terra-Gotchi to Level 5.', 'Evolution', '🌳', 5, 500)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    xp_bonus = EXCLUDED.xp_bonus;

-- --------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) ACTIVATION
-- --------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nature_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- RLS POLICIES
-- --------------------------------------------------------------------

-- Profiles
CREATE POLICY "Users can read their own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update permitted fields in their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Pets
CREATE POLICY "Users can view their own pet"
    ON pets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pet name"
    ON pets FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Challenges
CREATE POLICY "Users can view their own challenges"
    ON challenges FOR SELECT USING (auth.uid() = user_id);

-- Feeding Attempts
CREATE POLICY "Users can view their own feeding attempts"
    ON feeding_attempts FOR SELECT USING (auth.uid() = user_id);

-- Nature Journal
CREATE POLICY "Users can view their own journal entries"
    ON nature_journal FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
    ON nature_journal FOR DELETE USING (auth.uid() = user_id);

-- Achievements (Public read for catalog)
CREATE POLICY "Achievements are viewable by all authenticated users"
    ON achievements FOR SELECT TO authenticated USING (true);

-- User Achievements
CREATE POLICY "Users can view their own unlocked achievements"
    ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Daily Activity
CREATE POLICY "Users can view their own daily activity"
    ON daily_activity FOR SELECT USING (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- AUTOMATIC USER & PET INITIALIZATION TRIGGER
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Insert into profiles
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- 2. Create initial Pet for the user
    INSERT INTO public.pets (user_id, name, level, xp, xp_to_next_level, happiness, hunger, energy, growth_stage)
    VALUES (NEW.id, 'Terra', 1, 0, 100, 85, 30, 90, 'Seedling');

    -- 3. Create initial challenge so user can immediately play
    INSERT INTO public.challenges (user_id, title, description, category, difficulty, xp_reward, is_active)
    VALUES (
        NEW.id,
        'Find a fresh green leaf',
        'Head outside and find a vibrant green leaf with visible veins or distinct edges.',
        'Plant Patterns',
        'Easy',
        25,
        true
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- STORAGE BUCKET CONFIGURATION FOR NATURE PHOTOGRAPHS
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('nature_photos', 'nature_photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload photos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'nature_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read nature photos"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'nature_photos');

CREATE POLICY "Users can delete their own uploaded photos"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'nature_photos' AND auth.uid()::text = (storage.foldername(name))[1]);
