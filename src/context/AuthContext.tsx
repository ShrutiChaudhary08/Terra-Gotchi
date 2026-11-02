import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | { id: string; email: string; user_metadata?: any } | null;
  session: Session | null;
  isGuest: boolean;
  isSupabaseConfigured: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  getAuthToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'terragotchi_guest_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (mounted && data.session) {
            setSession(data.session);
            setUser(data.session.user);
            setIsGuest(false);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('[Auth] Error getting session:', err);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
          if (!mounted) return;
          setSession(currentSession);
          setUser(currentSession?.user || null);
          if (currentSession) {
            setIsGuest(false);
            localStorage.removeItem(GUEST_STORAGE_KEY);
          }
        });

        // If no supabase session, check guest preference or default to guest
        const guestPref = localStorage.getItem(GUEST_STORAGE_KEY);
        if (mounted) {
          if (guestPref === 'true' || !user) {
            enableGuestMode();
          }
          setIsLoading(false);
        }

        return () => {
          mounted = false;
          authListener.subscription.unsubscribe();
        };
      } else {
        // Supabase not configured yet - automatically start in guest explorer mode
        enableGuestMode();
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const enableGuestMode = () => {
    setIsGuest(true);
    setUser({
      id: 'guest-explorer',
      email: 'explorer@terragotchi.local',
      user_metadata: { full_name: 'Guest Explorer' },
    });
    localStorage.setItem(GUEST_STORAGE_KEY, 'true');
  };

  const getAuthToken = async (): Promise<string> => {
    if (isGuest || !isSupabaseConfigured || !supabase) {
      return 'guest-token';
    }
    const currentSession = session || (await supabase.auth.getSession()).data.session;
    return currentSession?.access_token || 'guest-token';
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured yet. You can play as a Guest Explorer!' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      setSession(data.session);
      setUser(data.user);
      setIsGuest(false);
      setAuthModalOpen(false);
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to sign in' };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured yet. You can play as a Guest Explorer!' };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName || 'Nature Explorer' },
        },
      });
      if (error) return { error: error.message };
      setSession(data.session);
      setUser(data.user);
      setIsGuest(false);
      setAuthModalOpen(false);
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to sign up' };
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured yet. Please configure credentials in Settings.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Google sign in failed' };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setSession(null);
    enableGuestMode();
  };

  const continueAsGuest = () => {
    enableGuestMode();
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isGuest,
        isSupabaseConfigured,
        isLoading,
        authModalOpen,
        setAuthModalOpen,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        continueAsGuest,
        getAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
