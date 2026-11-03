import type { Request, Response } from 'express';
import { getUserFromToken, getOrCreatePet, getActiveChallenge } from '../../server/supabase.ts';
import { verifyImageSubmission } from '../../server/gemini.ts';
import {
  extractImagePayload,
  generateRequestId,
  sendJsonResponse,
  sendJsonError,
  setStandardHeaders,
} from '../../server/apiHelpers.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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
      route: '/api/challenges/verify',
      method: req.method,
      startTime,
    });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return sendJsonError(res, 401, 'UNAUTHORIZED', 'Unauthorized. Please sign in.', {
        requestId,
        route: '/api/challenges/verify',
        method: 'POST',
        startTime,
      });
    }

    const imagePayload = extractImagePayload(req);
    if (!imagePayload) {
      return sendJsonError(
        res,
        400,
        'NO_IMAGE_PROVIDED',
        'No valid image uploaded. Please provide an image file or JSON payload with base64 image ({ "image": "data:image/jpeg;base64,..." }).',
        { requestId, route: '/api/challenges/verify', method: 'POST', startTime }
      );
    }

    const challenge = await getActiveChallenge(user.id);
    if (!challenge || (imagePayload.challengeId && challenge.id !== imagePayload.challengeId)) {
      return sendJsonError(
        res,
        404,
        'CHALLENGE_NOT_FOUND',
        'Active challenge not found. Please request a new craving first.',
        { requestId, route: '/api/challenges/verify', method: 'POST', startTime }
      );
    }

    const pet = await getOrCreatePet(user.id);
    const base64 = imagePayload.buffer.toString('base64');
    const mimeType = imagePayload.mimeType || 'image/jpeg';

    const verification = await verifyImageSubmission({
      imageBase64: base64,
      mimeType,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      challengeCategory: challenge.category,
      petName: pet.name,
      requestId,
    });

    if (verification.errorCode === 'GEMINI_KEY_MISSING') {
      return sendJsonError(
        res,
        503,
        'GEMINI_KEY_MISSING',
        verification.reason,
        { requestId, route: '/api/challenges/verify', method: 'POST', startTime, geminiModel: 'gemini-3.8-flash' }
      );
    }

    return sendJsonResponse(res, 200, { verification }, {
      requestId,
      route: '/api/challenges/verify',
      method: 'POST',
      startTime,
      geminiModel: 'gemini-3.8-flash',
      imageMime: mimeType,
      imageSizeKb: Math.round(imagePayload.sizeBytes / 1024),
    });
  } catch (error: any) {
    console.error(`[Vercel API /challenges/verify:${requestId}] Error:`, error);
    return sendJsonError(
      res,
      500,
      'VERIFICATION_INTERNAL_ERROR',
      error?.message || 'Image verification failed',
      { requestId, route: '/api/challenges/verify', method: 'POST', startTime }
    );
  }
}
