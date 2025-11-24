import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Wand2, Code, Copy, Layout, AlertTriangle, Users, Calendar, Clock } from 'lucide-react';
import { AppView, Chatbot, LeadConfig, SchedulingConfig, DaySchedule } from '../types';
import { getSupabase } from '../supabaseClient';
import { generateBotPersona } from '../services/geminiService';
import { WidgetPreview } from './WidgetPreview';

interface BotEditorProps {
  botId?: string;
  onNavigate: (view: AppView) => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

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
    theme_color: '#3b82f6',
    lead_config: {
        enabled: false,
        nameRequired: false,
        emailRequired: false,
        phoneRequired: false,
        title: 'Tell us a bit about yourself'
    },
    scheduling_config: {
        enabled: false,
        durationMinutes: 30,
        bufferMinutes: 10,
        availability: DAYS_OF_WEEK.map(d => ({ day: d.key, enabled: d.key !== 'saturday' && d.key !== 'sunday', start: '09:00', end: '17:00' }))
    }
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
    if (data) {
        // Ensure default structure for existing bots
        const leadConfig = data.lead_config || { enabled: false, nameRequired: false, emailRequired: false, phoneRequired: false };
        
        let schedulingConfig = data.scheduling_config || {
            enabled: false,
            durationMinutes: 30,
            bufferMinutes: 10,
            availability: DAYS_OF_WEEK.map(d => ({ day: d.key, enabled: d.key !== 'saturday' && d.key !== 'sunday', start: '09:00', end: '17:00' }))
        };

        // If old config format or partial, merge with defaults
        if (!schedulingConfig.availability) {
            schedulingConfig.availability = DAYS_OF_WEEK.map(d => ({ day: d.key, enabled: d.key !== 'saturday' && d.key !== 'sunday', start: '09:00', end: '17:00' }));
        }

        setFormData({ ...data, lead_config: leadConfig, scheduling_config: schedulingConfig });
    }
    if (error) {
        console.error(error);
        setErrorMsg("Failed to load chatbot. " + error.message);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (!formData.name) {
        setErrorMsg("Chatbot name is required.");
        return;
    }
    if (!supabase) {
        setErrorMsg("Database not connected.");
        return;
    }
    setLoading(true);
    try {
      let error;
      if (botId) {
        const result = await supabase.from('chatbots').update(formData).eq('id', botId).select();
        error = result.error;
      } else {
        const { id, ...insertData } = formData as any; 
        const result = await supabase.from('chatbots').insert([insertData]).select();
        error = result.error;
      }
      if (error) throw error;
      onNavigate(AppView.DASHBOARD);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Error saving bot");
    } finally {
      setLoading(false);
    }
  };

  const updateLeadConfig = (key: keyof LeadConfig, value: any) => {
    setFormData(prev => ({
        ...prev,
        lead_config: { ...(prev.lead_config as LeadConfig), [key]: value }
    }));
  };

  const updateScheduling = (key: keyof SchedulingConfig, value: any) => {
    setFormData(prev => ({
        ...prev,
        scheduling_config: { ...(prev.scheduling_config as SchedulingConfig), [key]: value }
    }));
  };

  const updateDaySchedule = (day: string, field: keyof DaySchedule, value: any) => {
      const newAvailability = formData.scheduling_config?.availability.map(s => {
          if (s.day === day) return { ...s, [field]: value };
          return s;
      });
      updateScheduling('availability', newAvailability);
  };

  const handleGenerateRole = async () => {
    if (!formData.name) {
        setErrorMsg("Please enter a name first.");
        return;
    }
    setGenerating(true);
    const prompt = `A chatbot named ${formData.name}. Knowledge Base hint: ${formData.knowledge_base}. ${formData.scheduling_config?.enabled ? 'Includes scheduling capabilities.' : ''}`;
    const role = await generateBotPersona(prompt);
    setFormData(prev => ({ ...prev, role_definition: role }));
    setGenerating(false);
  };

  const currentOrigin = window.location.origin;
  const embedCode = `<script>
  window.nexusBotId = "${botId || 'YOUR_BOT_ID'}";
  (function() {
    var d = document, s = d.createElement("script");
    s.src = "${currentOrigin}/widget.js";
    s.async = true;
    var target = d.getElementsByTagName("body")[0] || d.getElementsByTagName("head")[0];
    target.appendChild(s);
  })();
</script>`;

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
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
             <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'config' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>Configuration</button>
             {botId && <button onClick={() => setActiveTab('embed')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'embed' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>Integration</button>}
             <div className="w-px h-6 bg-zinc-800 mx-2"></div>
             <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 shadow-lg shadow-blue-900/20">
               <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
             </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-red-400 text-sm">{errorMsg}</p>
                </div>
            )}

            {activeTab === 'config' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Identity */}
                <section className="bg-surface border border-zinc-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Layout size={20} className="text-primary" /> Identity & Appearance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400 font-medium">Chatbot Name</label>
                      <input type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Support Bot"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400 font-medium">Theme Color</label>
                      <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                        <input type="color" className="w-8 h-8 rounded bg-transparent cursor-pointer border-0 p-0" value={formData.theme_color} onChange={e => setFormData({...formData, theme_color: e.target.value})}/>
                        <span className="text-zinc-300 text-sm font-mono uppercase">{formData.theme_color}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Lead Gen */}
                <section className="bg-surface border border-zinc-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Users size={20} className="text-primary" /> Lead Generation
                        </h3>
                        <div className="flex items-center gap-2">
                             <label className="text-sm text-zinc-400 cursor-pointer" htmlFor="lead-toggle">{formData.lead_config?.enabled ? 'Enabled' : 'Disabled'}</label>
                            <button id="lead-toggle" onClick={() => updateLeadConfig('enabled', !formData.lead_config?.enabled)} className={`w-11 h-6 rounded-full transition-colors relative ${formData.lead_config?.enabled ? 'bg-primary' : 'bg-zinc-700'}`}>
                                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.lead_config?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                    {formData.lead_config?.enabled && (
                        <div className="bg-zinc-950/50 rounded-lg p-4 space-y-4 border border-zinc-800">
                             <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 px-3 py-2 rounded border border-zinc-800"><input type="checkbox" className="bg-zinc-950" checked={formData.lead_config?.nameRequired} onChange={e => updateLeadConfig('nameRequired', e.target.checked)} /><span className="text-sm text-white">Name</span></label>
                                <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 px-3 py-2 rounded border border-zinc-800"><input type="checkbox" className="bg-zinc-950" checked={formData.lead_config?.emailRequired} onChange={e => updateLeadConfig('emailRequired', e.target.checked)} /><span className="text-sm text-white">Email</span></label>
                                <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 px-3 py-2 rounded border border-zinc-800"><input type="checkbox" className="bg-zinc-950" checked={formData.lead_config?.phoneRequired} onChange={e => updateLeadConfig('phoneRequired', e.target.checked)} /><span className="text-sm text-white">Phone</span></label>
                             </div>
                             <div className="pt-2">
                                <label className="text-sm text-zinc-400 font-medium mb-1 block">Custom Field</label>
                                <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary" value={formData.lead_config?.customField || ''} onChange={e => updateLeadConfig('customField', e.target.value)} placeholder="e.g. Company Name"/>
                             </div>
                        </div>
                    )}
                </section>

                {/* Scheduling Section */}
                <section className="bg-surface border border-zinc-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Calendar size={20} className="text-primary" /> Scheduling & Appointments
                        </h3>
                        <div className="flex items-center gap-2">
                             <label className="text-sm text-zinc-400 cursor-pointer" htmlFor="sched-toggle">{formData.scheduling_config?.enabled ? 'Enabled' : 'Disabled'}</label>
                            <button id="sched-toggle" onClick={() => updateScheduling('enabled', !formData.scheduling_config?.enabled)} className={`w-11 h-6 rounded-full transition-colors relative ${formData.scheduling_config?.enabled ? 'bg-primary' : 'bg-zinc-700'}`}>
                                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.scheduling_config?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {formData.scheduling_config?.enabled && (
                        <div className="space-y-6 bg-zinc-950/50 p-6 rounded-lg border border-zinc-800 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-400 font-medium mb-1 block uppercase">Appt Duration (Min)</label>
                                    <input type="number" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" value={formData.scheduling_config.durationMinutes} onChange={e => updateScheduling('durationMinutes', parseInt(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 font-medium mb-1 block uppercase">Buffer Time (Min)</label>
                                    <input type="number" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" value={formData.scheduling_config.bufferMinutes} onChange={e => updateScheduling('bufferMinutes', parseInt(e.target.value))} />
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Clock size={16}/> Weekly Availability</h4>
                                <div className="space-y-2">
                                    {DAYS_OF_WEEK.map((day) => {
                                        const schedule = formData.scheduling_config?.availability.find(s => s.day === day.key) || { day: day.key, enabled: false, start: '09:00', end: '17:00' };
                                        return (
                                            <div key={day.key} className="flex items-center gap-4 p-2 rounded hover:bg-zinc-900/50">
                                                <div className="w-16">
                                                    <span className={`text-sm font-medium ${schedule.enabled ? 'text-white' : 'text-zinc-600'}`}>{day.label}</span>
                                                </div>
                                                <button 
                                                    onClick={() => updateDaySchedule(day.key, 'enabled', !schedule.enabled)}
                                                    className={`w-9 h-5 rounded-full transition-colors relative ${schedule.enabled ? 'bg-primary' : 'bg-zinc-700'}`}
                                                >
                                                    <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${schedule.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                                {schedule.enabled ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input type="time" className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white" value={schedule.start} onChange={e => updateDaySchedule(day.key, 'start', e.target.value)} />
                                                        <span className="text-zinc-500 text-xs">to</span>
                                                        <input type="time" className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white" value={schedule.end} onChange={e => updateDaySchedule(day.key, 'end', e.target.value)} />
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 text-xs text-zinc-600 italic">Unavailable</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Intelligence */}
                <section className="bg-surface border border-zinc-800 rounded-xl p-6 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Code size={20} className="text-primary" /> Intelligence
                        </h3>
                        <button onClick={handleGenerateRole} disabled={generating} className="text-xs flex items-center gap-1.5 text-primary hover:text-blue-400 bg-primary/10 px-3 py-1.5 rounded-full transition">
                           <Wand2 size={14} className={generating ? "animate-spin" : ""} /> {generating ? 'Generating...' : 'Auto-Generate'}
                        </button>
                   </div>
                   <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 font-medium">Role Definition</label>
                            <textarea className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none text-sm" value={formData.role_definition} onChange={e => setFormData({...formData, role_definition: e.target.value})} placeholder="You are a helpful assistant..."></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 font-medium">Knowledge Base</label>
                            <textarea className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none text-sm" value={formData.knowledge_base} onChange={e => setFormData({...formData, knowledge_base: e.target.value})} placeholder="Business hours, policies, etc..."></textarea>
                        </div>
                   </div>
                </section>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in">
                  <section className="bg-surface border border-zinc-800 rounded-xl p-6">
                     <h3 className="text-lg font-medium text-white mb-4">Installation</h3>
                     <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 font-mono overflow-x-auto">{embedCode}</pre>
                  </section>
              </div>
            )}
          </div>
        </div>
      </div>
      {formData.name && activeTab === 'config' && <WidgetPreview chatbot={formData as Chatbot} />}
    </div>
  );
};