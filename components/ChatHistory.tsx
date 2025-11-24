import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, User, Clock, Calendar, Globe, Mail, Phone, Info, Smartphone, Monitor, MapPin, Tag } from 'lucide-react';
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

  const getOSIcon = (ua: string) => {
    if (!ua) return <Monitor size={16} />;
    if (ua.includes('Windows')) return <Monitor size={16} />;
    if (ua.includes('Mac')) return <Monitor size={16} />;
    if (ua.includes('Android')) return <Smartphone size={16} />;
    if (ua.includes('iPhone') || ua.includes('iPad')) return <Smartphone size={16} />;
    return <Monitor size={16} />;
  };

  const activeSession = sessions.find(s => s.id === selectedSessionId);
  const userData = activeSession?.user_data;
  const clientInfo = activeSession?.client_info;

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar: Session List */}
      <div className="w-72 border-r border-zinc-800 flex flex-col bg-surface/30 flex-shrink-0">
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
                        <User size={14} /> 
                        {session.user_data && session.user_data['Name'] ? session.user_data['Name'] : 'Visitor'}
                    </span>
                    <span className="text-[10px] text-zinc-500">{formatDate(session.created_at)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {session.preview_text || 'New Conversation'}
                  </p>
                  {session.origin_url && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600 truncate">
                        <Globe size={10} />
                        {new URL(session.origin_url).pathname}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Content: Chat View */}
      <div className="flex-1 flex flex-col bg-background relative border-r border-zinc-800">
        {selectedSessionId ? (
          <>
            {/* Top Bar with Lead Info */}
            <div className="border-b border-zinc-800 bg-surface/50 backdrop-blur">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-6 text-zinc-300">
                        <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span className="text-sm">Session: <span className="font-mono text-zinc-500">{selectedSessionId.slice(0,8)}</span></span>
                        </div>
                    </div>
                </div>
                
                {/* Contact Card (Only if data exists) */}
                {userData && Object.keys(userData).length > 0 && (
                    <div className="px-4 pb-4 flex flex-wrap gap-4">
                        {userData['Name'] && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-white">
                                <User size={14} className="text-zinc-400" />
                                {userData['Name']}
                            </div>
                        )}
                        {userData['Email'] && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-white">
                                <Mail size={14} className="text-zinc-400" />
                                <a href={`mailto:${userData['Email']}`} className="hover:text-primary">{userData['Email']}</a>
                            </div>
                        )}
                        {userData['Phone'] && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-white">
                                <Phone size={14} className="text-zinc-400" />
                                {userData['Phone']}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
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

      {/* Right Sidebar: Visitor Info */}
      {selectedSessionId && (
        <div className="w-80 bg-surface/30 flex-shrink-0 flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold text-white">Device & Context</h3>
            </div>

            {clientInfo ? (
                <div className="p-4 space-y-6">
                    {/* Device */}
                    <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">System</h4>
                        <div className="space-y-3">
                             <div className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="p-2 bg-zinc-800 rounded-md text-zinc-400">
                                    {getOSIcon(clientInfo.userAgent)}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-zinc-500">OS / Browser</div>
                                    <div className="truncate w-48" title={clientInfo.userAgent}>{clientInfo.platform || 'Unknown Platform'}</div>
                                </div>
                             </div>
                             <div className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="p-2 bg-zinc-800 rounded-md text-zinc-400">
                                    <Monitor size={16} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-zinc-500">Screen Resolution</div>
                                    <div>{clientInfo.screenSize || 'N/A'}</div>
                                </div>
                             </div>
                             <div className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="p-2 bg-zinc-800 rounded-md text-zinc-400">
                                    <Globe size={16} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-zinc-500">Language</div>
                                    <div>{clientInfo.language || 'N/A'}</div>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Origin */}
                    <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Traffic Source</h4>
                         <div className="space-y-3">
                             <div className="flex items-start gap-3 text-sm text-zinc-300">
                                <div className="p-2 bg-zinc-800 rounded-md text-zinc-400">
                                    <MapPin size={16} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-xs text-zinc-500">Referrer</div>
                                    <a href={clientInfo.referrer} target="_blank" className="text-primary hover:underline truncate block" title={clientInfo.referrer}>
                                        {clientInfo.referrer || 'Direct / None'}
                                    </a>
                                </div>
                             </div>
                             <div className="flex items-start gap-3 text-sm text-zinc-300">
                                <div className="p-2 bg-zinc-800 rounded-md text-zinc-400">
                                    <Globe size={16} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-xs text-zinc-500">Landing Page</div>
                                    <a href={activeSession?.origin_url} target="_blank" className="text-primary hover:underline truncate block" title={activeSession?.origin_url}>
                                        {activeSession?.origin_url || 'N/A'}
                                    </a>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Marketing */}
                    {(clientInfo.utm_source || clientInfo.utm_campaign || clientInfo.utm_medium) && (
                        <div>
                             <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Marketing (UTM)</h4>
                             <div className="space-y-2">
                                {clientInfo.utm_source && (
                                    <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 p-2 rounded">
                                        <Tag size={12} className="text-zinc-500"/>
                                        <span className="text-zinc-500">Source:</span>
                                        <span className="text-white">{clientInfo.utm_source}</span>
                                    </div>
                                )}
                                {clientInfo.utm_medium && (
                                    <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 p-2 rounded">
                                        <Tag size={12} className="text-zinc-500"/>
                                        <span className="text-zinc-500">Medium:</span>
                                        <span className="text-white">{clientInfo.utm_medium}</span>
                                    </div>
                                )}
                                {clientInfo.utm_campaign && (
                                    <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 p-2 rounded">
                                        <Tag size={12} className="text-zinc-500"/>
                                        <span className="text-zinc-500">Campaign:</span>
                                        <span className="text-white">{clientInfo.utm_campaign}</span>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}

                    {/* Cookies (Collapsed view) */}
                    <div>
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Cookies</h4>
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[10px] font-mono text-zinc-400 break-all max-h-40 overflow-y-auto">
                            {clientInfo.cookies || 'No accessible cookies'}
                        </div>
                    </div>

                </div>
            ) : (
                 <div className="p-8 text-center text-zinc-500 text-sm">
                    <Info size={24} className="mx-auto mb-2 opacity-50" />
                    No device data collected for this session.
                 </div>
            )}
        </div>
      )}
    </div>
  );
};