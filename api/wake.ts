import type { Request, Response } from 'express';
import { getUserFromToken, getOrCreatePet, getActiveChallenge, saveChallenge } from '../server/supabase.ts';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
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

    return res.json({
      message: activeChallenge.title,
      pet,
      activeChallenge,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error waking up pet' });
  }
}
