import React from 'react';
import {
  Leaf,
  BookOpen,
  Trophy,
  Settings,
  Volume2,
  VolumeX,
  Speech,
  User,
  LogOut,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { usePet } from '../context/PetContext.tsx';

interface NavbarProps {
  currentTab: 'dashboard' | 'journal' | 'achievements' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'journal' | 'achievements' | 'settings') => void;
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onGoHome }) => {
  const { user, isGuest, setAuthModalOpen, signOut } = useAuth();
  const { pet, soundEnabled, toggleSound, ttsEnabled, toggleTTS } = usePet();

  return (
    <nav className="w-full bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-emerald-100 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={onGoHome || (() => setCurrentTab('dashboard'))}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#2c7a4b] to-[#4ade80] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Leaf size={20} className="drop-shadow-xs" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-[#2c7a4b] block leading-none">
              Terra-Gotchi
            </span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-0.5">
              Nature AI Companion
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-emerald-50/60 p-1 rounded-full border border-emerald-100/80">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              currentTab === 'dashboard'
                ? 'bg-[#2c7a4b] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#2c7a4b] hover:bg-white/80'
            }`}
          >
            <span>Companion</span>
          </button>

          <button
            onClick={() => setCurrentTab('journal')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              currentTab === 'journal'
                ? 'bg-[#2c7a4b] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#2c7a4b] hover:bg-white/80'
            }`}
          >
            <BookOpen size={13} />
            <span>Nature Journal</span>
          </button>

          <button
            onClick={() => setCurrentTab('achievements')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              currentTab === 'achievements'
                ? 'bg-[#2c7a4b] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#2c7a4b] hover:bg-white/80'
            }`}
          >
            <Trophy size={13} />
            <span>Achievements</span>
          </button>

          <button
            onClick={() => setCurrentTab('settings')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ${
              currentTab === 'settings'
                ? 'bg-[#2c7a4b] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#2c7a4b] hover:bg-white/80'
            }`}
          >
            <Settings size={13} />
            <span>Settings</span>
          </button>
        </div>

        {/* Right side status & action badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pet Growth & Streak Badge */}
          {pet && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs text-[#2c7a4b] font-bold">
              <span>🌱 {pet.growth_stage} • Lv. {pet.level}</span>
              {pet.current_streak > 0 && (
                <span className="flex items-center gap-0.5 text-amber-600 bg-amber-100/70 px-1.5 py-0.5 rounded-md font-extrabold text-[11px]">
                  <Flame size={12} className="fill-amber-500" />
                  {pet.current_streak}d
                </span>
              )}
            </div>
          )}

          {/* Sound Controls */}
          <div className="flex items-center bg-gray-100/80 rounded-full p-0.5 border border-gray-200">
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              className={`p-1.5 rounded-full transition ${
                soundEnabled ? 'text-[#2c7a4b] bg-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={toggleTTS}
              title={ttsEnabled ? 'Mute pet speech voice (Text-to-Speech)' : 'Enable pet speech voice (Web Speech reads cravings aloud)'}
              aria-label={ttsEnabled ? 'Mute pet speech voice' : 'Enable pet voice reading'}
              className={`p-1.5 rounded-full transition ${
                ttsEnabled ? 'text-[#2c7a4b] bg-white shadow-xs' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Speech size={16} className={ttsEnabled ? '' : 'opacity-40'} />
            </button>
          </div>

          {/* User Auth Profile */}
          {user && !isGuest ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentTab('settings')}
                className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 text-[#2c7a4b] flex items-center justify-center font-bold text-xs"
                title={user.email}
              >
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </button>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="py-1.5 px-3.5 rounded-full bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <User size={13} />
              <span>{isGuest ? 'Sign In / Sync' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around py-2 px-3 border-t border-emerald-50 bg-emerald-50/40 text-xs">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`py-1 px-3 rounded-full font-bold transition ${
            currentTab === 'dashboard' ? 'bg-[#2c7a4b] text-white' : 'text-gray-600'
          }`}
        >
          Companion
        </button>
        <button
          onClick={() => setCurrentTab('journal')}
          className={`py-1 px-3 rounded-full font-bold transition flex items-center gap-1 ${
            currentTab === 'journal' ? 'bg-[#2c7a4b] text-white' : 'text-gray-600'
          }`}
        >
          <BookOpen size={12} />
          Journal
        </button>
        <button
          onClick={() => setCurrentTab('achievements')}
          className={`py-1 px-3 rounded-full font-bold transition flex items-center gap-1 ${
            currentTab === 'achievements' ? 'bg-[#2c7a4b] text-white' : 'text-gray-600'
          }`}
        >
          <Trophy size={12} />
          Awards
        </button>
        <button
          onClick={() => setCurrentTab('settings')}
          className={`py-1 px-3 rounded-full font-bold transition flex items-center gap-1 ${
            currentTab === 'settings' ? 'bg-[#2c7a4b] text-white' : 'text-gray-600'
          }`}
        >
          <Settings size={12} />
          Settings
        </button>
      </div>
    </nav>
  );
};
