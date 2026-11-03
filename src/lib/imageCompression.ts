/**
 * High-performance client-side image compression and scaling
 * Scales large camera captures (often 3-15MB) down to optimized dimensions (~100-250KB)
 * Drastically reduces upload latency and accelerates Gemini multimodal AI vision examination.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: string;
}

/**
 * Compresses an image Blob or File down to a target max dimension and JPEG quality
 */
export async function compressImageForUpload(
  fileOrBlob: Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const maxDimension = options.maxDimension || 1024;
  const quality = options.quality ?? 0.82;
  const targetMime = options.mimeType || 'image/jpeg';

  // If already a small blob under 250KB and already JPEG, no need to re-encode
  if (fileOrBlob.size < 250 * 1024 && fileOrBlob.type === 'image/jpeg') {
    return fileOrBlob;
  }

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawSource: CanvasImageSource | null = null;
    let closeSource: (() => void) | null = null;

    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(fileOrBlob);
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
        drawSource = bitmap;
        closeSource = () => bitmap.close();
      } catch {
        // Fallback to HTMLImageElement
      }
    }

    if (!drawSource) {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(fileOrBlob);
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(image);
        };
        image.onerror = (err) => {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        };
        image.src = objectUrl;
      });

      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
      drawSource = img;
    }

    if (!sourceWidth || !sourceHeight) {
      if (closeSource) closeSource();
      return fileOrBlob;
    }

    // Compute target dimensions keeping aspect ratio
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (sourceWidth > maxDimension || sourceHeight > maxDimension) {
      if (sourceWidth > sourceHeight) {
        targetWidth = maxDimension;
        targetHeight = Math.round((sourceHeight * maxDimension) / sourceWidth);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((sourceWidth * maxDimension) / sourceHeight);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      if (closeSource) closeSource();
      return fileOrBlob;
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(drawSource, 0, 0, targetWidth, targetHeight);

    if (closeSource) closeSource();

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, targetMime, quality);
    });

    return compressedBlob || fileOrBlob;
  } catch (err) {
    console.warn('[ImageCompression] Fallback to original blob:', err);
    return fileOrBlob;
  }
}

/**
 * Converts a Blob to a Base64 data URL string safely
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode image to base64 Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}
