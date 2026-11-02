import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  Speech,
  Camera,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  User,
  LogOut,
  Edit2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { usePet } from '../context/PetContext.tsx';

export const SettingsView: React.FC = () => {
  const { user, isGuest, isSupabaseConfigured, setAuthModalOpen, signOut } = useAuth();
  const {
    pet,
    soundEnabled,
    toggleSound,
    ttsEnabled,
    toggleTTS,
    preferredCamera,
    setPreferredCamera,
    updatePetName,
  } = usePet();

  const [petNameInput, setPetNameInput] = useState(pet?.name || 'Terra');
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSavePetName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petNameInput.trim()) return;
    const ok = await updatePetName(petNameInput.trim());
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const copyMigrationPath = () => {
    navigator.clipboard.writeText('supabase/migrations/001_initial_schema.sql');
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#2c7a4b] text-xs font-bold mb-1 border border-emerald-200">
          <Settings size={13} />
          <span>Application Preferences</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Customize your exploration companion, audio preferences, and database configurations.
        </p>
      </div>

      {/* 1. Pet Settings */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-100">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>Companion Customization</span>
        </h2>

        <form onSubmit={handleSavePetName} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-md">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Pet Name
            </label>
            <input
              type="text"
              value={petNameInput}
              onChange={(e) => setPetNameInput(e.target.value)}
              maxLength={24}
              placeholder="e.g. Terra"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#2c7a4b] focus:ring-1 focus:ring-[#2c7a4b] text-sm font-semibold outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Edit2 size={13} />
            <span>Update Name</span>
          </button>
        </form>
        {saveSuccess && (
          <p className="text-xs text-emerald-700 font-semibold mt-2">
            ✓ Companion name successfully updated!
          </p>
        )}
      </div>

      {/* 2. Audio & Speech Settings */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-100">
        <h2 className="text-base font-bold text-gray-900 mb-4">Audio & Speech</h2>

        <div className="space-y-4">
          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-[#2c7a4b] mt-0.5">
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-800">Sound Effects</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Play tone reactions when Terra is fed, munches food, or levels up.
                </p>
              </div>
            </div>

            <button
              onClick={toggleSound}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? 'bg-[#2c7a4b]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  soundEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Web Speech API Voice Reading */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl transition ${ttsEnabled ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-500'} mt-0.5`}>
                <Speech size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-800">Pet Voice Speech (Text-to-Speech)</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Allows Terra to read nature cravings and discoveries aloud using your browser's speech synthesis. (Speaker output only; no microphone needed).
                </p>
              </div>
            </div>

            <button
              onClick={toggleTTS}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                ttsEnabled ? 'bg-[#2c7a4b]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  ttsEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Camera Preferences */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-100">
        <h2 className="text-base font-bold text-gray-900 mb-2">Camera Hardware</h2>
        <p className="text-xs text-gray-500 mb-4">
          Select which lens opens by default when snapping specimens.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => setPreferredCamera('environment')}
            className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex items-center justify-between ${
              preferredCamera === 'environment'
                ? 'bg-emerald-50 border-[#2c7a4b] text-[#2c7a4b]'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Camera size={16} />
              <span>Back / Environment Camera (Recommended)</span>
            </div>
            {preferredCamera === 'environment' && <CheckCircle2 size={16} />}
          </button>

          <button
            onClick={() => setPreferredCamera('user')}
            className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex items-center justify-between ${
              preferredCamera === 'user'
                ? 'bg-emerald-50 border-[#2c7a4b] text-[#2c7a4b]'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Camera size={16} />
              <span>Front / Selfie Camera</span>
            </div>
            {preferredCamera === 'user' && <CheckCircle2 size={16} />}
          </button>
        </div>
      </div>

      {/* 4. Supabase Database & Auth Architecture */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Database size={18} className="text-[#2c7a4b]" />
            <span>Supabase Cloud Integration</span>
          </h2>

          {isSupabaseConfigured ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <CheckCircle2 size={13} />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              <AlertCircle size={13} />
              Guest / Local Mode
            </span>
          )}
        </div>

        <p className="text-xs text-gray-600 leading-relaxed mb-4">
          Terra-Gotchi connects to Supabase PostgreSQL for persistent multi-user authentication,
          RLS-protected pet statistics, and cloud image storage.
        </p>

        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 text-xs">
          <div>
            <span className="font-semibold text-gray-700 block mb-1">
              Complete SQL Migration File:
            </span>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-200">
              <code className="text-emerald-800 font-mono text-[11px]">
                supabase/migrations/001_initial_schema.sql
              </code>
              <button
                onClick={copyMigrationPath}
                className="text-gray-500 hover:text-gray-800 p-1 rounded-md transition flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
              >
                {copiedMigration ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedMigration ? 'Copied' : 'Copy Path'}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            To connect your live Supabase project, execute the SQL migration in the Supabase SQL Editor and
            set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment.
          </p>
        </div>
      </div>

      {/* 5. Account & Session */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <User size={18} className="text-[#2c7a4b]" />
            <span>Account Session</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isGuest
              ? 'You are currently exploring as a Guest. Progress is safely saved locally.'
              : `Signed in as ${user?.email}`}
          </p>
        </div>

        <div>
          {isGuest ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="py-2.5 px-5 rounded-xl bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-bold text-xs shadow-sm transition active:scale-95"
            >
              Sign In / Sync Cloud Account
            </button>
          ) : (
            <button
              onClick={signOut}
              className="py-2.5 px-5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
