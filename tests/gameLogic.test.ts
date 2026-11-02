import { describe, it, expect } from 'vitest';
import {
  calculateProgression,
  computeFeedingRewards,
  computeStreakUpdate,
  evaluateAchievements,
} from '../server/gameLogic.ts';

describe('Terra-Gotchi Game Mechanics & Progression', () => {
  it('correctly calculates progression for Level 1 (Seedling)', () => {
    const prog = calculateProgression(45);
    expect(prog.level).toBe(1);
    expect(prog.growthStage).toBe('Seedling');
    expect(prog.xpToNextLevel).toBe(55);
  });

  it('correctly evolves to Level 2 (Sprout) at 100 XP', () => {
    const prog = calculateProgression(120);
    expect(prog.level).toBe(2);
    expect(prog.growthStage).toBe('Sprout');
    expect(prog.xpToNextLevel).toBe(130);
  });

  it('correctly evolves to Level 3 (Explorer) at 250 XP', () => {
    const prog = calculateProgression(300);
    expect(prog.level).toBe(3);
    expect(prog.growthStage).toBe('Explorer');
  });

  it('correctly evolves to Level 5 (Nature Guardian) at 700+ XP', () => {
    const prog = calculateProgression(750);
    expect(prog.level).toBe(5);
    expect(prog.growthStage).toBe('Nature Guardian');
  });

  it('awards feeding rewards and decreases hunger while increasing happiness', () => {
    const currentStats = {
      level: 1,
      xp: 20,
      xpToNextLevel: 80,
      happiness: 70,
      hunger: 50,
      energy: 80,
      currentStreak: 1,
      bestStreak: 1,
      growthStage: 'Seedling' as const,
    };

    const { newStats, leveledUp } = computeFeedingRewards(currentStats, 30);
    expect(newStats.xp).toBe(50);
    expect(newStats.happiness).toBe(85); // 70 + 15
    expect(newStats.hunger).toBe(25); // 50 - 25
    expect(newStats.energy).toBe(90); // 80 + 10
    expect(leveledUp).toBe(false);
  });

  it('detects level up when XP crosses threshold', () => {
    const currentStats = {
      level: 1,
      xp: 85,
      xpToNextLevel: 15,
      happiness: 80,
      hunger: 40,
      energy: 80,
      currentStreak: 1,
      bestStreak: 1,
      growthStage: 'Seedling' as const,
    };

    const { newStats, leveledUp } = computeFeedingRewards(currentStats, 25);
    expect(newStats.xp).toBe(110);
    expect(newStats.level).toBe(2);
    expect(newStats.growthStage).toBe('Sprout');
    expect(leveledUp).toBe(true);
  });

  it('correctly increments streak on consecutive day activity', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const update = computeStreakUpdate(yesterday.toISOString(), 2, 2);
    expect(update.newCurrentStreak).toBe(3);
    expect(update.newBestStreak).toBe(3);
    expect(update.isNewDay).toBe(true);
  });

  it('keeps streak identical if feeding twice on the same day', () => {
    const today = new Date().toISOString();
    const update = computeStreakUpdate(today, 3, 5);
    expect(update.newCurrentStreak).toBe(3);
    expect(update.newBestStreak).toBe(5);
    expect(update.isNewDay).toBe(false);
  });

  it('unlocks First Discovery on first feeding', () => {
    const unlocked = evaluateAchievements({
      totalFeedings: 1,
      currentStreak: 1,
      level: 1,
      categoriesDiscovered: ['Plant Patterns'],
      alreadyUnlockedIds: [],
    });

    expect(unlocked).toContain('first_discovery');
    expect(unlocked).not.toContain('green_explorer');
  });

  it('unlocks Nature Guardian when reaching level 5', () => {
    const unlocked = evaluateAchievements({
      totalFeedings: 12,
      currentStreak: 4,
      level: 5,
      categoriesDiscovered: ['Plant Patterns', 'Botanical Textures', 'Flora & Petals', 'Forest Floor'],
      alreadyUnlockedIds: ['first_discovery', 'green_explorer'],
    });

    expect(unlocked).toContain('nature_guardian');
    expect(unlocked).toContain('consistent_explorer');
  });
});
