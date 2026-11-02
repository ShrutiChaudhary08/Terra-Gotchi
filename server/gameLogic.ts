export type GrowthStage = 'Seedling' | 'Sprout' | 'Explorer' | 'Forest Friend' | 'Nature Guardian';

export interface PetStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  happiness: number; // 0-100
  hunger: number; // 0-100 (0 = full, 100 = starving)
  energy: number; // 0-100
  currentStreak: number;
  bestStreak: number;
  growthStage: GrowthStage;
}

export interface LevelProgression {
  level: number;
  growthStage: GrowthStage;
  currentLevelMinXP: number;
  nextLevelXP: number;
  xpToNextLevel: number;
}

// XP thresholds for levels 1 through 5+
export const LEVEL_THRESHOLDS = [
  { level: 1, minXP: 0, nextXP: 100, stage: 'Seedling' as GrowthStage },
  { level: 2, minXP: 100, nextXP: 250, stage: 'Sprout' as GrowthStage },
  { level: 3, minXP: 250, nextXP: 450, stage: 'Explorer' as GrowthStage },
  { level: 4, minXP: 450, nextXP: 700, stage: 'Forest Friend' as GrowthStage },
  { level: 5, minXP: 700, nextXP: 1000, stage: 'Nature Guardian' as GrowthStage },
];

/**
 * Calculates level, growth stage, and XP progress
 */
export function calculateProgression(totalXP: number): LevelProgression {
  const safeXP = Math.max(0, Math.floor(totalXP));

  if (safeXP < 100) {
    return {
      level: 1,
      growthStage: 'Seedling',
      currentLevelMinXP: 0,
      nextLevelXP: 100,
      xpToNextLevel: 100 - safeXP,
    };
  } else if (safeXP < 250) {
    return {
      level: 2,
      growthStage: 'Sprout',
      currentLevelMinXP: 100,
      nextLevelXP: 250,
      xpToNextLevel: 250 - safeXP,
    };
  } else if (safeXP < 450) {
    return {
      level: 3,
      growthStage: 'Explorer',
      currentLevelMinXP: 250,
      nextLevelXP: 450,
      xpToNextLevel: 450 - safeXP,
    };
  } else if (safeXP < 700) {
    return {
      level: 4,
      growthStage: 'Forest Friend',
      currentLevelMinXP: 450,
      nextLevelXP: 700,
      xpToNextLevel: 700 - safeXP,
    };
  } else {
    // Level 5 and above
    const extraLevels = Math.floor((safeXP - 700) / 350);
    const currentLevel = Math.min(10, 5 + extraLevels);
    const nextLevelXP = 700 + (extraLevels + 1) * 350;
    return {
      level: currentLevel,
      growthStage: 'Nature Guardian',
      currentLevelMinXP: 700 + extraLevels * 350,
      nextLevelXP,
      xpToNextLevel: Math.max(0, nextLevelXP - safeXP),
    };
  }
}

/**
 * Computes updated pet stats following a successful verified feed
 */
export function computeFeedingRewards(currentStats: PetStats, xpReward: number): {
  newStats: PetStats;
  leveledUp: boolean;
  oldLevel: number;
} {
  const safeReward = Math.min(100, Math.max(10, xpReward));
  const newXP = currentStats.xp + safeReward;
  const progression = calculateProgression(newXP);
  const leveledUp = progression.level > currentStats.level;

  const newStats: PetStats = {
    level: progression.level,
    xp: newXP,
    xpToNextLevel: progression.xpToNextLevel,
    happiness: Math.min(100, currentStats.happiness + 15),
    hunger: Math.max(0, currentStats.hunger - 25),
    energy: Math.min(100, currentStats.energy + 10),
    currentStreak: currentStats.currentStreak,
    bestStreak: currentStats.bestStreak,
    growthStage: progression.growthStage,
  };

  return {
    newStats,
    leveledUp,
    oldLevel: currentStats.level,
  };
}

/**
 * Updates streak based on last activity date and today's date (YYYY-MM-DD)
 */
export function computeStreakUpdate(
  lastDateISO: string | null | undefined,
  currentStreak: number,
  bestStreak: number
): { newCurrentStreak: number; newBestStreak: number; isNewDay: boolean } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (!lastDateISO) {
    return {
      newCurrentStreak: 1,
      newBestStreak: Math.max(1, bestStreak),
      isNewDay: true,
    };
  }

  const lastDate = new Date(lastDateISO);
  const lastDateStr = lastDate.toISOString().split('T')[0];

  if (lastDateStr === todayStr) {
    // Already touched grass today
    return {
      newCurrentStreak: Math.max(1, currentStreak),
      newBestStreak: Math.max(currentStreak, bestStreak),
      isNewDay: false,
    };
  }

  // Calculate day difference
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffTime = Math.abs(now.setHours(0,0,0,0) - lastDate.setHours(0,0,0,0));
  const diffDays = Math.round(diffTime / oneDayMs);

  if (diffDays === 1) {
    const updated = currentStreak + 1;
    return {
      newCurrentStreak: updated,
      newBestStreak: Math.max(updated, bestStreak),
      isNewDay: true,
    };
  } else {
    // Missed a day or more, resets to 1 (gentle, not punishing)
    return {
      newCurrentStreak: 1,
      newBestStreak: bestStreak,
      isNewDay: true,
    };
  }
}

/**
 * Checks for unlocked achievements based on stats and journal history
 */
export function evaluateAchievements(params: {
  totalFeedings: number;
  currentStreak: number;
  level: number;
  categoriesDiscovered: string[];
  alreadyUnlockedIds: string[];
}): string[] {
  const { totalFeedings, currentStreak, level, categoriesDiscovered, alreadyUnlockedIds } = params;
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !alreadyUnlockedIds.includes(id)) {
      newlyUnlocked.push(id);
    }
  };

  check('first_discovery', totalFeedings >= 1);
  check('green_explorer', totalFeedings >= 5);
  check('botanical_scholar', totalFeedings >= 10);
  check('pattern_hunter', categoriesDiscovered.filter(c => c.toLowerCase().includes('pattern') || c.toLowerCase().includes('texture')).length >= 5 || categoriesDiscovered.length >= 4);
  check('consistent_explorer', currentStreak >= 3);
  check('week_in_the_wild', currentStreak >= 7);
  check('nature_guardian', level >= 5);

  return newlyUnlocked;
}
