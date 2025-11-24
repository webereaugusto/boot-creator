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
  
  // Lead Gen State
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState<Record<string, string>>({});

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
      
      if (botData) {
        setChatbot(botData);
        // Initialize logic for lead form
        const storageKey = `nexus_session_${botId}`;
        const savedSessionId = localStorage.getItem(storageKey);

        if (savedSessionId) {
            // If session exists, skip form
            setSessionId(savedSessionId);
            const { data: history } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', savedSessionId)
            .order('created_at', { ascending: true });
            
            if (history && history.length > 0) {
                setMessages(history);
            }
            setShowLeadForm(false);
        } else {
            // No session, check if lead form is enabled
            if (botData.lead_config?.enabled) {
                setShowLeadForm(true);
            } else {
                setShowLeadForm(false);
            }
        }
      }
      setLoading(false);
    };
    init();
  }, [botId, supabase]);

  // Initial Greeting
  useEffect(() => {
    if (isOpen && !showLeadForm && messages.length === 0 && chatbot && !loading) {
      setMessages([
        {
          id: 'welcome',
          chatbot_id: chatbot.id,
          role: 'assistant',
          content: `Olá! Eu sou ${chatbot.name}. Como posso ajudar você hoje?`,
          created_at: new Date().toISOString(),
          session_id: 'local'
        }
      ]);
    }
  }, [isOpen, showLeadForm, chatbot, messages.length, loading]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen, showLeadForm]);

  // Communicate with Parent Window
  useEffect(() => {
    const sendMessage = (open: boolean) => {
        window.parent.postMessage({ type: 'nexus-resize', isOpen: open }, '*');
    };
    sendMessage(isOpen);
  }, [isOpen]);


  const handleLeadSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (supabase && chatbot) {
        try {
            const params = new URLSearchParams(window.location.search);
            const originUrl = params.get('origin');

            const { data: session } = await supabase.from('sessions').insert({
                chatbot_id: chatbot.id,
                preview_text: 'Formulário de Lead Enviado',
                origin_url: originUrl || undefined,
                user_data: leadData
            }).select().single();

            if (session) {
                setSessionId(session.id);
                localStorage.setItem(`nexus_session_${botId}`, session.id);
            }
        } catch (error) {
            console.error("Failed to create session with lead data", error);
        }
      }
      setShowLeadForm(false);
  };

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
            const params = new URLSearchParams(window.location.search);
            const originUrl = params.get('origin');

            const { data: session } = await supabase.from('sessions').insert({
                chatbot_id: chatbot.id,
                preview_text: userMsg.content.substring(0, 50),
                origin_url: originUrl || undefined
            }).select().single();
            
            if (session) {
                currentSessionId = session.id;
                setSessionId(session.id);
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

    // --- LÓGICA DE AGENDAMENTO (CÉREBRO) ---
    // Injetamos a data atual e as regras de horário no prompt para que o Gemini possa validar e confirmar agendamentos.
    let systemInstruction = chatbot.role_definition;
    let knowledgeBase = chatbot.knowledge_base;

    if (chatbot.scheduling_config?.enabled) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const scheduleInfo = `
        CONTEXTO DE DATA E HORA ATUAL:
        - Hoje é: ${dateStr}, ${timeStr}.
        - Fuso Horário: Horário de Brasília.
        
        REGRAS DE AGENDAMENTO:
        - Duração da consulta: ${chatbot.scheduling_config.durationMinutes} minutos.
        - Horários de Funcionamento (Disponibilidade):
          ${chatbot.scheduling_config.availability.filter(d => d.enabled).map(d => `${d.day}: ${d.start} às ${d.end}`).join('\n          ')}
        
        INSTRUÇÃO CRÍTICA PARA AGENDAMENTO:
        - Verifique se a data solicitada é futura e está dentro do horário de funcionamento.
        - Se o usuário confirmar explicitamente um horário, você DEVE adicionar a seguinte tag JSON oculta no final da sua resposta (sem blocos de código):
          [AGENDAMENTO: {"start": "AAAA-MM-DDTHH:MM:00", "end": "AAAA-MM-DDTHH:MM:00"}]
        - A data deve estar no formato ISO 8601 exato. Calcule o horário de fim baseado na duração (${chatbot.scheduling_config.durationMinutes} min).
        - Apenas gere essa tag se o usuário CONFIRMAR. Se ele apenas perguntar disponibilidade, apenas responda.
        `;
        
        knowledgeBase += scheduleInfo;
    }

    // Generate Response
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    let responseText = await simulateChatResponse(history, systemInstruction, knowledgeBase);

    // --- INTERCEPTAR AÇÃO DE AGENDAMENTO ---
    const bookingRegex = /\[AGENDAMENTO:\s*({.*?})\]/s;
    const match = responseText.match(bookingRegex);
    
    if (match && supabase && currentSessionId) {
        try {
            const bookingData = JSON.parse(match[1]);
            // Remove a tag da resposta visível para o usuário
            responseText = responseText.replace(match[0], '').trim();
            
            // Salvar no Supabase
            await supabase.from('appointments').insert({
                chatbot_id: chatbot.id,
                session_id: currentSessionId,
                start_time: bookingData.start,
                end_time: bookingData.end,
                status: 'confirmed',
                user_data: leadData || {} // Atribui os dados do lead se houver
            });

            // Adiciona feedback visual
            responseText += "\n\n✅ Agendamento confirmado no sistema com sucesso!";
        } catch (e) {
            console.error("Falha ao processar agendamento", e);
        }
    }

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
        
        await supabase.from('sessions').update({ preview_text: userMsg.content.substring(0, 50) }).eq('id', currentSessionId);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-zinc-500 bg-transparent"></div>;
  if (!chatbot) return <div className="flex items-center justify-center h-screen text-red-500 bg-zinc-950 p-4 text-center">Bot indisponível.</div>;

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

      {showLeadForm ? (
          <div className="flex-1 bg-zinc-950 p-8 flex flex-col justify-center animate-in fade-in">
             <div className="text-center mb-6">
                <h3 className="text-white font-semibold text-lg">Bem-vindo</h3>
                <p className="text-zinc-400 text-sm mt-1">Por favor, preencha seus dados para iniciar o chat.</p>
             </div>
             
             <form onSubmit={handleLeadSubmit} className="space-y-4">
                 {chatbot.lead_config?.nameRequired && (
                     <div>
                        <label className="text-xs text-zinc-500 font-medium ml-1">Nome</label>
                        <input 
                            type="text" 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" 
                            required 
                            onChange={e => setLeadData({...leadData, Name: e.target.value})}
                        />
                     </div>
                 )}
                 {chatbot.lead_config?.emailRequired && (
                     <div>
                        <label className="text-xs text-zinc-500 font-medium ml-1">E-mail</label>
                        <input 
                            type="email" 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" 
                            required 
                            onChange={e => setLeadData({...leadData, Email: e.target.value})}
                        />
                     </div>
                 )}
                 {chatbot.lead_config?.phoneRequired && (
                     <div>
                        <label className="text-xs text-zinc-500 font-medium ml-1">Telefone</label>
                        <input 
                            type="tel" 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" 
                            required 
                            onChange={e => setLeadData({...leadData, Phone: e.target.value})}
                        />
                     </div>
                 )}
                 {chatbot.lead_config?.customField && (
                     <div>
                        <label className="text-xs text-zinc-500 font-medium ml-1">{chatbot.lead_config.customField}</label>
                        <input 
                            type="text" 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" 
                            required 
                            onChange={e => setLeadData({...leadData, [chatbot.lead_config!.customField!]: e.target.value})}
                        />
                     </div>
                 )}
                 <button 
                     type="submit" 
                     className="w-full py-3 rounded-lg text-white font-medium mt-4 hover:opacity-90 transition"
                     style={{ backgroundColor: chatbot.theme_color || '#3b82f6' }}
                 >
                     Iniciar Chat
                 </button>
             </form>
          </div>
      ) : (
        <>
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
                    placeholder="Digite uma mensagem..."
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
                    <a href="#" className="text-[10px] text-zinc-600 hover:text-zinc-500 transition">Desenvolvido por NexusBot</a>
                </div>
            </div>
        </>
      )}
    </div>
  );
};