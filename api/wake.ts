import type { Request, Response } from 'express';
import { getUserFromToken, getOrCreatePet, getActiveChallenge, saveChallenge } from '../server/supabase.ts';
import { generateRequestId, sendJsonResponse, sendJsonError, setStandardHeaders } from '../server/apiHelpers.ts';

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
        route: '/api/wake',
        method: 'GET',
        startTime,
      });
    }

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

    return sendJsonResponse(res, 200, {
      message: activeChallenge.title,
      pet,
      activeChallenge,
    }, { requestId, route: '/api/wake', method: 'GET', startTime });
  } catch (err: any) {
    return sendJsonError(res, 500, 'WAKE_ERROR', err.message || 'Error waking up pet', {
      requestId,
      route: '/api/wake',
      method: 'GET',
      startTime,
    });
  }
}
