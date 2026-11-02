import { describe, it, expect } from 'vitest';
import { parseRequestBody, extractImageAndMeta } from '../server/routes.ts';

describe('JSON Body Parsing and API Input Resilience', () => {
  it('parses stringified JSON bodies properly', () => {
    const raw = JSON.stringify({ category: 'Plant Patterns', count: 5 });
    const parsed = parseRequestBody({ body: raw });
    expect(parsed.category).toBe('Plant Patterns');
    expect(parsed.count).toBe(5);
  });

  it('preserves already parsed JSON objects', () => {
    const obj = { name: 'Leafy', level: 2 };
    const parsed = parseRequestBody({ body: obj });
    expect(parsed.name).toBe('Leafy');
    expect(parsed.level).toBe(2);
  });

  it('handles invalid or empty JSON gracefully without throwing', () => {
    expect(parseRequestBody({ body: null })).toEqual({});
    expect(parseRequestBody({ body: undefined })).toEqual({});
    expect(parseRequestBody({ body: '{invalid-json' })).toEqual({});
  });
});

describe('JSON Multimodal Image Payload Extraction', () => {
  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('extracts image from standard JSON payload with data URI', () => {
    const req = {
      body: {
        image: `data:image/png;base64,${dummyBase64}`,
        challengeId: 'ch-test-123',
      },
    };

    const extracted = extractImageAndMeta(req);
    expect(extracted).not.toBeNull();
    expect(extracted?.mimeType).toBe('image/png');
    expect(extracted?.challengeId).toBe('ch-test-123');
    expect(extracted?.buffer).toBeInstanceOf(Buffer);
    expect(extracted?.buffer.toString('base64')).toBe(dummyBase64);
  });

  it('extracts image from imageBase64 field without data URI prefix', () => {
    const req = {
      body: {
        imageBase64: dummyBase64,
        challengeId: 'ch-direct',
        mimeType: 'image/jpeg',
      },
    };

    const extracted = extractImageAndMeta(req);
    expect(extracted).not.toBeNull();
    expect(extracted?.mimeType).toBe('image/jpeg');
    expect(extracted?.challengeId).toBe('ch-direct');
    expect(extracted?.buffer.toString('base64')).toBe(dummyBase64);
  });

  it('extracts image from stringified JSON body sent over HTTP', () => {
    const req = {
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${dummyBase64}`,
        challenge_id: 'ch-stringified',
      }),
    };

    const extracted = extractImageAndMeta(req);
    expect(extracted).not.toBeNull();
    expect(extracted?.mimeType).toBe('image/jpeg');
    expect(extracted?.challengeId).toBe('ch-stringified');
  });

  it('falls back seamlessly to multipart req.file if uploaded as FormData', () => {
    const buffer = Buffer.from(dummyBase64, 'base64');
    const req = {
      file: {
        buffer,
        mimetype: 'image/webp',
      },
      body: {
        challengeId: 'ch-multipart',
      },
    };

    const extracted = extractImageAndMeta(req);
    expect(extracted).not.toBeNull();
    expect(extracted?.mimeType).toBe('image/webp');
    expect(extracted?.challengeId).toBe('ch-multipart');
    expect(extracted?.buffer).toBe(buffer);
  });

  it('returns null if neither file nor JSON image is supplied', () => {
    const req = {
      body: { challengeId: 'ch-missing-image' },
    };

    const extracted = extractImageAndMeta(req);
    expect(extracted).toBeNull();
  });
});
