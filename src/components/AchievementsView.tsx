import React, { useState } from 'react';
import { Trophy, CheckCircle, Lock, Star } from 'lucide-react';
import { usePet } from '../context/PetContext.tsx';

export const AchievementsView: React.FC = () => {
  const { achievements } = usePet();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length || 7;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.isUnlocked;
    if (filter === 'locked') return !a.isUnlocked;
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2c7a4b] text-white text-xs font-bold mb-2">
            <Trophy size={13} />
            <span>Exploration Milestones</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Achievements</h1>
          <p className="text-xs text-gray-600 mt-1 max-w-md">
            Unlock honours by regularly exploring the outdoors, seeking rare textures, and caring for Terra.
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs min-w-[220px] w-full md:w-auto">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
            <span>Overall Completion</span>
            <span className="text-[#2c7a4b] font-black">{unlockedCount} / {totalCount}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2c7a4b] to-[#4ade80] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 font-semibold block mt-1.5 text-right">
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-[#2c7a4b] text-white shadow-xs'
              : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('unlocked')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
            filter === 'unlocked'
              ? 'bg-[#2c7a4b] text-white shadow-xs'
              : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          Unlocked ({unlockedCount})
        </button>
        <button
          onClick={() => setFilter('locked')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
            filter === 'locked'
              ? 'bg-[#2c7a4b] text-white shadow-xs'
              : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          Locked ({totalCount - unlockedCount})
        </button>
      </div>

      {/* Achievements Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-3xl border transition-all duration-300 flex items-start gap-4 ${
              item.isUnlocked
                ? 'bg-white border-emerald-200 shadow-sm hover:shadow-md'
                : 'bg-gray-50/70 border-gray-200/80 opacity-70'
            }`}
          >
            {/* Icon Avatar */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-xs border ${
                item.isUnlocked
                  ? 'bg-gradient-to-tr from-emerald-100 to-teal-50 border-emerald-200'
                  : 'bg-gray-100 border-gray-200 text-gray-400 grayscale'
              }`}
            >
              {item.icon}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  {item.category}
                </span>
                {item.isUnlocked ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle size={10} />
                    Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
                    <Lock size={10} />
                    Locked
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-sm text-gray-900 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {item.description}
              </p>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <Star size={11} className="fill-amber-400 text-amber-500" />
                  +{item.xp_bonus} XP Reward
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
