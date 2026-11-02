import type { Request, Response } from 'express';
import { getUserFromToken, getOrCreatePet, getActiveChallenge } from '../../server/supabase.ts';
import { verifyImageSubmission } from '../../server/gemini.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

function extractImage(body: any, file?: any): { buffer: Buffer; mimeType: string } | null {
  if (file && file.buffer) {
    return { buffer: file.buffer, mimeType: file.mimetype || 'image/jpeg' };
  }

  const rawImage = body?.image || body?.imageBase64 || body?.image_base64 || body?.photo || body?.data;
  if (rawImage && typeof rawImage === 'string') {
    let base64Data = rawImage;
    let mimeType = body.mimeType || body.contentType || 'image/jpeg';

    if (rawImage.startsWith('data:')) {
      const match = rawImage.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        const commaIdx = rawImage.indexOf(',');
        if (commaIdx !== -1) {
          base64Data = rawImage.substring(commaIdx + 1);
        }
      }
    }

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 0) {
        return { buffer, mimeType };
      }
    } catch {
      return null;
    }
  }

  return null;
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
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }

    const body = parseBody(req);
    const imagePayload = extractImage(body, (req as any).file);

    if (!imagePayload) {
      return res.status(400).json({
        error: 'No image uploaded. Please provide an image file or JSON payload with base64 image ({ "image": "data:image/jpeg;base64,..." }).',
      });
    }

    const challengeId = body.challengeId || body.challenge_id || req.query.challengeId;
    const challenge = await getActiveChallenge(user.id);

    if (!challenge || (challengeId && challenge.id !== challengeId)) {
      return res.status(404).json({ error: 'Active challenge not found.' });
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
    });

    return res.json({ verification });
  } catch (error: any) {
    console.error('[Vercel API /challenges/verify] Error:', error);
    return res.status(500).json({ error: error.message || 'Image verification failed' });
  }
}
