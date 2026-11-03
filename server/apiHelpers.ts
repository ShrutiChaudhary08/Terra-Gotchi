import type { Request, Response } from 'express';

export interface ExtractedImage {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  challengeId?: string;
  source: 'json' | 'multipart' | 'buffer';
}

export interface DiagnosticLog {
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  geminiModel?: string;
  imageMimeType?: string;
  imageSizeKb?: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Generate a safe unique request identifier
 */
export function generateRequestId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Safe diagnostic logger that never prints secrets, tokens, or image bytes
 */
export function logDiagnostic(diag: DiagnosticLog): void {
  const meta: Record<string, any> = {
    requestId: diag.requestId,
    route: diag.route,
    method: diag.method,
    status: diag.status,
    durationMs: Math.round(diag.durationMs),
  };

  if (diag.geminiModel) meta.geminiModel = diag.geminiModel;
  if (diag.imageMimeType) meta.imageMimeType = diag.imageMimeType;
  if (diag.imageSizeKb !== undefined) meta.imageSizeKb = Math.round(diag.imageSizeKb);
  if (diag.errorCode) meta.errorCode = diag.errorCode;
  if (diag.errorMessage) meta.errorMessage = diag.errorMessage.substring(0, 200);

  console.info(`[Diagnostic] ${diag.route} ${diag.status} (${diag.durationMs}ms):`, JSON.stringify(meta));
}

/**
 * Set standard JSON and CORS headers
 */
export function setStandardHeaders(res: Response): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

/**
 * Send a clean, standardized JSON success response
 */
export function sendJsonResponse<T extends object>(
  res: Response,
  statusCode: number,
  data: T,
  diag?: { requestId: string; route: string; method: string; startTime: number; geminiModel?: string; imageMime?: string; imageSizeKb?: number }
): void {
  setStandardHeaders(res);
  if (diag) {
    logDiagnostic({
      requestId: diag.requestId,
      route: diag.route,
      method: diag.method,
      status: statusCode,
      durationMs: Date.now() - diag.startTime,
      geminiModel: diag.geminiModel,
      imageMimeType: diag.imageMime,
      imageSizeKb: diag.imageSizeKb,
    });
  }
  res.status(statusCode).json(data);
}

/**
 * Send a clean, standardized JSON error response
 */
export function sendJsonError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  diag?: { requestId: string; route: string; method: string; startTime: number; geminiModel?: string; details?: any }
): void {
  setStandardHeaders(res);
  if (diag) {
    logDiagnostic({
      requestId: diag.requestId,
      route: diag.route,
      method: diag.method,
      status: statusCode,
      durationMs: Date.now() - diag.startTime,
      geminiModel: diag.geminiModel,
      errorCode: code,
      errorMessage: message,
    });
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: diag?.requestId || generateRequestId(),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Safe JSON body parser that handles objects, string bodies, and Buffers
 */
export function parseRequestBody(req: any): any {
  if (!req.body) return {};

  if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (Buffer.isBuffer(req.body)) {
    const str = req.body.toString('utf-8');
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }

  return {};
}

/**
 * Extract image buffer, MIME type, and metadata from any payload format:
 * - JSON body { image: "data:image/jpeg;base64,..." }
 * - JSON body { imageBase64: "...", mimeType: "..." }
 * - Express multipart upload (req.file)
 * - Raw Buffer / multipart fallback
 */
export function extractImagePayload(req: any): ExtractedImage | null {
  const body = parseRequestBody(req);

  // 1. Express / multer file object
  if (req.file && req.file.buffer) {
    const mime = (req.file.mimetype || 'image/jpeg').toLowerCase();
    const challengeId = body?.challengeId || body?.challenge_id || req.query?.challengeId;
    return {
      buffer: req.file.buffer,
      mimeType: mime,
      sizeBytes: req.file.buffer.length,
      challengeId,
      source: 'multipart',
    };
  }

  // 2. Base64 in JSON payload
  const rawImage =
    body?.image ||
    body?.imageBase64 ||
    body?.image_base64 ||
    body?.photo ||
    body?.data ||
    body?.file;

  if (rawImage && typeof rawImage === 'string') {
    let base64Data = rawImage;
    let mimeType = (body.mimeType || body.contentType || 'image/jpeg').toLowerCase();

    // Handle Data URL format: data:image/png;base64,...
    if (rawImage.startsWith('data:')) {
      const match = rawImage.match(/^data:([^;]+);base64,(.*)$/i);
      if (match) {
        mimeType = match[1].toLowerCase();
        base64Data = match[2];
      } else {
        const commaIdx = rawImage.indexOf(',');
        if (commaIdx !== -1) {
          base64Data = rawImage.substring(commaIdx + 1);
        }
      }
    }

    // Clean whitespace/newlines from base64 string
    base64Data = base64Data.replace(/\s+/g, '');

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 50) {
        const challengeId = body?.challengeId || body?.challenge_id || req.query?.challengeId;
        return {
          buffer,
          mimeType,
          sizeBytes: buffer.length,
          challengeId,
          source: 'json',
        };
      }
    } catch (err) {
      console.warn('[extractImagePayload] Base64 decode failed:', err);
    }
  }

  // 3. Fallback: Parse multipart buffer manually if Vercel serverless receives raw buffer
  if (Buffer.isBuffer(req.body)) {
    const contentType = req.headers?.['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const buffer = req.body;
        const separator = Buffer.from(`--${boundary}`);
        const parts = splitBuffer(buffer, separator);

        for (const part of parts) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const headerStr = part.slice(0, headerEnd).toString('utf-8');
            if (/name=["']image["']/i.test(headerStr)) {
              let mime = 'image/jpeg';
              const mimeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
              if (mimeMatch) mime = mimeMatch[1].trim().toLowerCase();

              // Slice content minus trailing \r\n
              let content = part.slice(headerEnd + 4);
              if (content.slice(-2).toString() === '\r\n') {
                content = content.slice(0, -2);
              }

              if (content.length > 50) {
                return {
                  buffer: content,
                  mimeType: mime,
                  sizeBytes: content.length,
                  challengeId: req.query?.challengeId,
                  source: 'multipart',
                };
              }
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Helper to split a buffer by separator
 */
function splitBuffer(buf: Buffer, sep: Buffer): Buffer[] {
  const result: Buffer[] = [];
  let start = 0;
  let index: number;

  while ((index = buf.indexOf(sep, start)) !== -1) {
    if (index > start) {
      result.push(buf.slice(start, index));
    }
    start = index + sep.length;
  }

  if (start < buf.length) {
    result.push(buf.slice(start));
  }

  return result;
}
