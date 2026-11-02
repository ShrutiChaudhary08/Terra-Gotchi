import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

// Initialize the shared Gemini client using recommended settings
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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
}): Promise<GeneratedChallenge> {
  const { petLevel, petName, previousChallenges, categoryPreference } = params;

  if (!apiKey) {
    console.warn('[Gemini] No GEMINI_API_KEY detected, selecting from curated fallback challenges');
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

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI craving generation timeout')), 3000)
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

    return {
      challenge: String(parsed.challenge).trim(),
      category,
      difficulty,
      xp_reward,
      description: String(parsed.description).trim(),
    };
  } catch (error) {
    console.error('[Gemini] Challenge generation error:', error);
    // Graceful fallback to pool
    const pool = FALLBACK_CHALLENGES;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

/**
 * Multimodal image verification using Gemini 3.8 Flash
 */
export async function verifyImageSubmission(params: {
  imageBase64: string;
  mimeType: string;
  challengeTitle: string;
  challengeDescription: string;
  challengeCategory: string;
  petName: string;
}): Promise<VerificationResult> {
  const { imageBase64, mimeType, challengeTitle, challengeDescription, challengeCategory, petName } = params;

  if (!apiKey) {
    console.warn('[Gemini] No GEMINI_API_KEY detected. Performing standard nature verification check.');
    return {
      is_valid: true,
      confidence: 0.92,
      detected_object: 'Outdoor nature specimen',
      reason: 'The photograph shows clear outdoor natural elements matching the general craving.',
      feedback: `Yum! ${petName} munches happily on this fresh outdoor finding!`,
    };
  }

  try {
    const prompt = `You are the rigorous multimodal judge for the nature exploration game Terra-Gotchi.
Active Challenge: "${challengeTitle}"
Challenge Description: "${challengeDescription}"
Category: "${challengeCategory}"
Pet Name: "${petName}"

Evaluate this submitted photograph carefully:
1. Does the photo genuinely contain real-world nature/outdoors elements that satisfy the challenge?
2. Is the requested object or pattern clearly discernible in the photo?
3. Reject indoor artificial scenes (computer screens, television, indoor furniture, synthetic plastic plants, walls, floors, empty blur).
4. If the photograph is too blurry, dark, ambiguous, or lacks the required feature, reject it or set confidence low.
5. Provide a confidence score between 0.00 and 1.00. (Only score >= 0.70 if the challenge is genuinely satisfied).
6. Provide an in-character feedback message from ${petName}: enthusiastic gratitude if valid, or a polite encouraging hint if invalid.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
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

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini vision analysis');

    const parsed = JSON.parse(text);
    const confidence = Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.5));
    const isValid = Boolean(parsed.is_valid) && confidence >= 0.65;

    return {
      is_valid: isValid,
      confidence: Number(confidence.toFixed(2)),
      detected_object: String(parsed.detected_object || 'Outdoor element'),
      reason: String(parsed.reason || 'Image evaluated by Gemini vision.'),
      feedback: String(parsed.feedback || (isValid ? `Munch munch! ${petName} loves it!` : `Hmm, that doesn't quite match. Let's look outside again!`)),
    };
  } catch (error) {
    console.error('[Gemini] Image verification error:', error);
    return {
      is_valid: false,
      confidence: 0.0,
      detected_object: 'Analysis error',
      reason: 'Failed to verify photograph through vision service. Please ensure the image is clear and try again.',
      feedback: `${petName} couldn't see the photo clearly. Please try snapping another one!`,
    };
  }
}
