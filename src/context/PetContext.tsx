import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from './AuthContext.tsx';
import type { Pet, Challenge, JournalEntry, Achievement, PetMood, FeedResponse } from '../types.ts';

interface PetContextType {
  pet: Pet;
  activeChallenge: Challenge | null;
  journal: JournalEntry[];
  achievements: Achievement[];
  petMood: PetMood;
  setPetMood: (mood: PetMood) => void;
  isLoading: boolean;
  isActionLoading: boolean;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  preferredCamera: 'environment' | 'user';
  notification: { title: string; message: string; type: 'success' | 'info' | 'reward' } | null;
  clearNotification: () => void;
  toggleSound: () => void;
  toggleTTS: () => void;
  setPreferredCamera: (cam: 'environment' | 'user') => void;
  refreshPet: () => Promise<void>;
  generateNewChallenge: (category?: string) => Promise<void>;
  feedPetWithPhoto: (imageBlob: Blob) => Promise<FeedResponse>;
  updatePetName: (newName: string) => Promise<boolean>;
  deleteJournalEntryById: (id: string) => Promise<boolean>;
  speakPetReaction: (text: string) => void;
}

const DEFAULT_PET: Pet = {
  id: 'pet-seedling',
  user_id: 'explorer',
  name: 'Terra',
  level: 1,
  xp: 0,
  xp_to_next_level: 100,
  happiness: 85,
  hunger: 30,
  energy: 90,
  current_streak: 1,
  best_streak: 1,
  last_fed_at: null,
  growth_stage: 'Seedling',
};

const DEFAULT_CHALLENGE: Challenge = {
  id: 'ch-init',
  user_id: 'explorer',
  title: 'Find a leaf with visible veins',
  description: 'Head outside and find a vibrant leaf with distinct branching vein patterns.',
  category: 'Plant Patterns',
  difficulty: 'Easy',
  xp_reward: 25,
  is_active: true,
  is_completed: false,
  created_at: new Date().toISOString(),
};

const PetContext = createContext<PetContextType | undefined>(undefined);

export const PetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAuthToken } = useAuth();

  // Instant hydration from cache - companion wakes up in 0ms!
  const [pet, setPet] = useState<Pet>(() => {
    try {
      const cached = localStorage.getItem('terra_pet_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_PET;
  });

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(() => {
    try {
      const cached = localStorage.getItem('terra_challenge_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_CHALLENGE;
  });

  const [journal, setJournal] = useState<JournalEntry[]>(() => {
    try {
      const cached = localStorage.getItem('terra_journal_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [petMood, setPetMood] = useState<PetMood>('hungry');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Preference settings (Sound disabled by default per specs)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('terra_sound_enabled') === 'true';
  });
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('terra_tts_enabled') === 'true';
  });
  const [preferredCamera, setPreferredCameraState] = useState<'environment' | 'user'>(() => {
    return (localStorage.getItem('terra_pref_camera') as any) || 'environment';
  });

  const [notification, setNotification] = useState<{ title: string; message: string; type: 'success' | 'info' | 'reward' } | null>(null);

  const clearNotification = () => setNotification(null);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('terra_sound_enabled', String(next));
  };

  const toggleTTS = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    localStorage.setItem('terra_tts_enabled', String(next));
    if (!next && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const setPreferredCamera = (cam: 'environment' | 'user') => {
    setPreferredCameraState(cam);
    localStorage.setItem('terra_pref_camera', cam);
  };

  // Web Speech API text-to-speech
  const speakPetReaction = useCallback((text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.15; // slightly higher, friendlier tone
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Speech] TTS failed:', err);
    }
  }, [ttsEnabled]);

  // Audio tone effects
  const playSoundEffect = (type: 'happy' | 'chew' | 'levelUp' | 'sad') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'happy' || type === 'chew') {
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'levelUp') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(660, audioCtx.currentTime + 0.12);
        osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'sad') {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(260, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch {
      // AudioContext not allowed without interaction
    }
  };

  const fetchPetData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/pet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pet) {
          setPet(data.pet);
          localStorage.setItem('terra_pet_cache', JSON.stringify(data.pet));
        }
        if (data.activeChallenge) {
          setActiveChallenge(data.activeChallenge);
          localStorage.setItem('terra_challenge_cache', JSON.stringify(data.activeChallenge));
        }
        // Default initial mood based on stats
        if (data.pet?.hunger > 60) setPetMood('hungry');
        else if (data.pet?.happiness > 70) setPetMood('happy');
      }
    } catch (err) {
      console.error('[PetContext] Error fetching pet:', err);
    }
  }, [getAuthToken]);

  const fetchJournal = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/journal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const entries = data.journal || [];
        setJournal(entries);
        localStorage.setItem('terra_journal_cache', JSON.stringify(entries));
      }
    } catch (err) {
      console.error('[PetContext] Error fetching journal:', err);
    }
  }, [getAuthToken]);

  const fetchAchievements = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/achievements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
      }
    } catch (err) {
      console.error('[PetContext] Error fetching achievements:', err);
    }
  }, [getAuthToken]);

  const refreshPet = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchPetData(), fetchJournal(), fetchAchievements()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPetData, fetchJournal, fetchAchievements]);

  useEffect(() => {
    if (user) {
      refreshPet();
    }
  }, [user, refreshPet]);

  // Generate new craving
  const generateNewChallenge = async (category?: string) => {
    setIsActionLoading(true);
    setPetMood('thinking');
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/challenges/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveChallenge(data.challenge);
        setPetMood('hungry');
        speakPetReaction(`I'm craving: ${data.challenge.title}!`);
      }
    } catch (err) {
      console.error('[PetContext] Error generating challenge:', err);
      setPetMood('hungry');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Feed pet with photo
  const feedPetWithPhoto = async (imageBlob: Blob): Promise<FeedResponse> => {
    setIsActionLoading(true);
    setPetMood('thinking');

    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('image', imageBlob, 'nature_photo.jpg');
      if (activeChallenge) {
        formData.append('challengeId', activeChallenge.id);
      }

      const res = await fetch('/api/pet/feed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data: FeedResponse = await res.json();

      if (data.success) {
        setPet(data.pet);
        if (data.nextChallenge) {
          setActiveChallenge(data.nextChallenge);
        }
        if (data.journalEntry) {
          setJournal((prev) => [data.journalEntry!, ...prev]);
        }

        // Celebration & sounds
        setPetMood(data.leveledUp ? 'celebrating' : 'happy');
        playSoundEffect(data.leveledUp ? 'levelUp' : 'chew');

        // Confetti burst
        confetti({
          particleCount: data.leveledUp ? 120 : 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2c7a4b', '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#84cc16'],
        });

        speakPetReaction(data.message);

        // Check if achievements unlocked
        if (data.newAchievements && data.newAchievements.length > 0) {
          fetchAchievements();
          setNotification({
            title: `🏆 Achievement Unlocked: ${data.newAchievements[0].title}!`,
            message: data.newAchievements[0].description,
            type: 'reward',
          });
        } else if (data.leveledUp) {
          setNotification({
            title: `⭐ Level Up! ${data.pet.name} is now Level ${data.pet.level}!`,
            message: `Evolution stage: ${data.pet.growth_stage}!`,
            type: 'reward',
          });
        }
      } else {
        setPetMood('disappointed');
        playSoundEffect('sad');
        speakPetReaction(data.message || "That didn't quite match. Let's try looking again!");
      }

      return data;
    } catch (err: any) {
      console.error('[PetContext] Error feeding pet:', err);
      setPetMood('hungry');
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  const updatePetName = async (newName: string): Promise<boolean> => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/pet', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        const data = await res.json();
        setPet(data.pet);
        setNotification({
          title: 'Pet Renamed',
          message: `Your companion is now called ${data.pet.name}!`,
          type: 'success',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Rename error:', err);
      return false;
    }
  };

  const deleteJournalEntryById = async (id: string): Promise<boolean> => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJournal((prev) => prev.filter((item) => item.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Delete error:', err);
      return false;
    }
  };

  return (
    <PetContext.Provider
      value={{
        pet,
        activeChallenge,
        journal,
        achievements,
        petMood,
        setPetMood,
        isLoading,
        isActionLoading,
        soundEnabled,
        ttsEnabled,
        preferredCamera,
        notification,
        clearNotification,
        toggleSound,
        toggleTTS,
        setPreferredCamera,
        refreshPet,
        generateNewChallenge,
        feedPetWithPhoto,
        updatePetName,
        deleteJournalEntryById,
        speakPetReaction,
      }}
    >
      {children}
    </PetContext.Provider>
  );
};

export const usePet = () => {
  const context = useContext(PetContext);
  if (!context) {
    throw new Error('usePet must be used within a PetProvider');
  }
  return context;
};
