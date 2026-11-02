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
import { ACHIEVEMENTS_CATALOG } from '../../server/routes.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function parseBody(req: any) {
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

function extractImage(body: any, file?: any): { buffer: Buffer; mimeType: string } | null {
  if (file && file.buffer) {
    return { buffer: file.buffer, mimeType: file.mimetype || 'image/jpeg' };
  }

  const rawImage = body?.image || body?.imageBase64 || body?.image_base64 || body?.photo || body?.data;
  if (rawImage && typeof rawImage === 'string') {
    let base64Data = rawImage;
    let mimeType = body.mimeType || body.contentType || 'image/jpeg';

    if (rawImage.startsWith('data:')) {
      const match = rawImage.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        const commaIdx = rawImage.indexOf(',');
        if (commaIdx !== -1) {
          base64Data = rawImage.substring(commaIdx + 1);
        }
      }
    }

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 0) {
        return { buffer, mimeType };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export default async function handler(req: Request, res: Response) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }

    const body = parseBody(req);
    const imagePayload = extractImage(body, (req as any).file);

    if (!imagePayload) {
      return res.status(400).json({
        error: 'No image uploaded. Please provide an image file or JSON payload with base64 image ({ "image": "data:image/jpeg;base64,..." }).',
      });
    }

    let challenge = await getActiveChallenge(user.id);
    if (!challenge) {
      return res.status(400).json({ error: 'No active challenge found. Please ask Terra for a craving first!' });
    }

    if (challenge.is_completed) {
      return res.status(400).json({ error: 'This challenge has already been completed!' });
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
    });

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
    console.error('[Vercel API /pet/feed] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to feed pet' });
  }
}
