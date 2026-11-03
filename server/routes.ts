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
import { ACHIEVEMENTS_CATALOG } from './achievements.ts';
import {
  extractImagePayload,
  generateRequestId,
  sendJsonResponse,
  sendJsonError,
} from './apiHelpers.ts';

export { ACHIEVEMENTS_CATALOG };
export { extractImagePayload as extractImageAndMeta };

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Robust JSON request body parser
export function parseRequestBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

// Helper to authenticate request
async function authMiddleware(req: any, res: any, next: any) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return sendJsonError(res, 401, 'UNAUTHORIZED', 'Unauthorized. Please sign in.');
    }
    req.user = user;
    next();
  } catch (err: any) {
    return sendJsonError(res, 401, 'AUTH_FAILED', 'Authentication failed.');
  }
}

// 1. GET /api/pet - Fetch pet stats & active craving (Instant response)
router.get('/pet', authMiddleware, async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

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

    const journal = await getJournalEntries(req.user.id);
    const unlockedAchievements = await getUserAchievements(req.user.id);

    return sendJsonResponse(res, 200, {
      pet,
      activeChallenge,
      stats: {
        totalFeedings: journal.length,
        unlockedCount: unlockedAchievements.length,
        totalAchievements: ACHIEVEMENTS_CATALOG.length,
      },
    }, { requestId, route: '/api/pet', method: 'GET', startTime });
  } catch (error: any) {
    console.error('[API /pet] Error:', error);
    return sendJsonError(res, 500, 'FETCH_PET_FAILED', error.message || 'Failed to fetch pet', {
      requestId,
      route: '/api/pet',
      method: 'GET',
      startTime,
    });
  }
});

// Alias for wake-up pet (Instant response)
router.get('/wake', authMiddleware, async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

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
    return sendJsonResponse(res, 200, {
      message: activeChallenge.title,
      pet,
      activeChallenge,
    }, { requestId, route: '/api/wake', method: 'GET', startTime });
  } catch (err: any) {
    return sendJsonError(res, 500, 'WAKE_FAILED', err.message || 'Error waking up pet', {
      requestId,
      route: '/api/wake',
      method: 'GET',
      startTime,
    });
  }
});

// 2. PUT /api/pet - Update pet name
router.put('/pet', authMiddleware, async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = parseRequestBody(req);
    const { name } = body;
    if (!name || typeof name !== 'string' || name.trim().length > 30) {
      return sendJsonError(res, 400, 'INVALID_PET_NAME', 'Valid pet name required (max 30 chars).', {
        requestId,
        route: '/api/pet',
        method: 'PUT',
        startTime,
      });
    }

    const updated = await updatePet(req.user.id, { name: name.trim() });
    return sendJsonResponse(res, 200, { pet: updated }, {
      requestId,
      route: '/api/pet',
      method: 'PUT',
      startTime,
    });
  } catch (error: any) {
    return sendJsonError(res, 500, 'UPDATE_PET_FAILED', error.message || 'Failed to update pet', {
      requestId,
      route: '/api/pet',
      method: 'PUT',
      startTime,
    });
  }
});

// 3. POST /api/challenges/generate - Generate new AI craving
router.post('/challenges/generate', authMiddleware, async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = parseRequestBody(req);
    const pet = await getOrCreatePet(req.user.id);
    const journal = await getJournalEntries(req.user.id);
    const previousTitles = journal.map((j) => j.title);

    const generated = await generateAICraving({
      petLevel: pet.level,
      petName: pet.name,
      previousChallenges: previousTitles,
      categoryPreference: body?.category || body?.categoryPreference,
      requestId,
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

    return sendJsonResponse(res, 200, { challenge: saved }, {
      requestId,
      route: '/api/challenges/generate',
      method: 'POST',
      startTime,
      geminiModel: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('[API /challenges/generate] Error:', error);
    return sendJsonError(res, 500, 'GENERATE_CHALLENGE_FAILED', error.message || 'Failed to generate challenge', {
      requestId,
      route: '/api/challenges/generate',
      method: 'POST',
      startTime,
    });
  }
});

// 4. POST /api/challenges/verify - Standalone image verification (JSON or multipart)
router.post('/challenges/verify', authMiddleware, upload.single('image'), async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const imagePayload = extractImagePayload(req);
    if (!imagePayload) {
      return sendJsonError(
        res,
        400,
        'NO_IMAGE_PROVIDED',
        'No valid image detected. Send JSON payload { "image": "data:image/jpeg;base64,..." } or multipart/form-data.',
        { requestId, route: '/api/challenges/verify', method: 'POST', startTime }
      );
    }

    const challenge = await getActiveChallenge(req.user.id);
    if (!challenge || (imagePayload.challengeId && challenge.id !== imagePayload.challengeId)) {
      return sendJsonError(
        res,
        404,
        'CHALLENGE_NOT_FOUND',
        'Active nature challenge not found. Please request a new craving first.',
        { requestId, route: '/api/challenges/verify', method: 'POST', startTime }
      );
    }

    const pet = await getOrCreatePet(req.user.id);
    const base64 = imagePayload.buffer.toString('base64');
    const mimeType = imagePayload.mimeType || 'image/jpeg';

    const verification = await verifyImageSubmission({
      imageBase64: base64,
      mimeType,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      challengeCategory: challenge.category,
      petName: pet.name,
      requestId,
    });

    // Check if configuration error occurred
    if (verification.errorCode === 'GEMINI_KEY_MISSING') {
      return sendJsonError(
        res,
        503,
        'GEMINI_KEY_MISSING',
        verification.reason,
        { requestId, route: '/api/challenges/verify', method: 'POST', startTime, geminiModel: 'gemini-3.8-flash' }
      );
    }

    return sendJsonResponse(res, 200, { verification }, {
      requestId,
      route: '/api/challenges/verify',
      method: 'POST',
      startTime,
      geminiModel: 'gemini-3.8-flash',
      imageMime: mimeType,
      imageSizeKb: Math.round(imagePayload.sizeBytes / 1024),
    });
  } catch (error: any) {
    console.error('[API /challenges/verify] Error:', error);
    return sendJsonError(
      res,
      500,
      'VERIFICATION_INTERNAL_ERROR',
      error.message || 'Image verification failed',
      { requestId, route: '/api/challenges/verify', method: 'POST', startTime }
    );
  }
});

// 5. POST /api/pet/feed - Multimodal verification AND secure reward processing (JSON or multipart)
router.post('/pet/feed', authMiddleware, upload.single('image'), async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const imagePayload = extractImagePayload(req);
    if (!imagePayload) {
      return sendJsonError(
        res,
        400,
        'NO_IMAGE_PROVIDED',
        'No valid image detected. Please send a JSON payload { "image": "data:image/jpeg;base64,..." } or multipart/form-data.',
        { requestId, route: '/api/pet/feed', method: 'POST', startTime }
      );
    }

    let challenge = await getActiveChallenge(req.user.id);
    if (!challenge) {
      return sendJsonError(
        res,
        400,
        'NO_ACTIVE_CHALLENGE',
        'No active challenge found. Please ask Terra for a craving first!',
        { requestId, route: '/api/pet/feed', method: 'POST', startTime }
      );
    }

    if (challenge.is_completed) {
      return sendJsonError(
        res,
        400,
        'CHALLENGE_ALREADY_COMPLETED',
        'This challenge has already been completed!',
        { requestId, route: '/api/pet/feed', method: 'POST', startTime }
      );
    }

    const pet = await getOrCreatePet(req.user.id);
    const base64 = imagePayload.buffer.toString('base64');
    const mimeType = imagePayload.mimeType || 'image/jpeg';

    // 1. Run server-side Gemini Vision verification
    const verification = await verifyImageSubmission({
      imageBase64: base64,
      mimeType,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      challengeCategory: challenge.category,
      petName: pet.name,
      requestId,
    });

    // Check if configuration error occurred
    if (verification.errorCode === 'GEMINI_KEY_MISSING') {
      return sendJsonError(
        res,
        503,
        'GEMINI_KEY_MISSING',
        verification.reason,
        { requestId, route: '/api/pet/feed', method: 'POST', startTime, geminiModel: 'gemini-3.8-flash' }
      );
    }

    // If verification rejected or failed, do NOT grant rewards
    if (!verification.is_valid) {
      return sendJsonResponse(res, 200, {
        success: false,
        verification,
        message: verification.feedback,
        leveledUp: false,
        newAchievements: [],
        pet,
      }, {
        requestId,
        route: '/api/pet/feed',
        method: 'POST',
        startTime,
        geminiModel: 'gemini-3.8-flash',
        imageMime: mimeType,
        imageSizeKb: Math.round(imagePayload.sizeBytes / 1024),
      });
    }

    // 2. Upload image to Supabase Storage or persistent data URL
    const imageUrl = await uploadImageToStorage(req.user.id, imagePayload.buffer, mimeType);

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
      requestId,
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

    return sendJsonResponse(res, 200, {
      success: true,
      verification,
      message: verification.feedback,
      leveledUp,
      xpAwarded: challenge.xp_reward,
      pet: updatedPet,
      journalEntry,
      newAchievements,
      nextChallenge,
    }, {
      requestId,
      route: '/api/pet/feed',
      method: 'POST',
      startTime,
      geminiModel: 'gemini-3.8-flash',
      imageMime: mimeType,
      imageSizeKb: Math.round(imagePayload.sizeBytes / 1024),
    });
  } catch (error: any) {
    console.error('[API /pet/feed] Error:', error);
    return sendJsonError(
      res,
      500,
      'FEED_INTERNAL_ERROR',
      error.message || 'Failed to feed pet',
      { requestId, route: '/api/pet/feed', method: 'POST', startTime }
    );
  }
});

// 6. GET /api/journal - Fetch user's nature journal
router.get('/journal', authMiddleware, async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const entries = await getJournalEntries(req.user.id);
    return sendJsonResponse(res, 200, { journal: entries }, {
      requestId,
      route: '/api/journal',
      method: 'GET',
      startTime,
    });
  } catch (error: any) {
    return sendJsonError(res, 500, 'FETCH_JOURNAL_FAILED', error.message || 'Failed to fetch journal', {
      requestId,
      route: '/api/journal',
      method: 'GET',
      startTime,
    });
  }
});

// 7. DELETE /api/journal/:id - Delete a journal entry
router.delete('/journal/:id', authMiddleware, async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const success = await deleteJournalEntry(req.user.id, req.params.id);
    return sendJsonResponse(res, 200, { success }, {
      requestId,
      route: `/api/journal/${req.params.id}`,
      method: 'DELETE',
      startTime,
    });
  } catch (error: any) {
    return sendJsonError(res, 500, 'DELETE_JOURNAL_FAILED', error.message || 'Failed to delete journal entry', {
      requestId,
      route: `/api/journal/${req.params.id}`,
      method: 'DELETE',
      startTime,
    });
  }
});

// 8. GET /api/achievements - Fetch achievements catalog and unlocked list
router.get('/achievements', authMiddleware, async (req: any, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const unlockedIds = await getUserAchievements(req.user.id);
    const achievements = ACHIEVEMENTS_CATALOG.map((ach) => ({
      ...ach,
      isUnlocked: unlockedIds.includes(ach.id),
    }));

    return sendJsonResponse(res, 200, { achievements, unlockedCount: unlockedIds.length }, {
      requestId,
      route: '/api/achievements',
      method: 'GET',
      startTime,
    });
  } catch (error: any) {
    return sendJsonError(res, 500, 'FETCH_ACHIEVEMENTS_FAILED', error.message || 'Failed to fetch achievements', {
      requestId,
      route: '/api/achievements',
      method: 'GET',
      startTime,
    });
  }
});

// 9. GET /api/health - System and connectivity status
router.get('/health', (_req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  return sendJsonResponse(res, 200, {
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    supabaseConfigured: isServerSupabaseConfigured,
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  }, { requestId, route: '/api/health', method: 'GET', startTime });
});

export default router;
