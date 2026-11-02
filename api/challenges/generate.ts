import type { Request, Response } from 'express';
import { getUserFromToken, getOrCreatePet, getJournalEntries, saveChallenge } from '../../server/supabase.ts';
import { generateAICraving } from '../../server/gemini.ts';

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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = parseBody(req);
    const pet = await getOrCreatePet(user.id);
    const journal = await getJournalEntries(user.id);

    const generated = await generateAICraving({
      petLevel: pet.level,
      petName: pet.name,
      previousChallenges: journal.map((j) => j.title),
      categoryPreference: body?.category || body?.categoryPreference,
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
    console.error('[API /challenges/generate] Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
