import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0A0B10] text-stone-400">
        <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3 shadow-md shadow-amber-500/20" />
        <span className="text-sm font-semibold tracking-wide bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
          Lighting up Alight...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0B10] text-stone-100 transition-colors duration-200">
      {/* Auth Modal if unauthenticated */}
      <AuthModal isOpen={!user} />

      {/* App interface when user is signed in */}
      {user && (
        <>
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <ChatArea
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <MainLayout />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
