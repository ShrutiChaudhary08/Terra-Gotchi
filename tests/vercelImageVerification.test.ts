import { describe, it, expect, vi } from 'vitest';
import { safeFetchJson, AppApiError } from '../src/lib/apiClient.ts';
import { extractImagePayload, generateRequestId, sendJsonResponse, sendJsonError } from '../server/apiHelpers.ts';
import { verifyImageSubmission } from '../server/gemini.ts';
import feedHandler from '../api/pet/feed.ts';
import verifyHandler from '../api/challenges/verify.ts';

describe('Vercel Safe Client Response Handling', () => {
  it('parses successful 200 JSON responses cleanly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ success: true, message: 'Fed pet!' }),
    } as any);

    const data = await safeFetchJson<{ success: boolean; message: string }>('/api/pet/feed');
    expect(data.success).toBe(true);
    expect(data.message).toBe('Fed pet!');
  });

  it('safely handles Vercel plain-text 500 "A server error has occurred" without throwing SyntaxError', async () => {
    // This simulates the exact failure mode experienced on Vercel deployment
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'A server error has occurred',
    } as any);

    await expect(safeFetchJson('/api/pet/feed')).rejects.toThrow(AppApiError);

    try {
      await safeFetchJson('/api/pet/feed');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppApiError);
      expect(err.status).toBe(500);
      expect(err.code).toBe('VERCEL_SERVER_ERROR');
      // The error message must NEVER be "Unexpected token 'A', 'A server e'... is not valid JSON"
      expect(err.message).not.toContain('Unexpected token');
      expect(err.message).toContain('GEMINI_API_KEY');
    }
  });

  it('safely handles HTML 500 error pages from serverless edge proxies', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body><h1>500 Internal Server Error</h1></body></html>',
    } as any);

    try {
      await safeFetchJson('/api/challenges/verify');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppApiError);
      expect(err.status).toBe(500);
      expect(err.message).not.toContain('Unexpected token');
    }
  });

  it('distinguishes 503 Service Unavailable when Gemini API key is unconfigured', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () =>
        JSON.stringify({
          error: {
            code: 'GEMINI_KEY_MISSING',
            message: 'GEMINI_API_KEY environment variable is not configured.',
          },
        }),
    } as any);

    try {
      await safeFetchJson('/api/pet/feed');
    } catch (err: any) {
      expect(err.status).toBe(503);
      expect(err.code).toBe('GEMINI_KEY_MISSING');
      expect(err.message).toContain('GEMINI_API_KEY');
    }
  });

  it('distinguishes 504 Gateway Timeout during heavy AI vision evaluation', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Function execution timed out',
    } as any);

    try {
      await safeFetchJson('/api/pet/feed');
    } catch (err: any) {
      expect(err.status).toBe(504);
      expect(err.code).toBe('GATEWAY_TIMEOUT');
      expect(err.message).toContain('timed out');
    }
  });

  it('distinguishes 413 Payload Too Large when uncompressed photo exceeds limit', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      statusText: 'Payload Too Large',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Request Entity Too Large',
    } as any);

    try {
      await safeFetchJson('/api/pet/feed');
    } catch (err: any) {
      expect(err.status).toBe(413);
      expect(err.code).toBe('PAYLOAD_TOO_LARGE');
    }
  });
});

describe('Gemini Multimodal Verification Backend Behavior', () => {
  it('returns configuration diagnostic instead of fake approval when key is unconfigured', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    try {
      const result = await verifyImageSubmission({
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        challengeTitle: 'Find a leaf',
        challengeDescription: 'Look for leaf veins',
        challengeCategory: 'Plant Patterns',
        petName: 'Terra',
        requestId: 'test-req-no-key',
      });

      // Must NEVER return fake positive verification when Gemini credentials are not configured!
      expect(result.is_valid).toBe(false);
      expect(result.confidence).toBe(0.0);
      expect(result.errorCode).toBe('GEMINI_KEY_MISSING');
      expect(result.reason).toContain('GEMINI_API_KEY');
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey;
    }
  });

  it('rejects corrupted or empty image base64 payloads safely', async () => {
    process.env.GEMINI_API_KEY = 'mock-key-for-test';
    try {
      const result = await verifyImageSubmission({
        imageBase64: 'short',
        mimeType: 'image/jpeg',
        challengeTitle: 'Find rough bark',
        challengeDescription: 'Grooved tree trunk',
        challengeCategory: 'Botanical Textures',
        petName: 'Terra',
      });

      expect(result.is_valid).toBe(false);
      expect(result.detected_object).toBe('Invalid Image');
    } finally {
      delete process.env.GEMINI_API_KEY;
    }
  });
});

describe('Vercel API Route Handlers Integration', () => {
  function createMockResponse() {
    return {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader(k: string, v: string) {
        this.headers[k.toLowerCase()] = v;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
      end() {
        return this;
      },
      body: null as any,
    };
  }

  it('rejects requests missing an image payload with 400 and application/json Content-Type', async () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {},
    };
    const res = createMockResponse();

    await feedHandler(req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body?.error?.code).toBe('NO_IMAGE_PROVIDED');
  });

  it('verifyHandler rejects requests missing image with 400 JSON', async () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {},
    };
    const res = createMockResponse();

    await verifyHandler(req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body?.error?.code).toBe('NO_IMAGE_PROVIDED');
  });

  it('handles OPTIONS preflight with 200 and standard CORS headers', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {},
    };
    const res = createMockResponse();

    await feedHandler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });
});
