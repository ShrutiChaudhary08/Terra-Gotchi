import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

export const supabaseServer: SupabaseClient | null = isServerSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null;

// ====================================================================
// PERSISTENT LOCAL STORE (Used when Supabase is unconfigured or guest)
// ====================================================================
function getLocalStorePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'terra_local_store.json');
  }
  try {
    const localDir = path.join(__dirname, '..');
    fs.accessSync(localDir, fs.constants.W_OK);
    return path.join(localDir, 'terra_local_store.json');
  } catch {
    return path.join('/tmp', 'terra_local_store.json');
  }
}

const LOCAL_STORE_PATH = getLocalStorePath();

export interface UserPetRecord {
  id: string;
  user_id: string;
  name: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  happiness: number;
  hunger: number;
  energy: number;
  current_streak: number;
  best_streak: number;
  last_fed_at: string | null;
  growth_stage: string;
}

export interface ChallengeRecord {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  xp_reward: number;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface JournalRecord {
  id: string;
  user_id: string;
  challenge_id: string | null;
  title: string;
  category: string;
  image_url: string;
  detected_object: string;
  confidence: number;
  xp_awarded: number;
  discovered_at: string;
}

interface LocalStoreData {
  pets: Record<string, UserPetRecord>;
  challenges: Record<string, ChallengeRecord[]>;
  journal: Record<string, JournalRecord[]>;
  userAchievements: Record<string, string[]>;
}

function loadLocalStore(): LocalStoreData {
  try {
    const storePath = getLocalStorePath();
    if (fs.existsSync(storePath)) {
      return JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    }
  } catch (err) {
    console.warn('[LocalStore] Error reading store, initializing fresh:', err);
  }
  return {
    pets: {},
    challenges: {},
    journal: {},
    userAchievements: {},
  };
}

function saveLocalStore(data: LocalStoreData) {
  try {
    const storePath = getLocalStorePath();
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[LocalStore] Non-fatal store write failure (in-memory state preserved):', err);
  }
}

let localStore = loadLocalStore();

export async function getUserFromToken(authHeader?: string): Promise<{ id: string; email: string } | null> {
  if (!authHeader) return { id: 'guest-explorer', email: 'guest@terragotchi.local' };

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === 'guest-token') {
    return { id: 'guest-explorer', email: 'guest@terragotchi.local' };
  }

  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (error || !data.user) {
        return { id: 'guest-explorer', email: 'guest@terragotchi.local' };
      }
      return { id: data.user.id, email: data.user.email || '' };
    } catch {
      return { id: 'guest-explorer', email: 'guest@terragotchi.local' };
    }
  }

  return { id: 'guest-explorer', email: 'guest@terragotchi.local' };
}

export async function getOrCreatePet(userId: string): Promise<UserPetRecord> {
  if (supabaseServer) {
    const { data: pet } = await supabaseServer
      .from('pets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (pet) return pet;

    // Create pet
    const newPet = {
      user_id: userId,
      name: 'Terra',
      level: 1,
      xp: 0,
      xp_to_next_level: 100,
      happiness: 80,
      hunger: 35,
      energy: 90,
      current_streak: 0,
      best_streak: 0,
      growth_stage: 'Seedling',
    };

    const { data: created } = await supabaseServer
      .from('pets')
      .insert(newPet)
      .select()
      .single();

    if (created) return created;
  }

  // Local Store Fallback
  if (!localStore.pets[userId]) {
    localStore.pets[userId] = {
      id: `pet-${Date.now()}`,
      user_id: userId,
      name: 'Terra',
      level: 1,
      xp: 0,
      xp_to_next_level: 100,
      happiness: 80,
      hunger: 35,
      energy: 90,
      current_streak: 0,
      best_streak: 0,
      last_fed_at: null,
      growth_stage: 'Seedling',
    };
    saveLocalStore(localStore);
  }

  return localStore.pets[userId];
}

export async function updatePet(userId: string, updates: Partial<UserPetRecord>): Promise<UserPetRecord> {
  if (supabaseServer) {
    const { data, error } = await supabaseServer
      .from('pets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (data && !error) return data;
  }

  const current = await getOrCreatePet(userId);
  const updated = { ...current, ...updates };
  localStore.pets[userId] = updated;
  saveLocalStore(localStore);
  return updated;
}

export async function getActiveChallenge(userId: string): Promise<ChallengeRecord | null> {
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from('challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) return data;
  }

  const list = localStore.challenges[userId] || [];
  return list.find((c) => c.is_active && !c.is_completed) || null;
}

export async function saveChallenge(userId: string, challenge: Omit<ChallengeRecord, 'id' | 'created_at'>): Promise<ChallengeRecord> {
  if (supabaseServer) {
    // Deactivate previous active challenges
    await supabaseServer
      .from('challenges')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    const { data } = await supabaseServer
      .from('challenges')
      .insert({ ...challenge, user_id: userId })
      .select()
      .single();

    if (data) return data;
  }

  // Deactivate previous in local store
  if (!localStore.challenges[userId]) localStore.challenges[userId] = [];
  localStore.challenges[userId].forEach((c) => {
    if (c.is_active) c.is_active = false;
  });

  const record: ChallengeRecord = {
    ...challenge,
    id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  localStore.challenges[userId].unshift(record);
  saveLocalStore(localStore);
  return record;
}

export async function completeChallenge(userId: string, challengeId: string): Promise<void> {
  if (supabaseServer) {
    await supabaseServer
      .from('challenges')
      .update({ is_active: false, is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', challengeId)
      .eq('user_id', userId);
    return;
  }

  const list = localStore.challenges[userId] || [];
  const item = list.find((c) => c.id === challengeId);
  if (item) {
    item.is_active = false;
    item.is_completed = true;
    saveLocalStore(localStore);
  }
}

export async function addJournalEntry(userId: string, entry: Omit<JournalRecord, 'id' | 'discovered_at'>): Promise<JournalRecord> {
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from('nature_journal')
      .insert({ ...entry, user_id: userId })
      .select()
      .single();

    if (data) return data;
  }

  if (!localStore.journal[userId]) localStore.journal[userId] = [];
  const record: JournalRecord = {
    ...entry,
    id: `jn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    discovered_at: new Date().toISOString(),
  };

  localStore.journal[userId].unshift(record);
  saveLocalStore(localStore);
  return record;
}

export async function getJournalEntries(userId: string): Promise<JournalRecord[]> {
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from('nature_journal')
      .select('*')
      .eq('user_id', userId)
      .order('discovered_at', { ascending: false });

    if (data) return data;
  }

  return localStore.journal[userId] || [];
}

export async function deleteJournalEntry(userId: string, journalId: string): Promise<boolean> {
  if (supabaseServer) {
    const { error } = await supabaseServer
      .from('nature_journal')
      .delete()
      .eq('id', journalId)
      .eq('user_id', userId);

    return !error;
  }

  const list = localStore.journal[userId] || [];
  localStore.journal[userId] = list.filter((j) => j.id !== journalId);
  saveLocalStore(localStore);
  return true;
}

export async function getUserAchievements(userId: string): Promise<string[]> {
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (data) return data.map((d: any) => d.achievement_id);
  }

  return localStore.userAchievements[userId] || [];
}

export async function unlockUserAchievements(userId: string, achievementIds: string[]): Promise<string[]> {
  if (achievementIds.length === 0) return [];

  if (supabaseServer) {
    const inserts = achievementIds.map((aid) => ({
      user_id: userId,
      achievement_id: aid,
    }));
    await supabaseServer.from('user_achievements').upsert(inserts, { onConflict: 'user_id,achievement_id' });
    return achievementIds;
  }

  if (!localStore.userAchievements[userId]) localStore.userAchievements[userId] = [];
  achievementIds.forEach((id) => {
    if (!localStore.userAchievements[userId].includes(id)) {
      localStore.userAchievements[userId].push(id);
    }
  });
  saveLocalStore(localStore);
  return achievementIds;
}

export async function uploadImageToStorage(userId: string, buffer: Buffer, mimeType: string): Promise<string> {
  if (supabaseServer) {
    try {
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { data, error } = await supabaseServer.storage
        .from('nature_photos')
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data) {
        const { data: pubUrl } = supabaseServer.storage
          .from('nature_photos')
          .getPublicUrl(filename);
        return pubUrl.publicUrl;
      }
    } catch (storageErr) {
      console.warn('[Storage] Supabase storage upload failed, falling back to data URL:', storageErr);
    }
  }

  // Fallback to optimized data URL so images render instantly
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
