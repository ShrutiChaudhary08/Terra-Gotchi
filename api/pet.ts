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
import { ACHIEVEMENTS_CATALOG } from '../server/routes.ts';

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

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
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

      return res.json({
        pet,
        activeChallenge,
        stats: {
          totalFeedings: journal.length,
          unlockedCount: unlockedAchievements.length,
          totalAchievements: ACHIEVEMENTS_CATALOG.length,
        },
      });
    }

    if (req.method === 'PUT') {
      const body = parseBody(req);
      const name = body?.name;
      if (!name || typeof name !== 'string' || name.trim().length > 30) {
        return res.status(400).json({ error: 'Valid pet name required (max 30 chars).' });
      }
      const updated = await updatePet(user.id, { name: name.trim() });
      return res.json({ pet: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
