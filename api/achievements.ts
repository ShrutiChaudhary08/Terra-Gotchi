import type { Request, Response } from 'express';
import { getUserFromToken, getUserAchievements } from '../server/supabase.ts';
import { ACHIEVEMENTS_CATALOG } from '../server/achievements.ts';
import { generateRequestId, sendJsonResponse, sendJsonError, setStandardHeaders } from '../server/apiHelpers.ts';

export default async function handler(req: Request, res: Response) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  setStandardHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', {
      requestId,
      route: '/api/achievements',
      method: req.method,
      startTime,
    });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return sendJsonError(res, 401, 'UNAUTHORIZED', 'Unauthorized', {
        requestId,
        route: '/api/achievements',
        method: 'GET',
        startTime,
      });
    }

    const unlockedIds = await getUserAchievements(user.id);
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
  } catch (err: any) {
    return sendJsonError(res, 500, 'ACHIEVEMENTS_ERROR', err.message || 'Server error', {
      requestId,
      route: '/api/achievements',
      method: 'GET',
      startTime,
    });
  }
}
