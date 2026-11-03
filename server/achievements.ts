export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  xp_bonus: number;
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'first_discovery',
    title: 'First Discovery',
    description: 'Complete your first nature challenge and feed Terra.',
    category: 'Milestone',
    icon: '🌱',
    xp_bonus: 50,
  },
  {
    id: 'green_explorer',
    title: 'Green Explorer',
    description: 'Successfully complete 5 nature challenges outdoors.',
    category: 'Exploration',
    icon: '🌿',
    xp_bonus: 100,
  },
  {
    id: 'pattern_hunter',
    title: 'Pattern Hunter',
    description: 'Discover 5 distinct natural patterns and textures.',
    category: 'Mastery',
    icon: '🔍',
    xp_bonus: 100,
  },
  {
    id: 'botanical_scholar',
    title: 'Botanical Scholar',
    description: 'Photograph 10 plant, flower or leaf specimens.',
    category: 'Flora',
    icon: '🌸',
    xp_bonus: 150,
  },
  {
    id: 'consistent_explorer',
    title: 'Consistent Explorer',
    description: 'Maintain an active 3-day exploration streak.',
    category: 'Streak',
    icon: '🔥',
    xp_bonus: 150,
  },
  {
    id: 'week_in_the_wild',
    title: 'Week in the Wild',
    description: 'Touch grass 7 days in a row with your pet.',
    category: 'Streak',
    icon: '⭐',
    xp_bonus: 300,
  },
  {
    id: 'nature_guardian',
    title: 'Nature Guardian',
    description: 'Evolve your Terra-Gotchi to Level 5.',
    category: 'Evolution',
    icon: '🌳',
    xp_bonus: 500,
  },
];
