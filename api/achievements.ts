import type { Request, Response } from 'express';
import { getUserFromToken, getUserAchievements } from '../server/supabase.ts';
import { ACHIEVEMENTS_CATALOG } from '../server/routes.ts';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const unlockedIds = await getUserAchievements(user.id);
    const achievements = ACHIEVEMENTS_CATALOG.map((ach) => ({
      ...ach,
      isUnlocked: unlockedIds.includes(ach.id),
    }));

    return res.json({ achievements, unlockedCount: unlockedIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
