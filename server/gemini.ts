import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { logDiagnostic } from './apiHelpers.ts';

/**
 * Dynamically resolves the Gemini API key from environment variables
 */
export function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();
}

/**
 * Returns a configured GoogleGenAI client instance or null if no key is set
 */
export function getGeminiClient(): GoogleGenAI | null {
  const key = getGeminiApiKey();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const VALID_CATEGORIES = [
  'Plant Patterns',
  'Botanical Textures',
  'Flora & Petals',
  'Earth & Geology',
  'Foliage',
  'Forest Floor',
  'Water & Sky',
  'Urban Nature',
] as const;

export type ChallengeCategory = typeof VALID_CATEGORIES[number];
export type ChallengeDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface GeneratedChallenge {
  challenge: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  xp_reward: number;
  description: string;
}

export interface VerificationResult {
  is_valid: boolean;
  confidence: number;
  detected_object: string;
  reason: string;
  feedback: string;
  errorCode?: string;
}

// Fallback pool of nature challenges if API key is unconfigured or rate limited
export const FALLBACK_CHALLENGES: GeneratedChallenge[] = [
  {
    challenge: "Find a leaf with visible veins",
    category: "Plant Patterns",
    difficulty: "Easy",
    xp_reward: 25,
    description: "Look closely at a fallen or living leaf to find intricate branched vein patterns."
  },
  {
    challenge: "Discover rough tree bark with deep ridges",
    category: "Botanical Textures",
    difficulty: "Easy",
    xp_reward: 25,
    description: "Find an older tree trunk with rugged, grooved, or peeling bark texture."
  },
  {
    challenge: "Photograph a blooming flower or bright petal",
    category: "Flora & Petals",
    difficulty: "Medium",
    xp_reward: 35,
    description: "Search your garden or park for a vibrant blossom, dandelion, or wildflower."
  },
  {
    challenge: "Find a patch of soft, velvety green moss",
    category: "Forest Floor",
    difficulty: "Medium",
    xp_reward: 35,
    description: "Look near damp rocks, shaded soil, or tree bases for lush emerald moss."
  },
  {
    challenge: "Find a smooth river rock or patterned pebble",
    category: "Earth & Geology",
    difficulty: "Easy",
    xp_reward: 20,
    description: "Find a naturally weathered stone with distinct grain, layers, or smoothness."
  },
  {
    challenge: "Locate a pinecone or needle cluster",
    category: "Foliage",
    difficulty: "Medium",
    xp_reward: 30,
    description: "Find a fallen pinecone or a green cluster of evergreen pine needles."
  },
  {
    challenge: "Find a blade of grass holding a droplet of water or dew",
    category: "Water & Sky",
    difficulty: "Hard",
    xp_reward: 50,
    description: "Capture a fresh green grass blade glistening in natural sunlight."
  },
  {
    challenge: "Discover a brave plant growing in an urban sidewalk crack",
    category: "Urban Nature",
    difficulty: "Medium",
    xp_reward: 40,
    description: "Find resilient greenery pushing through pavement, brickwork, or gravel."
  }
];

/**
 * Generates an AI-powered nature challenge using Gemini 3.8 Flash
 */
export async function generateAICraving(params: {
  petLevel: number;
  petName: string;
  previousChallenges: string[];
  categoryPreference?: string;
  requestId?: string;
}): Promise<GeneratedChallenge> {
  const { petLevel, petName, previousChallenges, categoryPreference, requestId = 'req-craving' } = params;
  const startTime = Date.now();
  const ai = getGeminiClient();

  if (!ai) {
    console.warn(`[Gemini:${requestId}] No GEMINI_API_KEY detected, selecting from curated fallback challenges`);
    const filtered = FALLBACK_CHALLENGES.filter(
      (c) => !previousChallenges.includes(c.challenge)
    );
    const pool = filtered.length > 0 ? filtered : FALLBACK_CHALLENGES;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  try {
    const prompt = `You are the creative brain of "${petName}", a digital pet that survives strictly by exploring and eating real-world outdoor nature.
The pet is currently Level ${petLevel} (growth stage).
The user has previously encountered: ${JSON.stringify(previousChallenges.slice(-5))}.
${categoryPreference ? `Prefer this category if fitting: ${categoryPreference}` : ''}

Generate a creative, safe, outdoors-encouraging nature challenge.
The challenge MUST:
1. Require finding an outdoor natural element, texture, botanical object, or geological feature to photograph.
2. Be safe (never ask to disturb wildlife, harm habitats, or climb dangerous areas).
3. Be specific enough for computer vision to verify (e.g. "Find a serrated green leaf", "Find wet moss on wood", "Find smooth layered stone").
4. Assign an appropriate difficulty ("Easy", "Medium", "Hard") and XP reward (Easy: 15-25, Medium: 30-40, Hard: 45-60).
5. Categorize strictly as one of: ${VALID_CATEGORIES.join(', ')}.`;

    const geminiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "You are the AI game director for Terra-Gotchi. You only output valid JSON matching the requested schema.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            challenge: {
              type: Type.STRING,
              description: 'Short 4-8 word challenge title (e.g. "Find a leaf with visible veins")',
            },
            category: {
              type: Type.STRING,
              description: 'One of the valid categories',
            },
            difficulty: {
              type: Type.STRING,
              description: 'Easy, Medium, or Hard',
            },
            xp_reward: {
              type: Type.INTEGER,
              description: 'XP awarded on completion (15 to 60)',
            },
            description: {
              type: Type.STRING,
              description: 'Encouraging 1-2 sentence description guiding the user outdoors.',
            },
          },
          required: ['challenge', 'category', 'difficulty', 'xp_reward', 'description'],
        },
      },
    });

    // 4.5s race timeout to protect against slow serverless cold starts
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI craving generation timeout')), 4500)
    );

    const response = await Promise.race([geminiCall, timeoutPromise]);
    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(text);

    // Validate and sanitize backend fields
    const category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'Plant Patterns';
    const difficulty: ChallengeDifficulty = ['Easy', 'Medium', 'Hard'].includes(parsed.difficulty)
      ? parsed.difficulty
      : 'Medium';
    const xp_reward = Math.min(60, Math.max(15, Number(parsed.xp_reward) || 25));

    logDiagnostic({
      requestId,
      route: '/api/challenges/generate',
      method: 'POST',
      status: 200,
      durationMs: Date.now() - startTime,
      geminiModel: 'gemini-3.8-flash',
    });

    return {
      challenge: String(parsed.challenge).trim(),
      category,
      difficulty,
      xp_reward,
      description: String(parsed.description).trim(),
    };
  } catch (error: any) {
    console.warn(`[Gemini:${requestId}] Craving generation fallback triggered:`, error?.message || error);
    const pool = FALLBACK_CHALLENGES;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

/**
 * Multimodal image verification using Gemini 3.8 Flash
 * Strictly validates that real nature is present and satisfies the craving.
 * Never returns fake approvals on errors or missing credentials.
 */
export async function verifyImageSubmission(params: {
  imageBase64: string;
  mimeType: string;
  challengeTitle: string;
  challengeDescription: string;
  challengeCategory: string;
  petName: string;
  requestId?: string;
}): Promise<VerificationResult> {
  const {
    imageBase64,
    mimeType,
    challengeTitle,
    challengeDescription,
    challengeCategory,
    petName,
    requestId = 'req-verify',
  } = params;

  const startTime = Date.now();
  const ai = getGeminiClient();

  // Strip Data URL prefix if present and remove whitespace
  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const normalizedMime = validMimes.includes(mimeType?.toLowerCase()) ? mimeType.toLowerCase() : 'image/jpeg';
  const imageSizeKb = Math.round((cleanBase64.length * 0.75) / 1024);

  // If Gemini API Key is missing, do NOT return fake success!
  if (!ai) {
    logDiagnostic({
      requestId,
      route: '/api/challenges/verify',
      method: 'POST',
      status: 503,
      durationMs: Date.now() - startTime,
      geminiModel: 'gemini-3.8-flash',
      imageMimeType: normalizedMime,
      imageSizeKb,
      errorCode: 'GEMINI_KEY_MISSING',
      errorMessage: 'GEMINI_API_KEY environment variable is not configured.',
    });

    return {
      is_valid: false,
      confidence: 0.0,
      detected_object: 'AI Credentials Missing',
      reason: 'GEMINI_API_KEY is not configured in environment variables. Please set GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.',
      feedback: `Terra needs a Gemini API key configured to examine outdoor photographs!`,
      errorCode: 'GEMINI_KEY_MISSING',
    };
  }

  // Validate base64 payload integrity
  if (cleanBase64.length < 100) {
    return {
      is_valid: false,
      confidence: 0.0,
      detected_object: 'Invalid Image',
      reason: 'The image payload was corrupted or empty. Please capture a clear photograph.',
      feedback: `${petName} couldn't see the image clearly. Please try taking another photo!`,
      errorCode: 'INVALID_IMAGE_PAYLOAD',
    };
  }

  try {
    const prompt = `You are the rigorous multimodal judge for the nature exploration game Terra-Gotchi.
Active Craving: "${challengeTitle}"
Craving Description: "${challengeDescription}"
Category: "${challengeCategory}"
Pet Name: "${petName}"

Evaluate this photograph carefully against the craving:
1. Does the photo genuinely contain real-world nature/outdoors elements that satisfy the craving?
2. Is the requested object or pattern clearly discernible in the photo?
3. Strictly reject indoor artificial scenes: computer screens, television, indoor furniture, synthetic plastic plants, indoors walls, floors, empty blur.
4. If the photograph is too blurry, dark, ambiguous, or lacks the required feature, reject it or set confidence low.
5. Provide a confidence score between 0.00 and 1.00. (Only score >= 0.70 if the craving is genuinely satisfied).
6. Provide an in-character feedback message from ${petName}: enthusiastic gratitude if valid, or a polite encouraging hint if invalid.`;

    const geminiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: normalizedMime,
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "You are the AI multimodal judge for Terra-Gotchi. Evaluate photographs quickly and accurately, outputting strictly valid JSON matching the requested schema.",
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_valid: {
              type: Type.BOOLEAN,
              description: 'True if the photo clearly satisfies the challenge, false otherwise.',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score from 0.0 to 1.0',
            },
            detected_object: {
              type: Type.STRING,
              description: 'Concise description of the primary object/texture identified (e.g. "Veined maple leaf", "Rough pine bark", "Computer screen").',
            },
            reason: {
              type: Type.STRING,
              description: 'Clear factual explanation of why the photo was accepted or rejected.',
            },
            feedback: {
              type: Type.STRING,
              description: 'Friendly 1-sentence reaction from the pet to the user.',
            },
          },
          required: ['is_valid', 'confidence', 'detected_object', 'reason', 'feedback'],
        },
      },
    });

    // 8.5-second race timeout prevents Vercel serverless 10s hard cutoff
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini image analysis timed out after 8.5 seconds')), 8500)
    );

    const response = await Promise.race([geminiCall, timeoutPromise]);
    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini vision analysis');

    const parsed = JSON.parse(text);
    const confidence = Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.5));
    const isValid = Boolean(parsed.is_valid) && confidence >= 0.65;

    logDiagnostic({
      requestId,
      route: '/api/challenges/verify',
      method: 'POST',
      status: 200,
      durationMs: Date.now() - startTime,
      geminiModel: 'gemini-3.8-flash',
      imageMimeType: normalizedMime,
      imageSizeKb,
    });

    return {
      is_valid: isValid,
      confidence: Number(confidence.toFixed(2)),
      detected_object: String(parsed.detected_object || 'Outdoor specimen'),
      reason: String(parsed.reason || 'Image evaluated by Gemini vision.'),
      feedback: String(parsed.feedback || (isValid ? `Munch munch! ${petName} loves it!` : `Hmm, that doesn't quite match. Let's look outside again!`)),
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error?.message?.includes('timed out');
    const errorCode = isTimeout ? 'GEMINI_TIMEOUT' : 'GEMINI_ANALYSIS_FAILED';

    logDiagnostic({
      requestId,
      route: '/api/challenges/verify',
      method: 'POST',
      status: isTimeout ? 504 : 502,
      durationMs: duration,
      geminiModel: 'gemini-3.8-flash',
      imageMimeType: normalizedMime,
      imageSizeKb,
      errorCode,
      errorMessage: error?.message || 'Gemini error',
    });

    return {
      is_valid: false,
      confidence: 0.0,
      detected_object: isTimeout ? 'Analysis Timeout' : 'Analysis Error',
      reason: isTimeout
        ? 'The image analysis took longer than expected. Please check your network and try snapping another photo.'
        : `Gemini vision verification could not complete: ${error?.message || 'Check image format and API key.'}`,
      feedback: `${petName} couldn't see the photo clearly. Please try snapping another one!`,
      errorCode,
    };
  }
}
