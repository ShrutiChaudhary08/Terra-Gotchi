import type { Request, Response } from 'express';
import { getUserFromToken, getJournalEntries, deleteJournalEntry } from '../server/supabase.ts';
import {
  parseRequestBody,
  generateRequestId,
  sendJsonResponse,
  sendJsonError,
  setStandardHeaders,
} from '../server/apiHelpers.ts';

export default async function handler(req: Request, res: Response) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  setStandardHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return sendJsonError(res, 401, 'UNAUTHORIZED', 'Unauthorized. Please sign in.', {
        requestId,
        route: '/api/journal',
        method: req.method,
        startTime,
      });
    }

    if (req.method === 'GET') {
      const entries = await getJournalEntries(user.id);
      return sendJsonResponse(res, 200, { journal: entries }, {
        requestId,
        route: '/api/journal',
        method: 'GET',
        startTime,
      });
    }

    if (req.method === 'DELETE') {
      const body = parseRequestBody(req);
      const id = (req.query.id as string) || body?.id;
      if (!id) {
        return sendJsonError(res, 400, 'MISSING_ID', 'Missing journal entry id', {
          requestId,
          route: '/api/journal',
          method: 'DELETE',
          startTime,
        });
      }
      const success = await deleteJournalEntry(user.id, id);
      return sendJsonResponse(res, 200, { success }, {
        requestId,
        route: '/api/journal',
        method: 'DELETE',
        startTime,
      });
    }

    return sendJsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', {
      requestId,
      route: '/api/journal',
      method: req.method,
      startTime,
    });
  } catch (err: any) {
    return sendJsonError(res, 500, 'JOURNAL_ERROR', err.message || 'Server error', {
      requestId,
      route: '/api/journal',
      method: req.method,
      startTime,
    });
  }
}
