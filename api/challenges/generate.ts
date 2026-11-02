import type { Request, Response } from 'express';
import { getUserFromToken, getOrCreatePet, getJournalEntries, saveChallenge } from '../../server/supabase.ts';
import { generateAICraving } from '../../server/gemini.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pet = await getOrCreatePet(user.id);
    const journal = await getJournalEntries(user.id);

    const generated = await generateAICraving({
      petLevel: pet.level,
      petName: pet.name,
      previousChallenges: journal.map((j) => j.title),
      categoryPreference: req.body?.category,
    });

    const saved = await saveChallenge(user.id, {
      user_id: user.id,
      title: generated.challenge,
      description: generated.description,
      category: generated.category,
      difficulty: generated.difficulty,
      xp_reward: generated.xp_reward,
      is_active: true,
      is_completed: false,
    });

    return res.json({ challenge: saved });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
