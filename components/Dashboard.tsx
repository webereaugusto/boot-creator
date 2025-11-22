import React, { useEffect, useState } from 'react';
import { Plus, MessageSquare, Trash2, Code, Terminal } from 'lucide-react';
import { Chatbot, AppView } from '../types';
import { getSupabase } from '../supabaseClient';

interface DashboardProps {
  onNavigate: (view: AppView, botId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [bots, setBots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  useEffect(() => {
    fetchBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBots = async () => {
    if (!supabase) {
        setLoading(false);
        return;
    }
    const { data, error } = await supabase.from('chatbots').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setBots(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;
    if (confirm('Are you sure you want to delete this chatbot?')) {
      await supabase.from('chatbots').delete().eq('id', id);
      fetchBots();
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading your bots...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-zinc-400">Manage your AI assistants and monitor their performance.</p>
        </div>
        <button 
          onClick={() => onNavigate(AppView.EDITOR)}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} />
          <span>Create Chatbot</span>
        </button>
      </div>

      {!supabase && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-3">
            <Terminal size={20} />
            <p>Supabase is not configured. Please go to setup to configure your database connection.</p>
             <button onClick={() => onNavigate(AppView.SETUP)} className="underline">Configure Now</button>
        </div>
      )}

      {bots.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-zinc-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No chatbots yet</h3>
          <p className="text-zinc-500 mb-6">Create your first AI agent to get started.</p>
          <button 
            onClick={() => onNavigate(AppView.EDITOR)}
            className="text-primary hover:text-blue-400 font-medium"
          >
            Create New Bot &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <div 
              key={bot.id} 
              onClick={() => onNavigate(AppView.EDITOR, bot.id)}
              className="group bg-surface border border-zinc-800 rounded-xl p-6 hover:border-primary/50 transition cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: bot.theme_color }}></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl">
                    {bot.avatar_url ? <img src={bot.avatar_url} alt="" className="w-full h-full rounded-lg object-cover"/> : '🤖'}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button 
                        onClick={(e) => handleDelete(bot.id, e)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{bot.name}</h3>
              <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                {bot.role_definition || 'No role defined.'}
              </p>

              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-auto pt-4 border-t border-zinc-800/50">
                 <Code size={14} />
                 <span>Embed ID: {bot.id.slice(0, 8)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};