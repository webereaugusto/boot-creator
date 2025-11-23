import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minus, Bot } from 'lucide-react';
import { Chatbot, Message } from '../types';
import { getSupabase } from '../supabaseClient';
import { simulateChatResponse } from '../services/geminiService';

interface StandaloneWidgetProps {
  botId: string;
}

export const StandaloneWidget: React.FC<StandaloneWidgetProps> = ({ botId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  // Load Bot Data & Restore Session
  useEffect(() => {
    const init = async () => {
      if (!supabase) {
          setLoading(false);
          return;
      }

      // 1. Load Bot Profile
      const { data: botData, error } = await supabase.from('chatbots').select('*').eq('id', botId).single();
      if (error) console.error("Error loading bot:", error);
      if (botData) setChatbot(botData);

      // 2. Check for existing session in LocalStorage
      const storageKey = `nexus_session_${botId}`;
      const savedSessionId = localStorage.getItem(storageKey);

      if (savedSessionId) {
        setSessionId(savedSessionId);
        // Load history
        const { data: history } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', savedSessionId)
          .order('created_at', { ascending: true });
        
        if (history && history.length > 0) {
          setMessages(history);
        }
      }

      setLoading(false);
    };
    init();
  }, [botId, supabase]);

  // Initial Greeting (Only if no messages exist)
  useEffect(() => {
    if (isOpen && messages.length === 0 && chatbot && !loading) {
      setMessages([
        {
          id: 'welcome',
          chatbot_id: chatbot.id,
          role: 'assistant',
          content: `Hello! I am ${chatbot.name}. How can I help you today?`,
          created_at: new Date().toISOString(),
          session_id: 'local'
        }
      ]);
    }
  }, [isOpen, chatbot, messages.length, loading]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  // Communicate with Parent Window
  useEffect(() => {
    const sendMessage = (open: boolean) => {
        window.parent.postMessage({ type: 'nexus-resize', isOpen: open }, '*');
    };
    sendMessage(isOpen);
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chatbot) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      chatbot_id: chatbot.id,
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
      session_id: sessionId || 'temp'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Supabase persistence
    let currentSessionId = sessionId;
    if (supabase) {
      try {
        if (!currentSessionId) {
            // Create new session
            const { data: session } = await supabase.from('sessions').insert({
                chatbot_id: chatbot.id,
                preview_text: userMsg.content.substring(0, 50)
            }).select().single();
            
            if (session) {
                currentSessionId = session.id;
                setSessionId(session.id);
                // Persist to LocalStorage
                localStorage.setItem(`nexus_session_${botId}`, session.id);
            }
        }

        if (currentSessionId) {
            await supabase.from('messages').insert({
                chatbot_id: chatbot.id,
                session_id: currentSessionId,
                role: 'user',
                content: userMsg.content
            });
        }
      } catch (err) {
        console.error("Failed to save message", err);
      }
    }

    // Generate Response
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    const responseText = await simulateChatResponse(history, chatbot.role_definition, chatbot.knowledge_base);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      chatbot_id: chatbot.id,
      role: 'assistant',
      content: responseText,
      created_at: new Date().toISOString(),
      session_id: currentSessionId || 'temp'
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);

    if (supabase && currentSessionId) {
        await supabase.from('messages').insert({
            chatbot_id: chatbot.id,
            session_id: currentSessionId,
            role: 'assistant',
            content: aiMsg.content
        });
        
        // Update session preview text (optional, keeps dashboard fresh)
        // await supabase.from('sessions').update({ preview_text: userMsg.content.substring(0, 50) }).eq('id', currentSessionId);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-zinc-500 bg-transparent"></div>;
  if (!chatbot) return <div className="flex items-center justify-center h-screen text-red-500 bg-zinc-950 p-4 text-center">Bot unavailable.</div>;

  if (!isOpen) {
    return (
        <div className="w-full h-full flex items-center justify-center bg-transparent">
            <button
                onClick={() => setIsOpen(true)}
                className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-200"
                style={{ backgroundColor: chatbot.theme_color || '#3b82f6' }}
            >
                <MessageSquare size={26} className="text-white" />
            </button>
        </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-surface">
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between text-white shrink-0"
        style={{ backgroundColor: chatbot.theme_color || '#3b82f6' }}
      >
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={18} className="text-white" />
            </div>
            <div>
                <h4 className="font-semibold text-sm">{chatbot.name}</h4>
                <p className="text-xs text-white/80">Online</p>
            </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition">
            <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-zinc-950/50 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
            <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
            <div 
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                    ? 'text-white rounded-br-sm' 
                    : 'bg-secondary text-zinc-200 rounded-bl-sm'
                }`}
                style={msg.role === 'user' ? { backgroundColor: chatbot.theme_color } : {}}
            >
                {msg.content}
            </div>
            </div>
        ))}
        {isTyping && (
            <div className="flex justify-start">
            <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-150"></span>
            </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-surface border-t border-zinc-800 shrink-0">
        <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-center gap-2"
        >
            <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
            />
            <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition disabled:opacity-50 text-white"
            style={{ color: chatbot.theme_color }}
            >
            <Send size={18} />
            </button>
        </form>
        <div className="mt-2 text-center">
             <a href="#" className="text-[10px] text-zinc-600 hover:text-zinc-500 transition">Powered by NexusBot</a>
        </div>
      </div>
    </div>
  );
};