import type { Request, Response } from 'express';
import { isServerSupabaseConfigured } from '../server/supabase.ts';

export default function handler(_req: Request, res: Response) {
  return res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    supabaseConfigured: isServerSupabaseConfigured,
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
}
