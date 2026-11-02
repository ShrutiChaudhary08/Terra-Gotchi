import type { Request, Response } from 'express';
import { getUserFromToken, getJournalEntries, deleteJournalEntry } from '../server/supabase.ts';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
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
      const entries = await getJournalEntries(user.id);
      return res.json({ journal: entries });
    }

    if (req.method === 'DELETE') {
      const body = parseBody(req);
      const id = (req.query.id as string) || body?.id;
      if (!id) return res.status(400).json({ error: 'Missing journal id' });
      const success = await deleteJournalEntry(user.id, id);
      return res.json({ success });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
