import type { Request, Response } from 'express';
import { getUserFromToken, getJournalEntries, deleteJournalEntry } from '../server/supabase.ts';

export default async function handler(req: Request, res: Response) {
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
      const id = req.query.id as string || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing journal id' });
      const success = await deleteJournalEntry(user.id, id);
      return res.json({ success });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
