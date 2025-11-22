import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Wand2, Code, Copy, Layout, AlertTriangle } from 'lucide-react';
import { AppView, Chatbot } from '../types';
import { getSupabase } from '../supabaseClient';
import { generateBotPersona } from '../services/geminiService';
import { WidgetPreview } from './WidgetPreview';

interface BotEditorProps {
  botId?: string;
  onNavigate: (view: AppView) => void;
}

export const BotEditor: React.FC<BotEditorProps> = ({ botId, onNavigate }) => {
  const supabase = getSupabase();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'embed'>('config');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Chatbot>>({
    name: '',
    role_definition: '',
    knowledge_base: '',
    api_key: '',
    theme_color: '#3b82f6'
  });

  useEffect(() => {
    if (botId && supabase) {
      loadBot(botId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  const loadBot = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase!.from('chatbots').select('*').eq('id', id).single();
    if (data) setFormData(data);
    if (error) {
        console.error(error);
        setErrorMsg("Failed to load chatbot. " + error.message);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    
    // Validation
    if (!formData.name) {
        setErrorMsg("Chatbot name is required.");
        return;
    }

    // Check DB connection
    if (!supabase) {
        setErrorMsg("Database not connected. Please go to 'Connection Settings' in the sidebar.");
        return;
    }
    
    setLoading(true);

    try {
      let error;
      let data;

      if (botId) {
        // Update existing
        const result = await supabase.from('chatbots').update(formData).eq('id', botId).select();
        error = result.error;
        data = result.data;
      } else {
        // Insert new
        const { id, ...insertData } = formData as any; 
        const result = await supabase.from('chatbots').insert([insertData]).select();
        error = result.error;
        data = result.data;
      }

      if (error) {
        console.error("Supabase Error:", error);
        const details = error.message || JSON.stringify(error);
        const hint = error.hint ? ` Hint: ${error.hint}` : '';
        setErrorMsg(`Database Error: ${details}.${hint} (Have you run the Setup SQL script?)`);
      } else {
        if (data && data[0]?.id && !botId) {
             // If newly created, switch to update mode with the new ID
             onNavigate(AppView.DASHBOARD); 
        } else {
             onNavigate(AppView.DASHBOARD);
        }
      }
    } catch (e: any) {
      console.error("Unexpected Error:", e);
      setErrorMsg(`An unexpected error occurred: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRole = async () => {
    if (!formData.name) {
        setErrorMsg("Please enter a name first to generate instructions.");
        return;
    }
    setErrorMsg(null);
    setGenerating(true);
    const prompt = `A chatbot named ${formData.name}. Context/Knowledge Base hint: ${formData.knowledge_base}`;
    const role = await generateBotPersona(prompt);
    setFormData(prev => ({ ...prev, role_definition: role }));
    setGenerating(false);
  };

  // Generate script using the current origin so it works on Vercel
  const currentOrigin = window.location.origin;
  const embedCode = `<script>
  window.nexusBotId = "${botId || 'YOUR_BOT_ID'}";
  (function() {
    var script = document.createElement("script");
    script.src = "${currentOrigin}/widget.js"; 
    script.async = true;
    // Safe append that works even if placed in <head>
    if (document.body) {
       document.body.appendChild(script);
    } else {
       document.addEventListener('DOMContentLoaded', function() {
          document.body.appendChild(script);
       });
    }
  })();
</script>`;

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Toolbar */}
        <div className="border-b border-zinc-800 bg-surface/50 backdrop-blur p-4 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <button onClick={() => onNavigate(AppView.DASHBOARD)} className="text-zinc-400 hover:text-white transition">
               <ArrowLeft size={24} />
             </button>
             <h2 className="text-xl font-semibold text-white">
               {botId ? 'Edit Chatbot' : 'New Chatbot'}
             </h2>
           </div>
           <div className="flex items-center gap-3">
             <button 
               onClick={() => setActiveTab('config')}
               className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'config' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
             >
               Configuration
             </button>
             {botId && (
                <button 
                onClick={() => setActiveTab('embed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'embed' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                Integration
                </button>
             )}
             <div className="w-px h-6 bg-zinc-800 mx-2"></div>
             <button 
               onClick={handleSave}
               disabled={loading}
               className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
             >
               <Save size={18} />
               {loading ? 'Saving...' : 'Save Changes'}
             </button>
           </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            
            {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <h4 className="text-red-500 font-medium text-sm">Error Saving Chatbot</h4>
                        <p className="text-red-400 text-xs font-mono mt-1 opacity-90 break-words">{errorMsg}</p>
                    </div>
                </div>
            )}

            {activeTab === 'config' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Identity Section */}
                <section className="bg-surface border border-zinc-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Layout size={20} className="text-primary" />
                    Identity & Appearance
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400 font-medium">Chatbot Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition"
                        placeholder="e.g. Support Agent"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400 font-medium">Theme Color</label>
                      <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                        <input 
                            type="color" 
                            className="w-8 h-8 rounded bg-transparent cursor-pointer border-0 p-0"
                            value={formData.theme_color}
                            onChange={e => setFormData({...formData, theme_color: e.target.value})}
                        />
                        <span className="text-zinc-300 text-sm font-mono uppercase">{formData.theme_color}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Brain Section */}
                <section className="bg-surface border border-zinc-800 rounded-xl p-6 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Code size={20} className="text-primary" />
                            Intelligence
                        </h3>
                        <button 
                           onClick={handleGenerateRole}
                           disabled={generating}
                           className="text-xs flex items-center gap-1.5 text-primary hover:text-blue-400 bg-primary/10 px-3 py-1.5 rounded-full transition hover:bg-primary/20"
                        >
                           <Wand2 size={14} className={generating ? "animate-spin" : ""} />
                           {generating ? 'Generating...' : 'Auto-Generate Instructions'}
                        </button>
                   </div>

                   <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 font-medium">Role Definition (System Prompt)</label>
                            <textarea 
                                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none text-sm leading-relaxed focus:ring-1 focus:ring-primary/50 transition"
                                placeholder="You are a helpful support assistant. You are polite, concise, and expert in..."
                                value={formData.role_definition}
                                onChange={e => setFormData({...formData, role_definition: e.target.value})}
                            ></textarea>
                            <p className="text-[11px] text-zinc-500">Defines how the bot behaves and speaks.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 font-medium">Knowledge Base</label>
                            <textarea 
                                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none text-sm leading-relaxed focus:ring-1 focus:ring-primary/50 transition"
                                placeholder="Paste product details, policies, or FAQs here..."
                                value={formData.knowledge_base}
                                onChange={e => setFormData({...formData, knowledge_base: e.target.value})}
                            ></textarea>
                            <p className="text-[11px] text-zinc-500">Context provided to the bot for every query.</p>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                            <label className="text-sm text-zinc-400 font-medium">OpenAI API Key (or other Provider)</label>
                            <input 
                                type="password" 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none font-mono text-sm focus:ring-1 focus:ring-primary/50 transition"
                                placeholder="sk-..."
                                value={formData.api_key}
                                onChange={e => setFormData({...formData, api_key: e.target.value})}
                            />
                            <p className="text-xs text-zinc-500">
                                This key is used by the bot to generate responses.
                            </p>
                        </div>
                   </div>
                </section>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                  <section className="bg-surface border border-zinc-800 rounded-xl p-6">
                     <h3 className="text-lg font-medium text-white mb-4">Installation</h3>
                     <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                        Copy the code below and paste it anywhere in the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{`<body>`}</code> of your website.
                     </p>
                     
                     <div className="relative group">
                        <div className="absolute top-0 left-0 w-full bg-zinc-800/50 h-8 rounded-t-lg flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                        </div>
                        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg pt-12 pb-4 px-4 text-sm text-zinc-300 font-mono overflow-x-auto leading-relaxed">
                            {embedCode}
                        </pre>
                        <button 
                            onClick={() => navigator.clipboard.writeText(embedCode)}
                            className="absolute top-10 right-2 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-white transition shadow-lg"
                            title="Copy to Clipboard"
                        >
                            <Copy size={16} />
                        </button>
                     </div>
                     <div className="mt-4 p-4 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/20">
                        <strong>Tip:</strong> Since this is a preview deployment, make sure you are viewing this dashboard on the same domain where you want to host the widget script (e.g. Vercel), otherwise the `script.src` might point to localhost.
                     </div>
                  </section>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Live Preview Overlay (Simulated) */}
      {formData.name && activeTab === 'config' && (
         <WidgetPreview chatbot={formData as Chatbot} />
      )}
    </div>
  );
};