import { Router } from 'express';
import multer from 'multer';
import { generateAICraving, verifyImageSubmission } from './gemini.ts';
import {
  computeFeedingRewards,
  computeStreakUpdate,
  evaluateAchievements,
} from './gameLogic.ts';
import {
  getUserFromToken,
  getOrCreatePet,
  updatePet,
  getActiveChallenge,
  saveChallenge,
  completeChallenge,
  addJournalEntry,
  getJournalEntries,
  deleteJournalEntry,
  getUserAchievements,
  unlockUserAchievements,
  uploadImageToStorage,
  isServerSupabaseConfigured,
} from './supabase.ts';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Seed achievement catalog
export const ACHIEVEMENTS_CATALOG = [
  { id: 'first_discovery', title: 'First Discovery', description: 'Complete your first nature challenge and feed Terra.', category: 'Milestone', icon: '🌱', xp_bonus: 50 },
  { id: 'green_explorer', title: 'Green Explorer', description: 'Successfully complete 5 nature challenges outdoors.', category: 'Exploration', icon: '🌿', xp_bonus: 100 },
  { id: 'pattern_hunter', title: 'Pattern Hunter', description: 'Discover 5 distinct natural patterns and textures.', category: 'Mastery', icon: '🔍', xp_bonus: 100 },
  { id: 'botanical_scholar', title: 'Botanical Scholar', description: 'Photograph 10 plant, flower or leaf specimens.', category: 'Flora', icon: '🌸', xp_bonus: 150 },
  { id: 'consistent_explorer', title: 'Consistent Explorer', description: 'Maintain an active 3-day exploration streak.', category: 'Streak', icon: '🔥', xp_bonus: 150 },
  { id: 'week_in_the_wild', title: 'Week in the Wild', description: 'Touch grass 7 days in a row with your pet.', category: 'Streak', icon: '⭐', xp_bonus: 300 },
  { id: 'nature_guardian', title: 'Nature Guardian', description: 'Evolve your Terra-Gotchi to Level 5.', category: 'Evolution', icon: '🌳', xp_bonus: 500 },
];

// Helper to authenticate request
async function authMiddleware(req: any, res: any, next: any) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Authentication failed.' });
  }
}

// 1. GET /api/pet - Fetch pet stats & active craving (Instant response)
router.get('/pet', authMiddleware, async (req: any, res) => {
  try {
    const pet = await getOrCreatePet(req.user.id);
    let activeChallenge = await getActiveChallenge(req.user.id);

    // If no active challenge, assign instant nature challenge without blocking on external AI
    if (!activeChallenge) {
      const initial = {
        title: "Find a leaf with visible veins",
        description: "Look closely at a fallen or living leaf to find intricate branched vein patterns.",
        category: "Plant Patterns",
        difficulty: "Easy",
        xp_reward: 25,
      };
      activeChallenge = await saveChallenge(req.user.id, {
        user_id: req.user.id,
        title: initial.title,
        description: initial.description,
        category: initial.category,
        difficulty: initial.difficulty,
        xp_reward: initial.xp_reward,
        is_active: true,
        is_completed: false,
      });
    }

    const journal = await getJournalEntries(req.user.id);
    const unlockedAchievements = await getUserAchievements(req.user.id);

    return res.json({
      pet,
      activeChallenge,
      stats: {
        totalFeedings: journal.length,
        unlockedCount: unlockedAchievements.length,
        totalAchievements: ACHIEVEMENTS_CATALOG.length,
      },
    });
  } catch (error: any) {
    console.error('[API /pet] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch pet' });
  }
});

// Alias for wake-up pet (Instant response)
router.get('/wake', authMiddleware, async (req: any, res) => {
  try {
    const pet = await getOrCreatePet(req.user.id);
    let activeChallenge = await getActiveChallenge(req.user.id);
    if (!activeChallenge) {
      const initial = {
        title: "Find a leaf with visible veins",
        description: "Look closely at a fallen or living leaf to find intricate branched vein patterns.",
        category: "Plant Patterns",
        difficulty: "Easy",
        xp_reward: 25,
      };
      activeChallenge = await saveChallenge(req.user.id, {
        user_id: req.user.id,
        title: initial.title,
        description: initial.description,
        category: initial.category,
        difficulty: initial.difficulty,
        xp_reward: initial.xp_reward,
        is_active: true,
        is_completed: false,
      });
    }
    return res.json({
      message: activeChallenge.title,
      pet,
      activeChallenge,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error waking up pet' });
  }
});

// 2. PUT /api/pet - Update pet name or appearance
router.put('/pet', authMiddleware, async (req: any, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length > 30) {
      return res.status(400).json({ error: 'Valid pet name required (max 30 chars).' });
    }

    const updated = await updatePet(req.user.id, { name: name.trim() });
    return res.json({ pet: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update pet' });
  }
});

// 3. POST /api/challenges/generate - Generate new AI craving
router.post('/challenges/generate', authMiddleware, async (req: any, res) => {
  try {
    const pet = await getOrCreatePet(req.user.id);
    const journal = await getJournalEntries(req.user.id);
    const previousTitles = journal.map((j) => j.title);

    const generated = await generateAICraving({
      petLevel: pet.level,
      petName: pet.name,
      previousChallenges: previousTitles,
      categoryPreference: req.body?.category,
    });

    const saved = await saveChallenge(req.user.id, {
      user_id: req.user.id,
      title: generated.challenge,
      description: generated.description,
      category: generated.category,
      difficulty: generated.difficulty,
      xp_reward: generated.xp_reward,
      is_active: true,
      is_completed: false,
    });

    return res.json({ challenge: saved });
  } catch (error: any) {
    console.error('[API /challenges/generate] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate challenge' });
  }
});

// 4. POST /api/challenges/verify - Standalone image verification without state mutation
router.post('/challenges/verify', authMiddleware, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const challengeId = req.body.challengeId;
    const challenge = await getActiveChallenge(req.user.id);

    if (!challenge || (challengeId && challenge.id !== challengeId)) {
      return res.status(404).json({ error: 'Active challenge not found.' });
    }

    const pet = await getOrCreatePet(req.user.id);
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const verification = await verifyImageSubmission({
      imageBase64: base64,
      mimeType,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      challengeCategory: challenge.category,
      petName: pet.name,
    });

    return res.json({ verification });
  } catch (error: any) {
    console.error('[API /challenges/verify] Error:', error);
    return res.status(500).json({ error: error.message || 'Image verification failed' });
  }
});

// 5. POST /api/pet/feed - Multimodal verification AND secure reward processing
router.post('/pet/feed', authMiddleware, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const challengeId = req.body.challengeId;
    let challenge = await getActiveChallenge(req.user.id);

    if (!challenge) {
      return res.status(400).json({ error: 'No active challenge found. Please ask Terra for a craving first!' });
    }

    if (challenge.is_completed) {
      return res.status(400).json({ error: 'This challenge has already been completed!' });
    }

    const pet = await getOrCreatePet(req.user.id);
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    // 1. Run server-side Gemini Vision verification
    const verification = await verifyImageSubmission({
      imageBase64: base64,
      mimeType,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      challengeCategory: challenge.category,
      petName: pet.name,
    });

    // If verification rejected or failed, do NOT grant rewards
    if (!verification.is_valid) {
      return res.json({
        success: false,
        verification,
        message: verification.feedback,
        leveledUp: false,
        newAchievements: [],
        pet,
      });
    }

    // 2. Upload image to Supabase Storage or persistent data URL
    const imageUrl = await uploadImageToStorage(req.user.id, req.file.buffer, mimeType);

    // 3. Mark challenge completed
    await completeChallenge(req.user.id, challenge.id);

    // 4. Update streaks
    const streakUpdate = computeStreakUpdate(
      pet.last_fed_at,
      pet.current_streak,
      pet.best_streak
    );

    // 5. Calculate progression rewards
    const { newStats, leveledUp } = computeFeedingRewards(
      {
        level: pet.level,
        xp: pet.xp,
        xpToNextLevel: pet.xp_to_next_level,
        happiness: pet.happiness,
        hunger: pet.hunger,
        energy: pet.energy,
        currentStreak: streakUpdate.newCurrentStreak,
        bestStreak: streakUpdate.newBestStreak,
        growthStage: pet.growth_stage as any,
      },
      challenge.xp_reward
    );

    // 6. Update pet in database
    const updatedPet = await updatePet(req.user.id, {
      level: newStats.level,
      xp: newStats.xp,
      xp_to_next_level: newStats.xpToNextLevel,
      happiness: newStats.happiness,
      hunger: newStats.hunger,
      energy: newStats.energy,
      current_streak: newStats.currentStreak,
      best_streak: newStats.bestStreak,
      growth_stage: newStats.growthStage,
      last_fed_at: new Date().toISOString(),
    });

    // 7. Add permanent entry to Nature Journal
    const journalEntry = await addJournalEntry(req.user.id, {
      user_id: req.user.id,
      challenge_id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      image_url: imageUrl,
      detected_object: verification.detected_object,
      confidence: verification.confidence,
      xp_awarded: challenge.xp_reward,
    });

    // 8. Check achievements
    const allJournal = await getJournalEntries(req.user.id);
    const currentUnlocked = await getUserAchievements(req.user.id);
    const categoriesDiscovered = Array.from(new Set(allJournal.map((j) => j.category)));

    const newlyUnlockedIds = evaluateAchievements({
      totalFeedings: allJournal.length,
      currentStreak: updatedPet.current_streak,
      level: updatedPet.level,
      categoriesDiscovered,
      alreadyUnlockedIds: currentUnlocked,
    });

    if (newlyUnlockedIds.length > 0) {
      await unlockUserAchievements(req.user.id, newlyUnlockedIds);
    }

    const newAchievements = ACHIEVEMENTS_CATALOG.filter((a) =>
      newlyUnlockedIds.includes(a.id)
    );

    // 9. Generate next nature challenge automatically
    const nextChallengeData = await generateAICraving({
      petLevel: updatedPet.level,
      petName: updatedPet.name,
      previousChallenges: allJournal.map((j) => j.title),
    });

    const nextChallenge = await saveChallenge(req.user.id, {
      user_id: req.user.id,
      title: nextChallengeData.challenge,
      description: nextChallengeData.description,
      category: nextChallengeData.category,
      difficulty: nextChallengeData.difficulty,
      xp_reward: nextChallengeData.xp_reward,
      is_active: true,
      is_completed: false,
    });

    return res.json({
      success: true,
      verification,
      message: verification.feedback,
      leveledUp,
      xpAwarded: challenge.xp_reward,
      pet: updatedPet,
      journalEntry,
      newAchievements,
      nextChallenge,
    });
  } catch (error: any) {
    console.error('[API /pet/feed] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to feed pet' });
  }
});

// 6. GET /api/journal - Fetch user's nature journal
router.get('/journal', authMiddleware, async (req: any, res) => {
  try {
    const entries = await getJournalEntries(req.user.id);
    return res.json({ journal: entries });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch journal' });
  }
});

// 7. DELETE /api/journal/:id - Delete a journal entry
router.delete('/journal/:id', authMiddleware, async (req: any, res) => {
  try {
    const success = await deleteJournalEntry(req.user.id, req.params.id);
    return res.json({ success });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete journal entry' });
  }
});

// 8. GET /api/achievements - Fetch achievements catalog and unlocked list
router.get('/achievements', authMiddleware, async (req: any, res) => {
  try {
    const unlockedIds = await getUserAchievements(req.user.id);
    const achievements = ACHIEVEMENTS_CATALOG.map((ach) => ({
      ...ach,
      isUnlocked: unlockedIds.includes(ach.id),
    }));

    return res.json({ achievements, unlockedCount: unlockedIds.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch achievements' });
  }
});

// 9. GET /api/health - System and connectivity status
router.get('/health', (_req, res) => {
  return res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    supabaseConfigured: isServerSupabaseConfigured,
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

export default router;
