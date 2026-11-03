import type { Request, Response } from 'express';
import { isServerSupabaseConfigured } from '../server/supabase.ts';
import { generateRequestId, sendJsonResponse, setStandardHeaders } from '../server/apiHelpers.ts';

export default function handler(_req: Request, res: Response) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  setStandardHeaders(res);

  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return sendJsonResponse(res, 200, {
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    supabaseConfigured: isServerSupabaseConfigured,
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  }, { requestId, route: '/api/health', method: 'GET', startTime });
}
