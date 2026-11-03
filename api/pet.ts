import type { Request, Response } from 'express';
import {
  getUserFromToken,
  getOrCreatePet,
  getActiveChallenge,
  saveChallenge,
  getJournalEntries,
  getUserAchievements,
  updatePet,
} from '../server/supabase.ts';
import { ACHIEVEMENTS_CATALOG } from '../server/achievements.ts';
import {
  parseRequestBody,
  generateRequestId,
  sendJsonResponse,
  sendJsonError,
  setStandardHeaders,
} from '../server/apiHelpers.ts';

export default async function handler(req: Request, res: Response) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  setStandardHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return sendJsonError(res, 401, 'UNAUTHORIZED', 'Unauthorized. Please sign in.', {
        requestId,
        route: '/api/pet',
        method: req.method,
        startTime,
      });
    }

    if (req.method === 'GET') {
      const pet = await getOrCreatePet(user.id);
      let activeChallenge = await getActiveChallenge(user.id);

      if (!activeChallenge) {
        const initial = {
          title: "Find a leaf with visible veins",
          description: "Look closely at a fallen or living leaf to find intricate branched vein patterns.",
          category: "Plant Patterns",
          difficulty: "Easy",
          xp_reward: 25,
        };
        activeChallenge = await saveChallenge(user.id, {
          user_id: user.id,
          title: initial.title,
          description: initial.description,
          category: initial.category,
          difficulty: initial.difficulty,
          xp_reward: initial.xp_reward,
          is_active: true,
          is_completed: false,
        });
      }

      const journal = await getJournalEntries(user.id);
      const unlockedAchievements = await getUserAchievements(user.id);

      return sendJsonResponse(res, 200, {
        pet,
        activeChallenge,
        stats: {
          totalFeedings: journal.length,
          unlockedCount: unlockedAchievements.length,
          totalAchievements: ACHIEVEMENTS_CATALOG.length,
        },
      }, {
        requestId,
        route: '/api/pet',
        method: 'GET',
        startTime,
      });
    }

    if (req.method === 'PUT') {
      const body = parseRequestBody(req);
      const name = body?.name;
      if (!name || typeof name !== 'string' || name.trim().length > 30) {
        return sendJsonError(res, 400, 'INVALID_NAME', 'Valid pet name required (max 30 chars).', {
          requestId,
          route: '/api/pet',
          method: 'PUT',
          startTime,
        });
      }
      const updated = await updatePet(user.id, { name: name.trim() });
      return sendJsonResponse(res, 200, { pet: updated }, {
        requestId,
        route: '/api/pet',
        method: 'PUT',
        startTime,
      });
    }

    return sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', {
      requestId,
      route: '/api/pet',
      method: req.method,
      startTime,
    });
  } catch (err: any) {
    return sendJsonError(res, 500, 'PET_ERROR', err.message || 'Server error', {
      requestId,
      route: '/api/pet',
      method: req.method,
      startTime,
    });
  }
}
