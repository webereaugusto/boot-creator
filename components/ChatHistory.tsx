import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, User, Clock, Calendar } from 'lucide-react';
import { AppView, Chatbot, ChatSession, Message } from '../types';
import { getSupabase } from '../supabaseClient';

interface ChatHistoryProps {
  botId: string;
  onNavigate: (view: AppView) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ botId, onNavigate }) => {
  const supabase = getSupabase();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [botName, setBotName] = useState('Chatbot');
  const [loading, setLoading] = useState(true);

  // Load Sessions
  useEffect(() => {
    const loadData = async () => {
      if (!supabase) return;
      
      // Get Bot Name
      const { data: bot } = await supabase.from('chatbots').select('name').eq('id', botId).single();
      if (bot) setBotName(bot.name);

      // Get Sessions
      const { data: sessionList } = await supabase
        .from('sessions')
        .select('*')
        .eq('chatbot_id', botId)
        .order('created_at', { ascending: false });
      
      if (sessionList) setSessions(sessionList);
      setLoading(false);
    };
    loadData();
  }, [botId, supabase]);

  // Load Messages for selected session
  useEffect(() => {
    const loadMessages = async () => {
      if (!supabase || !selectedSessionId) return;

      const { data: msgList } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', selectedSessionId)
        .order('created_at', { ascending: true });
      
      if (msgList) setMessages(msgList);
    };
    loadMessages();
  }, [selectedSessionId, supabase]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar: Session List */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-surface/30">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <button onClick={() => onNavigate(AppView.DASHBOARD)} className="text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-semibold text-white">{botName}</h2>
            <p className="text-xs text-zinc-500">Inbox & History</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-zinc-500 text-sm">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full p-4 text-left hover:bg-zinc-800/50 transition ${selectedSessionId === session.id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-zinc-300 text-sm flex items-center gap-2">
                        <User size={14} /> Visitor
                    </span>
                    <span className="text-[10px] text-zinc-500">{formatDate(session.created_at)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {session.preview_text || 'New Conversation'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content: Chat View */}
      <div className="flex-1 flex flex-col bg-background relative">
        {selectedSessionId ? (
          <>
            <div className="p-4 border-b border-zinc-800 bg-surface/50 backdrop-blur flex items-center justify-between">
               <div className="flex items-center gap-2 text-zinc-300">
                  <Clock size={16} />
                  <span className="text-sm">Session ID: <span className="font-mono text-zinc-500">{selectedSessionId.slice(0,8)}...</span></span>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                     <div 
                        className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-primary text-white rounded-br-none' 
                            : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                        }`}
                     >
                        {msg.content}
                     </div>
                     <span className="text-[10px] text-zinc-600 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
             <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                <Calendar size={32} />
             </div>
             <p>Select a conversation from the left to view history.</p>
          </div>
        )}
      </div>
    </div>
  );
};