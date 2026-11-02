export type GrowthStage = 'Seedling' | 'Sprout' | 'Explorer' | 'Forest Friend' | 'Nature Guardian';

export type PetMood = 'sleeping' | 'thinking' | 'hungry' | 'happy' | 'celebrating' | 'disappointed';

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  happiness: number; // 0-100
  hunger: number; // 0-100
  energy: number; // 0-100
  current_streak: number;
  best_streak: number;
  last_fed_at: string | null;
  growth_stage: GrowthStage;
}

export interface Challenge {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  xp_reward: number;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface JournalEntry {
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

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  xp_bonus: number;
  isUnlocked: boolean;
  unlocked_at?: string;
}

export interface VerificationResult {
  is_valid: boolean;
  confidence: number;
  detected_object: string;
  reason: string;
  feedback: string;
}

export interface FeedResponse {
  success: boolean;
  verification: VerificationResult;
  message: string;
  leveledUp: boolean;
  xpAwarded?: number;
  pet: Pet;
  journalEntry?: JournalEntry;
  newAchievements?: Achievement[];
  nextChallenge?: Challenge;
}
