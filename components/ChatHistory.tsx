import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, User, Clock, Calendar, Globe, Mail, Phone, Info } from 'lucide-react';
import { AppView, Chatbot, ChatSession, Message, Appointment } from '../types';
import { getSupabase } from '../supabaseClient';

interface ChatHistoryProps {
  botId: string;
  onNavigate: (view: AppView) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ botId, onNavigate }) => {
  const supabase = getSupabase();
  const [activeTab, setActiveTab] = useState<'conversations' | 'bookings'>('conversations');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [botName, setBotName] = useState('Chatbot');
  const [loading, setLoading] = useState(true);

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      if (!supabase) return;
      
      const { data: bot } = await supabase.from('chatbots').select('name').eq('id', botId).single();
      if (bot) setBotName(bot.name);

      await fetchSessions();
      await fetchAppointments();
      setLoading(false);
    };
    loadData();
  }, [botId, supabase]);

  const fetchSessions = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('sessions').select('*').eq('chatbot_id', botId).order('created_at', { ascending: false });
      if (data) setSessions(data);
  };

  const fetchAppointments = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('appointments').select('*').eq('chatbot_id', botId).order('start_time', { ascending: false });
      if (data) setAppointments(data);
  };

  // Load Messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!supabase || !selectedSessionId) return;
      const { data } = await supabase.from('messages').select('*').eq('session_id', selectedSessionId).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    loadMessages();
  }, [selectedSessionId, supabase]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-72 border-r border-zinc-800 flex flex-col bg-surface/30 flex-shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <button onClick={() => onNavigate(AppView.DASHBOARD)} className="text-zinc-400 hover:text-white"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="font-semibold text-white">{botName}</h2>
            <p className="text-xs text-zinc-500">History & Bookings</p>
          </div>
        </div>
        
        <div className="flex border-b border-zinc-800">
            <button 
                onClick={() => setActiveTab('conversations')}
                className={`flex-1 py-3 text-xs font-medium transition ${activeTab === 'conversations' ? 'text-primary bg-primary/5 border-b-2 border-primary' : 'text-zinc-400 hover:text-white'}`}
            >
                Conversations
            </button>
            <button 
                onClick={() => setActiveTab('bookings')}
                className={`flex-1 py-3 text-xs font-medium transition ${activeTab === 'bookings' ? 'text-primary bg-primary/5 border-b-2 border-primary' : 'text-zinc-400 hover:text-white'}`}
            >
                Bookings
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-zinc-500 text-sm">Loading...</div>
          ) : activeTab === 'conversations' ? (
             sessions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No conversations yet.</div>
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
                            <User size={14} /> 
                            {session.user_data && session.user_data['Name'] ? session.user_data['Name'] : 'Visitor'}
                        </span>
                        <span className="text-[10px] text-zinc-500">{formatDate(session.created_at)}</span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{session.preview_text || 'New Conversation'}</p>
                    </button>
                ))}
                </div>
             )
          ) : (
            appointments.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No bookings yet.</div>
             ) : (
                <div className="divide-y divide-zinc-800/50">
                    {appointments.map((appt) => (
                        <div key={appt.id} className="p-4 hover:bg-zinc-800/50">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-white text-sm">{new Date(appt.start_time).toLocaleDateString()}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{appt.status}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-primary mb-2">
                                <Clock size={12} />
                                {new Date(appt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(appt.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            {appt.user_data && (
                                <div className="text-xs text-zinc-400 space-y-0.5">
                                    {appt.user_data.Name && <div>{appt.user_data.Name}</div>}
                                    {appt.user_data.Email && <div>{appt.user_data.Email}</div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
             )
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col bg-background relative border-l border-zinc-800">
        {activeTab === 'bookings' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
                 <div className="max-w-md text-center">
                    <Calendar size={48} className="mx-auto mb-4 text-zinc-700" />
                    <h3 className="text-xl font-medium text-white mb-2">Appointments Management</h3>
                    <p className="text-sm">
                        This view lists all scheduled appointments created by your bot. 
                        In a full version, you could reschedule or cancel bookings here.
                    </p>
                 </div>
             </div>
        ) : selectedSessionId ? (
          <>
            <div className="border-b border-zinc-800 bg-surface/50 backdrop-blur p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-300">
                    <Clock size={16} /> <span className="text-sm font-mono text-zinc-500">{selectedSessionId.slice(0,8)}</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'}`}>
                     {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
             <MessageSquare size={32} className="mb-4 opacity-50" />
             <p>Select a conversation to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
};