import React, { useState, useEffect } from 'react';
import { Bot, Settings, BarChart3, HelpCircle } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { BotEditor } from './components/BotEditor';
import { ChatHistory } from './components/ChatHistory';
import { Setup } from './components/Setup';
import { SqlModal } from './components/SqlModal';
import { StandaloneWidget } from './components/StandaloneWidget';
import { AppView } from './types';
import { getSupabase } from './supabaseClient';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [selectedBotId, setSelectedBotId] = useState<string | undefined>(undefined);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [embedMode, setEmbedMode] = useState<{isEmbed: boolean, botId: string | null}>({isEmbed: false, botId: null});

  useEffect(() => {
    // Simple router for embed mode
    const params = new URLSearchParams(window.location.search);
    const isEmbed = params.get('embed') === 'true';
    const botId = params.get('botId');

    if (isEmbed && botId) {
      setEmbedMode({ isEmbed: true, botId });
      // Add a specific class to body to make background transparent for the iframe
      // IMPORTANT: Force overflow hidden to prevent scrollbars in the iframe
      document.body.style.backgroundColor = 'transparent';
      document.body.style.setProperty('overflow', 'hidden', 'important');
    }
  }, []);

  const navigate = (view: AppView, botId?: string) => {
    setSelectedBotId(botId);
    setCurrentView(view);
  };

  // RENDER STANDALONE WIDGET
  if (embedMode.isEmbed && embedMode.botId) {
    return <StandaloneWidget botId={embedMode.botId} />;
  }

  // NORMAL APP RENDER
  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onNavigate={navigate} />;
      case AppView.EDITOR:
        return <BotEditor botId={selectedBotId} onNavigate={navigate} />;
      case AppView.HISTORY:
        return selectedBotId ? <ChatHistory botId={selectedBotId} onNavigate={navigate} /> : <Dashboard onNavigate={navigate} />;
      case AppView.SETUP:
        return <Setup onNavigate={navigate} />;
      case AppView.ANALYTICS:
        return <div className="p-8 text-zinc-400">Analytics coming soon.</div>;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  if (currentView === AppView.SETUP) {
      return <Setup onNavigate={navigate} />;
  }

  return (
    <div className="flex min-h-screen bg-background text-zinc-100 font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col bg-surface/50 hidden md:flex">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3 text-white font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Bot size={20} />
            </div>
            NexusBot
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => navigate(AppView.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${currentView === AppView.DASHBOARD ? 'bg-primary/10 text-primary' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <Bot size={20} />
            My Chatbots
          </button>
          <button 
            onClick={() => navigate(AppView.ANALYTICS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${currentView === AppView.ANALYTICS ? 'bg-primary/10 text-primary' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          <button 
             onClick={() => setShowSqlModal(true)}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <HelpCircle size={20} />
            DB Setup Guide
          </button>
          <button 
             onClick={() => navigate(AppView.SETUP)}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <Settings size={20} />
            Connection Settings
          </button>
        </div>
      </aside>

      {/* Main View */}
      <main className="flex-1 overflow-auto relative">
        {renderContent()}
      </main>

      <SqlModal isOpen={showSqlModal} onClose={() => setShowSqlModal(false)} />
    </div>
  );
};

export default App;