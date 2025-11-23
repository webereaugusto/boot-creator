import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Minus, Bot } from 'lucide-react';
import { Chatbot, Message } from '../types';
import { simulateChatResponse } from '../services/geminiService';

interface WidgetPreviewProps {
  chatbot: Chatbot;
}

export const WidgetPreview: React.FC<WidgetPreviewProps> = ({ chatbot }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Reset state when opening/closing or changing lead config
  useEffect(() => {
     if (isOpen) {
         if (chatbot.lead_config?.enabled) {
             setShowLeadForm(true);
             setMessages([]);
         } else if (messages.length === 0) {
             // If no lead form, start chat immediately
             startChat();
         }
     }
  }, [isOpen, chatbot.lead_config?.enabled]);

  const startChat = () => {
    setShowLeadForm(false);
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
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, showLeadForm]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      chatbot_id: chatbot.id,
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
      session_id: 'temp'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI Response
    const responseText = await simulateChatResponse(
        [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        chatbot.role_definition,
        chatbot.knowledge_base
    );

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      chatbot_id: chatbot.id,
      role: 'assistant',
      content: responseText,
      created_at: new Date().toISOString(),
      session_id: 'temp'
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      startChat();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-surface border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div 
            className="p-4 flex items-center justify-between text-white"
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
            <div className="flex items-center gap-2">
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <Minus size={18} />
              </button>
            </div>
          </div>

          {showLeadForm ? (
            <div className="flex-1 bg-zinc-950 p-6 flex flex-col justify-center animate-in fade-in">
                <h3 className="text-white font-medium mb-4 text-center">Please fill in your details</h3>
                <form onSubmit={handleLeadSubmit} className="space-y-3">
                    {chatbot.lead_config?.nameRequired && (
                        <input type="text" placeholder="Name" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white" required />
                    )}
                    {chatbot.lead_config?.emailRequired && (
                        <input type="email" placeholder="Email" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white" required />
                    )}
                    {chatbot.lead_config?.phoneRequired && (
                        <input type="tel" placeholder="Phone" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white" required />
                    )}
                    {chatbot.lead_config?.customField && (
                        <input type="text" placeholder={chatbot.lead_config.customField} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white" required />
                    )}
                    <button 
                        type="submit" 
                        className="w-full py-2 rounded text-white font-medium mt-2"
                        style={{ backgroundColor: chatbot.theme_color }}
                    >
                        Start Chat
                    </button>
                </form>
            </div>
          ) : (
            <>
                {/* Messages */}
                <div className="flex-1 bg-zinc-950/50 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-primary text-white rounded-br-sm' 
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

                {/* Input */}
                <div className="p-4 bg-surface border-t border-zinc-800">
                    <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    className="flex items-center gap-2"
                    >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
                    />
                    <button 
                        type="submit"
                        className="p-2 rounded-full bg-zinc-800 text-primary hover:bg-zinc-700 transition disabled:opacity-50"
                        disabled={!inputValue.trim()}
                        style={{ color: chatbot.theme_color }}
                    >
                        <Send size={18} />
                    </button>
                    </form>
                    <div className="mt-2 text-center">
                        <p className="text-[10px] text-zinc-500">Preview Mode</p>
                    </div>
                </div>
            </>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-200"
        style={{ backgroundColor: chatbot.theme_color || '#3b82f6' }}
      >
        {isOpen ? <X size={26} className="text-white" /> : <MessageSquare size={26} className="text-white" />}
      </button>
    </div>
  );
};