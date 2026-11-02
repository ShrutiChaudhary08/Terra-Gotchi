import React from 'react';
import {
  Leaf,
  Camera,
  Sparkles,
  Award,
  ArrowRight,
  Sun,
  Eye,
  Zap,
} from 'lucide-react';
import { PetAvatar } from './PetAvatar.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreGuest: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onExploreGuest }) => {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 text-center">
        {/* Challenge Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-[#2c7a4b] text-xs font-bold mb-6 shadow-xs border border-emerald-200">
          <Leaf size={14} />
          <span>The Digital Pet That Only Eats Real Nature</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Put the screen down. <br />
          <span className="text-[#2c7a4b] bg-gradient-to-r from-[#2c7a4b] to-[#10b981] bg-clip-text text-transparent">
            Go touch grass.
          </span>{' '}
          Feed your pet.
        </h1>

        <p className="mt-6 text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Terra-Gotchi flips virtual pets on their head. Instead of endless screen time, Terra craves
          outdoor discoveries. Walk outside, photograph real botanical textures, and let Google Gemini’s
          multimodal vision AI verify your findings.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Start Exploring Free</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={onExploreGuest}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-emerald-50 text-gray-800 font-bold text-base border-2 border-emerald-200/80 shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={18} className="text-[#2c7a4b]" />
            <span>Try Guest Demo</span>
          </button>
        </div>

        {/* Visual Hero Mockup / Pet Preview */}
        <div className="mt-12 max-w-3xl mx-auto bg-gradient-to-b from-white to-emerald-50/50 p-6 sm:p-10 rounded-3xl shadow-xl border border-emerald-100 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Left: Pet Avatar */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/80 border border-emerald-100 shadow-xs">
              <PetAvatar stage="Sprout" mood="happy" size={130} />
              <div className="mt-2 font-bold text-gray-900 text-sm">Terra (Lv. 2 Sprout)</div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                Happiness: 95% • Hunger: 20%
              </div>
            </div>

            {/* Middle: Active Craving */}
            <div className="md:col-span-2 text-left p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Plant Patterns Craving
                </span>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  +35 XP
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                "Find a serrated green leaf with deep branching veins"
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Step outside to a local garden or park. Observe natural foliage textures and photograph
                the specimen.
              </p>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1 text-[#2c7a4b] font-semibold">
                  <Eye size={14} />
                  Evaluated by Gemini 3.8 Flash Multimodal Vision
                </span>
                <span className="text-emerald-700 font-bold">100% Free & Outdoor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Banner */}
      <section className="w-full bg-[#2c7a4b] text-white py-14 px-4 sm:px-6 my-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Sun size={36} className="mx-auto text-amber-300" />
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            "Technology should bring people closer to nature, not further away from it."
          </h2>
          <p className="text-emerald-100 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Terra-Gotchi transforms routine digital habits into an outdoor treasure hunt. Every meal your
            pet eats is real botanical life, geological textures, and biodiversity you explored with your
            own eyes.
          </p>
        </div>
      </section>

      {/* 4-Step How It Works Grid */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-extrabold text-[#2c7a4b] tracking-wider">
            Game Mechanics
          </span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">How Terra-Gotchi Works</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
            A harmonious cycle combining real outdoor observation with AI computer vision.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#2c7a4b] flex items-center justify-center font-bold text-lg mb-4">
              1
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1.5">Wake & Crave</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Terra wakes up hungry and generates a context-aware nature challenge via Gemini AI (e.g.
              rough tree bark, dewy grass, or patterned pebbles).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg mb-4">
              2
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1.5">Explore Outdoors</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Put the device in your pocket, walk into your backyard, local park, or trail, and seek out
              the real natural texture.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg mb-4">
              3
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1.5">Snap & Verify</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Capture a photo using the live camera or gallery. Gemini Multimodal Vision rigorously judges
              the photo for authenticity and botanical accuracy.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#2c7a4b] flex items-center justify-center font-bold text-lg mb-4">
              4
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1.5">Feed & Evolve</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Approved meals reward XP, boost happiness, lower hunger, evolve your pet into new stages,
              and record in your permanent Nature Journal.
            </p>
          </div>
        </div>
      </section>

      {/* Pet Evolution Stages Showcase */}
      <section className="w-full bg-emerald-50/70 py-16 px-4 sm:px-6 border-y border-emerald-100">
        <div className="max-w-6xl mx-auto text-center">
          <span className="text-xs uppercase font-extrabold text-[#2c7a4b] tracking-wider">
            Progression System
          </span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Watch Terra Evolve</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
            From a tiny seed to an ancient grove guardian, your pet grows as you spend more time
            immersed in the natural world.
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col items-center">
              <PetAvatar stage="Seedling" mood="happy" size={85} />
              <div className="mt-2 font-bold text-xs text-gray-900">Seedling</div>
              <span className="text-[10px] text-gray-500">Level 1 (0-100 XP)</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col items-center">
              <PetAvatar stage="Sprout" mood="happy" size={85} />
              <div className="mt-2 font-bold text-xs text-gray-900">Sprout</div>
              <span className="text-[10px] text-gray-500">Level 2 (100+ XP)</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col items-center">
              <PetAvatar stage="Explorer" mood="happy" size={85} />
              <div className="mt-2 font-bold text-xs text-gray-900">Explorer</div>
              <span className="text-[10px] text-gray-500">Level 3 (250+ XP)</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col items-center">
              <PetAvatar stage="Forest Friend" mood="happy" size={85} />
              <div className="mt-2 font-bold text-xs text-gray-900">Forest Friend</div>
              <span className="text-[10px] text-gray-500">Level 4 (450+ XP)</span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col items-center">
              <PetAvatar stage="Nature Guardian" mood="celebrating" size={85} />
              <div className="mt-2 font-bold text-xs text-gray-900">Nature Guardian</div>
              <span className="text-[10px] text-gray-500">Level 5 (700+ XP)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#2c7a4b] flex items-center justify-center font-bold">
              <Camera size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Multimodal Vision AI</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Google Gemini evaluates real optical traits: leaf venation, bark furrows, petal colors,
              moss cushions, and stone striations.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Nature Journal & Storage</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              A personal digital herbarium. Every approved photograph is securely archived with date,
              botanical category, confidence score, and XP.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-sm space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Gentle Streak Mechanics</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Positive reinforcement rather than punitive burnout. Maintain your outdoor exploration
              streak and unlock achievement badges.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-16 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-[#2c7a4b] to-[#15803d] text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black">Ready to feed your pet?</h2>
            <p className="text-emerald-100 text-sm max-w-md mx-auto">
              Step away from the screen, step into the fresh air, and find what Terra is craving.
            </p>
            <div className="pt-3">
              <button
                onClick={onGetStarted}
                className="px-8 py-3.5 rounded-2xl bg-white text-[#2c7a4b] font-black text-sm shadow-md hover:bg-emerald-50 transition active:scale-95 cursor-pointer"
              >
                Launch Terra-Gotchi Now 🌱
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
