import React from 'react';
import type { GrowthStage, PetMood } from '../types.ts';

interface PetAvatarProps {
  stage: GrowthStage;
  mood: PetMood;
  className?: string;
  size?: number;
}

export const PetAvatar: React.FC<PetAvatarProps> = ({
  stage,
  mood,
  className = '',
  size = 140,
}) => {
  // Color palette based on stage
  const getStageColors = () => {
    switch (stage) {
      case 'Sprout':
        return {
          body: '#34d399', // Emerald/mint
          belly: '#a7f3d0',
          leaf: '#10b981',
          shadow: '#059669',
          accent: '#065f46',
        };
      case 'Explorer':
        return {
          body: '#22c55e', // Leaf green
          belly: '#bbf7d0',
          leaf: '#15803d',
          shadow: '#16a34a',
          accent: '#14532d',
        };
      case 'Forest Friend':
        return {
          body: '#16a34a', // Deep forest
          belly: '#86efac',
          leaf: '#eab308', // golden bloom touch
          shadow: '#15803d',
          accent: '#b45309',
        };
      case 'Nature Guardian':
        return {
          body: '#0d9488', // Teal guardian
          belly: '#99f6e4',
          leaf: '#f59e0b', // radiant amber
          shadow: '#0f766e',
          accent: '#d97706',
        };
      case 'Seedling':
      default:
        return {
          body: '#4ade80', // Soft fresh green
          belly: '#dcfce7',
          leaf: '#22c55e',
          shadow: '#16a34a',
          accent: '#166534',
        };
    }
  };

  const colors = getStageColors();

  // Mood expressions (eyes and mouth)
  const renderFace = () => {
    switch (mood) {
      case 'sleeping':
        return (
          <g>
            {/* Closed sleeping eyes */}
            <path d="M 38 52 Q 44 56 50 52" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 62 52 Q 68 56 74 52" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Sleeping blush */}
            <circle cx="36" cy="58" r="4" fill="#fb7185" opacity="0.4" />
            <circle cx="76" cy="58" r="4" fill="#fb7185" opacity="0.4" />
            {/* Gentle smile */}
            <path d="M 53 62 Q 56 64 59 62" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Zzz bubbles */}
            <text x="82" y="38" fontSize="12" fill="#2c7a4b" fontWeight="bold" opacity="0.8">z</text>
            <text x="90" y="28" fontSize="15" fill="#2c7a4b" fontWeight="bold" opacity="0.9">Z</text>
          </g>
        );

      case 'thinking':
        return (
          <g>
            {/* Curious wide eyes looking up */}
            <circle cx="44" cy="49" r="5" fill="#1f2937" />
            <circle cx="42" cy="47" r="1.5" fill="#ffffff" />
            <circle cx="68" cy="49" r="5" fill="#1f2937" />
            <circle cx="66" cy="47" r="1.5" fill="#ffffff" />
            {/* Raised eyebrow */}
            <path d="M 40 42 Q 45 39 50 42" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Small 'o' mouth */}
            <circle cx="56" cy="62" r="3" fill="#1f2937" />
          </g>
        );

      case 'hungry':
        return (
          <g>
            {/* Big hopeful eyes */}
            <circle cx="44" cy="50" r="6" fill="#1f2937" />
            <circle cx="43" cy="48" r="2" fill="#ffffff" />
            <circle cx="68" cy="50" r="6" fill="#1f2937" />
            <circle cx="67" cy="48" r="2" fill="#ffffff" />
            {/* Rosy cheeks */}
            <circle cx="35" cy="56" r="4" fill="#f43f5e" opacity="0.4" />
            <circle cx="77" cy="56" r="4" fill="#f43f5e" opacity="0.4" />
            {/* Open craving mouth with tongue */}
            <path d="M 51 60 Q 56 67 61 60 Z" fill="#991b1b" stroke="#1f2937" strokeWidth="1.5" />
            <path d="M 53 62 Q 56 66 59 62" fill="#f43f5e" />
          </g>
        );

      case 'celebrating':
      case 'happy':
        return (
          <g>
            {/* Happy arch eyes (^^) */}
            <path d="M 38 52 Q 44 44 50 52" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 62 52 Q 68 44 74 52" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Bright blush */}
            <circle cx="34" cy="55" r="5" fill="#f43f5e" opacity="0.5" />
            <circle cx="78" cy="55" r="5" fill="#f43f5e" opacity="0.5" />
            {/* Wide happy smile */}
            <path d="M 48 58 Q 56 70 64 58 Z" fill="#b91c1c" stroke="#1f2937" strokeWidth="1.5" />
            <path d="M 51 62 Q 56 68 61 62" fill="#fb7185" />
            {/* Sparkles around head */}
            <polygon points="26,30 28,34 32,36 28,38 26,42 24,38 20,36 24,34" fill="#f59e0b" />
            <polygon points="86,30 88,34 92,36 88,38 86,42 84,38 80,36 84,34" fill="#f59e0b" />
          </g>
        );

      case 'disappointed':
        return (
          <g>
            {/* Drooping gentle sad eyes */}
            <path d="M 40 48 Q 45 52 50 49" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 62 49 Q 67 52 72 48" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="45" cy="51" r="3.5" fill="#1f2937" />
            <circle cx="67" cy="51" r="3.5" fill="#1f2937" />
            {/* Drooping gentle mouth */}
            <path d="M 51 64 Q 56 60 61 64" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Little tear drop */}
            <circle cx="75" cy="58" r="2.5" fill="#38bdf8" opacity="0.7" />
          </g>
        );
    }
  };

  // Evolution headwear / botanical foliage based on growth stage
  const renderFoliage = () => {
    switch (stage) {
      case 'Sprout':
        return (
          <g>
            {/* Two vibrant leaves on head */}
            <path d="M 56 28 C 50 16 38 18 42 26 C 46 32 54 30 56 28 Z" fill={colors.leaf} />
            <path d="M 56 28 C 62 14 76 16 72 26 C 68 32 58 30 56 28 Z" fill={colors.leaf} />
            <line x1="56" y1="28" x2="56" y2="34" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );

      case 'Explorer':
        return (
          <g>
            {/* Clover / trio foliage + explorer twig */}
            <path d="M 56 26 C 46 14 36 20 44 26 C 50 30 54 28 56 26 Z" fill={colors.leaf} />
            <path d="M 56 26 C 66 14 76 20 68 26 C 62 30 58 28 56 26 Z" fill={colors.leaf} />
            <path d="M 56 24 C 52 10 60 10 56 24 Z" fill={colors.accent} />
            <circle cx="56" cy="18" r="4" fill="#fbbf24" />
          </g>
        );

      case 'Forest Friend':
        return (
          <g>
            {/* Lush crown + glowing mushroom cap or flower */}
            <path d="M 56 26 C 40 10 30 18 42 26" fill={colors.leaf} />
            <path d="M 56 26 C 72 10 82 18 70 26" fill={colors.leaf} />
            <path d="M 44 24 Q 56 12 68 24 Z" fill="#ef4444" />
            <circle cx="51" cy="20" r="1.5" fill="#ffffff" />
            <circle cx="61" cy="20" r="1.5" fill="#ffffff" />
            <circle cx="56" cy="16" r="1.5" fill="#ffffff" />
          </g>
        );

      case 'Nature Guardian':
        return (
          <g>
            {/* Majestic leafy antler branches & glowing aura */}
            <path d="M 56 24 L 38 10 M 38 10 L 32 12 M 38 10 L 40 4" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <path d="M 56 24 L 74 10 M 74 10 L 80 12 M 74 10 L 72 4" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
            <circle cx="36" cy="7" r="3" fill="#fbbf24" />
            <circle cx="76" cy="7" r="3" fill="#fbbf24" />
            <circle cx="56" cy="18" r="5" fill="#f59e0b" />
          </g>
        );

      case 'Seedling':
      default:
        return (
          <g>
            {/* Single delicate green sprout */}
            <path d="M 56 28 C 50 16 38 18 42 26 C 46 32 54 30 56 28 Z" fill={colors.leaf} />
            <line x1="56" y1="28" x2="56" y2="34" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );
    }
  };

  const getAnimationClass = () => {
    switch (mood) {
      case 'happy':
      case 'celebrating':
        return 'animate-bounce';
      case 'thinking':
        return 'animate-pulse';
      case 'sleeping':
        return 'opacity-90';
      default:
        return 'hover:scale-105 transition-transform duration-300';
    }
  };

  return (
    <div className={`relative inline-block select-none ${className} ${getAnimationClass()}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 112 112"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        {/* Soft ground shadow */}
        <ellipse cx="56" cy="98" rx="34" ry="7" fill="#000000" opacity="0.08" />

        {/* Head Foliage / Sprout */}
        {renderFoliage()}

        {/* Cute chubby body */}
        <ellipse cx="56" cy="62" rx="36" ry="32" fill={colors.body} />
        {/* Soft belly patch */}
        <ellipse cx="56" cy="68" rx="24" ry="20" fill={colors.belly} />

        {/* Little stubby feet */}
        <ellipse cx="40" cy="91" rx="8" ry="5" fill={colors.shadow} />
        <ellipse cx="72" cy="91" rx="8" ry="5" fill={colors.shadow} />

        {/* Little stubby hands/arms */}
        {mood === 'celebrating' ? (
          <>
            <path d="M 22 55 Q 16 45 22 40" stroke={colors.body} strokeWidth="7" strokeLinecap="round" />
            <path d="M 90 55 Q 96 45 90 40" stroke={colors.body} strokeWidth="7" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="23" cy="64" rx="5" ry="7" fill={colors.shadow} transform="rotate(-15 23 64)" />
            <ellipse cx="89" cy="64" rx="5" ry="7" fill={colors.shadow} transform="rotate(15 89 64)" />
          </>
        )}

        {/* Facial features according to mood */}
        {renderFace()}
      </svg>
    </div>
  );
};
