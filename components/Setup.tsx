import React, { useState } from 'react';
import { Database, Save } from 'lucide-react';
import { AppView } from '../types';
import { initSupabase } from '../supabaseClient';

interface SetupProps {
  onNavigate: (view: AppView) => void;
}

export const Setup: React.FC<SetupProps> = ({ onNavigate }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleConnect = () => {
    if (!url || !key) {
        setError("Both fields are required.");
        return;
    }
    const success = initSupabase(url, key);
    if (success) {
        // Crude way to persist for the session without backend
        // In a real app, we wouldn't ask this client side repeatedly
        onNavigate(AppView.DASHBOARD);
    } else {
        setError("Invalid URL or Key.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-surface border border-zinc-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Database size={32} className="text-primary" />
            </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-2">Connect Database</h1>
        <p className="text-zinc-400 text-center mb-8 text-sm">
            Enter your Supabase credentials to start building bots.
        </p>

        <div className="space-y-4">
            <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Project URL</label>
                <input 
                    type="text" 
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none"
                    placeholder="https://xyz.supabase.co"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Anon Key</label>
                <input 
                    type="password" 
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none"
                    placeholder="eyJh..."
                />
            </div>
            
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button 
                onClick={handleConnect}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
                <Save size={18} />
                Connect & Continue
            </button>

            <button 
                onClick={() => onNavigate(AppView.DASHBOARD)}
                className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-2 transition"
            >
                Skip (View Only)
            </button>
        </div>
      </div>
    </div>
  );
};