import type { Request, Response } from 'express';
import { getUserFromToken, getOrCreatePet, getJournalEntries, saveChallenge } from '../../server/supabase.ts';
import { generateAICraving } from '../../server/gemini.ts';
import {
  parseRequestBody,
  generateRequestId,
  sendJsonResponse,
  sendJsonError,
  setStandardHeaders,
} from '../../server/apiHelpers.ts';

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
      route: '/api/challenges/generate',
      method: req.method,
      startTime,
    });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return sendJsonError(res, 401, 'UNAUTHORIZED', 'Unauthorized. Please sign in.', {
        requestId,
        route: '/api/challenges/generate',
        method: 'POST',
        startTime,
      });
    }

    const body = parseRequestBody(req);
    const pet = await getOrCreatePet(user.id);
    const journal = await getJournalEntries(user.id);

    const generated = await generateAICraving({
      petLevel: pet.level,
      petName: pet.name,
      previousChallenges: journal.map((j) => j.title),
      categoryPreference: body?.category || body?.categoryPreference,
      requestId,
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

    return sendJsonResponse(res, 200, { challenge: saved }, {
      requestId,
      route: '/api/challenges/generate',
      method: 'POST',
      startTime,
      geminiModel: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error(`[API /challenges/generate:${requestId}] Error:`, err);
    return sendJsonError(res, 500, 'CHALLENGE_GEN_ERROR', err.message || 'Server error', {
      requestId,
      route: '/api/challenges/generate',
      method: 'POST',
      startTime,
    });
  }
}
