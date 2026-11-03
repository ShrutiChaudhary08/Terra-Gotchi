import type { Request, Response } from 'express';
import {
  getUserFromToken,
  getOrCreatePet,
  getActiveChallenge,
  completeChallenge,
  updatePet,
  addJournalEntry,
  getJournalEntries,
  getUserAchievements,
  unlockUserAchievements,
  uploadImageToStorage,
  saveChallenge,
} from '../../server/supabase.ts';
import { verifyImageSubmission, generateAICraving } from '../../server/gemini.ts';
import { computeFeedingRewards, computeStreakUpdate, evaluateAchievements } from '../../server/gameLogic.ts';
import { ACHIEVEMENTS_CATALOG } from '../../server/achievements.ts';
import {
  extractImagePayload,
  generateRequestId,
  sendJsonResponse,
  sendJsonError,
  setStandardHeaders,
} from '../../server/apiHelpers.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: Request, res: Response) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  setStandardHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed. Use POST.', {
      requestId,
      route: '/api/pet/feed',
      method: req.method,
      startTime,
    });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return sendJsonError(res, 401, 'UNAUTHORIZED', 'Unauthorized. Please sign in.', {
        requestId,
        route: '/api/pet/feed',
        method: 'POST',
        startTime,
      });
    }

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

    let challenge = await getActiveChallenge(user.id);
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

    const pet = await getOrCreatePet(user.id);
    const base64 = imagePayload.buffer.toString('base64');
    const mimeType = imagePayload.mimeType || 'image/jpeg';

    // 1. Multimodal AI verification
    const verification = await verifyImageSubmission({
      imageBase64: base64,
      mimeType,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      challengeCategory: challenge.category,
      petName: pet.name,
      requestId,
    });

    // Check if Gemini API key is missing
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

    // 2. Storage & persistence
    const imageUrl = await uploadImageToStorage(user.id, imagePayload.buffer, mimeType);
    await completeChallenge(user.id, challenge.id);

    const streakUpdate = computeStreakUpdate(pet.last_fed_at, pet.current_streak, pet.best_streak);
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

    const updatedPet = await updatePet(user.id, {
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

    const journalEntry = await addJournalEntry(user.id, {
      user_id: user.id,
      challenge_id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      image_url: imageUrl,
      detected_object: verification.detected_object,
      confidence: verification.confidence,
      xp_awarded: challenge.xp_reward,
    });

    const allJournal = await getJournalEntries(user.id);
    const currentUnlocked = await getUserAchievements(user.id);
    const categoriesDiscovered = Array.from(new Set(allJournal.map((j) => j.category)));

    const newlyUnlockedIds = evaluateAchievements({
      totalFeedings: allJournal.length,
      currentStreak: updatedPet.current_streak,
      level: updatedPet.level,
      categoriesDiscovered,
      alreadyUnlockedIds: currentUnlocked,
    });

    if (newlyUnlockedIds.length > 0) {
      await unlockUserAchievements(user.id, newlyUnlockedIds);
    }

    const newAchievements = ACHIEVEMENTS_CATALOG.filter((a) => newlyUnlockedIds.includes(a.id));

    const nextChallengeData = await generateAICraving({
      petLevel: updatedPet.level,
      petName: updatedPet.name,
      previousChallenges: allJournal.map((j) => j.title),
      requestId,
    });

    const nextChallenge = await saveChallenge(user.id, {
      user_id: user.id,
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
    console.error(`[Vercel API /pet/feed:${requestId}] Error:`, error);
    return sendJsonError(
      res,
      500,
      'FEED_INTERNAL_ERROR',
      error?.message || 'Failed to feed pet',
      { requestId, route: '/api/pet/feed', method: 'POST', startTime }
    );
  }
}
