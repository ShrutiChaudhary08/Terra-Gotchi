import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  RefreshCw,
  Edit2,
  Flame,
  Heart,
  Utensils,
  Battery,
  Leaf,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { usePet } from '../context/PetContext.tsx';
import { PetAvatar } from './PetAvatar.tsx';
import { SubmissionModal } from './SubmissionModal.tsx';

interface DashboardProps {
  onOpenJournal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenJournal }) => {
  const {
    pet,
    activeChallenge,
    journal,
    petMood,
    isActionLoading,
    generateNewChallenge,
    updatePetName,
    speakPetReaction,
  } = usePet();

  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState(pet?.name || 'Terra');

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameInput.trim()) return;
    const ok = await updatePetName(newNameInput.trim());
    if (ok) setIsEditingName(false);
  };

  const getMoodSpeech = () => {
    switch (petMood) {
      case 'happy':
        return "I feel amazing after munching on real outdoor nature!";
      case 'hungry':
        return activeChallenge ? `I'm craving: "${activeChallenge.title}". Can you find it outside?` : "I'm hungry! Ask me for a craving!";
      case 'thinking':
        return "Pondering the beauty of the outdoors...";
      case 'celebrating':
        return "YAAAAY! Look how strong and lush I'm growing!";
      case 'disappointed':
        return "Aw, that wasn't quite what I craved. Let's look outside again!";
      case 'sleeping':
      default:
        return "Zzz... dreaming of sunny meadows and dewy leaves...";
    }
  };

  // Calculate XP progress percentage
  const petLevel = pet?.level || 1;
  const petXP = pet?.xp || 0;
  const currentLevelMinXP = petLevel === 1 ? 0 : petLevel === 2 ? 100 : petLevel === 3 ? 250 : petLevel === 4 ? 450 : 700;
  const nextLevelXP = pet ? (pet.xp + pet.xp_to_next_level) : 100;
  const levelXPProgress = Math.min(100, Math.max(0, ((petXP - currentLevelMinXP) / (nextLevelXP - currentLevelMinXP)) * 100));

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Top Grid: Pet Companion Profile & Status Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Virtual Pet Character Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-100 flex flex-col items-center text-center relative overflow-hidden">
          {/* Top Stage Pill */}
          <div className="w-full flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-[#2c7a4b] font-bold text-xs border border-emerald-200/60">
              🌱 {pet.growth_stage}
            </span>

            {/* Streak Counter */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200/80">
              <Flame size={14} className="fill-amber-500 text-amber-500" />
              <span>{pet.current_streak} Day Streak</span>
            </div>
          </div>

          {/* Pet Avatar Graphic */}
          <div className="my-2 cursor-pointer" onClick={() => speakPetReaction(getMoodSpeech())}>
            <PetAvatar stage={pet.growth_stage} mood={petMood} size={150} />
          </div>

          {/* Pet Name with inline edit */}
          {isEditingName ? (
            <form onSubmit={handleRenameSubmit} className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                maxLength={24}
                autoFocus
                className="px-3 py-1 rounded-xl border border-[#2c7a4b] text-base font-bold text-gray-800 text-center outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-xl bg-[#2c7a4b] text-white text-xs font-bold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-2 py-1 text-xs text-gray-500"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 mt-2 group">
              <h2 className="text-2xl font-black text-gray-900">{pet.name}</h2>
              <button
                onClick={() => {
                  setNewNameInput(pet.name);
                  setIsEditingName(true);
                }}
                className="text-gray-300 hover:text-gray-600 transition p-1 rounded-md"
                title="Rename pet"
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}

          {/* Level & XP Progress Bar */}
          <div className="w-full mt-4 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
              <span>Level {pet.level}</span>
              <span className="text-[#2c7a4b]">{pet.xp} / {nextLevelXP} XP</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2c7a4b] to-[#4ade80] rounded-full transition-all duration-500"
                style={{ width: `${levelXPProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 block text-right mt-1 font-medium">
              {pet.xp_to_next_level} XP to next evolution
            </span>
          </div>

          {/* Pet Speech Bubble */}
          <div className="w-full mt-4 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-medium text-gray-700 italic relative">
            "{getMoodSpeech()}"
          </div>
        </div>

        {/* Right Column: Statistics & Current Craving (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Pet Vital Gauges */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100">
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-[#2c7a4b]" />
              <span>Pet Vitals & Well-being</span>
            </h3>

            <div className="grid grid-cols-3 gap-4">
              {/* Happiness */}
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 flex flex-col">
                <div className="flex items-center justify-between text-xs font-bold text-rose-800 mb-2">
                  <span className="flex items-center gap-1">
                    <Heart size={13} className="fill-rose-500 text-rose-500" />
                    Happiness
                  </span>
                  <span>{pet.happiness}%</span>
                </div>
                <div className="w-full h-2 bg-rose-200/70 rounded-full overflow-hidden mt-auto">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${pet.happiness}%` }}
                  />
                </div>
              </div>

              {/* Hunger (Lower is fuller) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex flex-col">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-2">
                  <span className="flex items-center gap-1">
                    <Utensils size={13} className="text-amber-600" />
                    Hunger
                  </span>
                  <span>{pet.hunger}%</span>
                </div>
                <div className="w-full h-2 bg-amber-200/70 rounded-full overflow-hidden mt-auto">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${pet.hunger}%` }}
                  />
                </div>
              </div>

              {/* Energy */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-2">
                  <span className="flex items-center gap-1">
                    <Battery size={13} className="text-[#2c7a4b]" />
                    Energy
                  </span>
                  <span>{pet.energy}%</span>
                </div>
                <div className="w-full h-2 bg-emerald-200/70 rounded-full overflow-hidden mt-auto">
                  <div
                    className="h-full bg-[#2c7a4b] rounded-full transition-all duration-500"
                    style={{ width: `${pet.energy}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current Craving Card */}
          <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/60 rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-200 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#2c7a4b] text-white font-extrabold text-[11px] tracking-wider uppercase">
                    Active Nature Craving
                  </span>
                  {activeChallenge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-gray-700 font-bold text-[11px] border border-emerald-200">
                      {activeChallenge.category}
                    </span>
                  )}
                </div>

                {activeChallenge && (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                    +{activeChallenge.xp_reward} XP
                  </span>
                )}
              </div>

              {activeChallenge ? (
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                    "{activeChallenge.title}"
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {activeChallenge.description}
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Difficulty:</span>
                    <span className="font-bold text-emerald-700">{activeChallenge.difficulty}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-gray-600 font-medium">
                    Terra is resting. Click below to generate a new AI nature craving!
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons: Fulfill Craving / New Craving */}
            <div className="mt-6 pt-5 border-t border-emerald-200/70 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsSubmissionOpen(true)}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-black text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Camera size={18} />
                <span>Snap & Munch This Craving 📸</span>
              </button>

              <button
                onClick={() => generateNewChallenge()}
                disabled={isActionLoading}
                className="py-3.5 px-4 rounded-2xl bg-white hover:bg-emerald-100/50 text-gray-700 font-bold text-xs border border-emerald-300/80 shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Ask Gemini for a different craving"
              >
                <RefreshCw size={14} className={isActionLoading ? 'animate-spin' : ''} />
                <span>New Craving</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Nature Discoveries Strip */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#2c7a4b]" />
            <h3 className="font-bold text-gray-900 text-sm">Recent Discoveries in Nature Journal</h3>
          </div>
          <button
            onClick={onOpenJournal}
            className="text-xs font-bold text-[#2c7a4b] hover:text-[#1e5c36] flex items-center gap-1"
          >
            <span>View All ({journal.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {journal.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/80 rounded-2xl border border-dashed border-gray-200">
            <Leaf size={28} className="mx-auto text-emerald-400 mb-2 opacity-60" />
            <p className="text-xs font-semibold text-gray-600">No outdoor feedings recorded yet.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Fulfill your first craving above to start your permanent nature collection!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {journal.slice(0, 4).map((entry) => (
              <div
                key={entry.id}
                onClick={onOpenJournal}
                className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col"
              >
                <div className="w-full aspect-[4/3] overflow-hidden bg-black/10">
                  <img
                    src={entry.image_url}
                    alt={entry.detected_object}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-[11px] font-bold text-gray-800 truncate">
                    {entry.detected_object || entry.title}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">
                    {new Date(entry.discovered_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submission Modal (Camera / Upload / Gemini Evaluation) */}
      <SubmissionModal
        isOpen={isSubmissionOpen}
        onClose={() => setIsSubmissionOpen(false)}
        onViewJournal={onOpenJournal}
      />
    </div>
  );
};
