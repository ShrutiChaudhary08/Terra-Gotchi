import { useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { PetProvider, usePet } from './context/PetContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { NatureJournal } from './components/NatureJournal.tsx';
import { AchievementsView } from './components/AchievementsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { X, Sparkles, Award } from 'lucide-react';

function AppContent() {
  const { notification, clearNotification } = usePet();

  // Navigation tabs: 'landing' | 'dashboard' | 'journal' | 'achievements' | 'settings'
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'journal' | 'achievements' | 'settings'>(() => {
    // If returning user or stored preference, go directly to dashboard
    const hasVisited = localStorage.getItem('terra_has_visited');
    return hasVisited ? 'dashboard' : 'landing';
  });

  const handleStartExploring = () => {
    localStorage.setItem('terra_has_visited', 'true');
    setCurrentTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f4faeb] text-[#333333] flex flex-col font-sans antialiased selection:bg-[#2c7a4b]/20 selection:text-[#1e5c36]">
      {/* Toast Notification for Level Up or Achievements */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-white rounded-2xl p-4 shadow-2xl border-2 border-emerald-400 flex items-start gap-3 animate-bounce">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            {notification.type === 'reward' ? <Award size={20} /> : <Sparkles size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
              {notification.title}
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              {notification.message}
            </p>
          </div>
          <button
            onClick={clearNotification}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Navigation (hidden on landing page if preferred, or accessible) */}
      <Navbar
        currentTab={currentTab === 'landing' ? 'dashboard' : currentTab}
        setCurrentTab={(tab) => {
          localStorage.setItem('terra_has_visited', 'true');
          setCurrentTab(tab);
        }}
        onGoHome={() => setCurrentTab('landing')}
      />

      {/* Main Page Routing */}
      <main className="flex-1 w-full">
        {currentTab === 'landing' && (
          <LandingPage
            onGetStarted={handleStartExploring}
            onExploreGuest={handleStartExploring}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard onOpenJournal={() => setCurrentTab('journal')} />
        )}

        {currentTab === 'journal' && <NatureJournal />}

        {currentTab === 'achievements' && <AchievementsView />}

        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Authentication Modal */}
      <AuthModal />

      {/* Global Footer */}
      <footer className="w-full border-t border-emerald-100 bg-white/60 py-6 px-4 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#2c7a4b]">Terra-Gotchi 🌱</span>
            <span>• The digital pet that only eats real grass</span>
          </div>

          <div className="flex items-center gap-4 text-gray-400 font-medium">
            <button
              onClick={() => setCurrentTab('landing')}
              className="hover:text-gray-700 transition"
            >
              About
            </button>
            <button
              onClick={() => setCurrentTab('journal')}
              className="hover:text-gray-700 transition"
            >
              Nature Journal
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className="hover:text-gray-700 transition"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PetProvider>
        <AppContent />
      </PetProvider>
    </AuthProvider>
  );
}
