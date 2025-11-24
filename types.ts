export interface LeadConfig {
  enabled: boolean;
  title?: string;
  nameRequired: boolean;
  emailRequired: boolean;
  phoneRequired: boolean;
  customField?: string; // If set, asks for this specific info
}

export interface Chatbot {
  id: string;
  created_at: string;
  name: string;
  role_definition: string;
  knowledge_base: string;
  api_key: string;
  theme_color: string;
  avatar_url?: string;
  lead_config?: LeadConfig;
}

export interface Message {
  id: string;
  chatbot_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  session_id: string;
}

export interface ChatSession {
  id: string;
  chatbot_id: string;
  created_at: string;
  preview_text: string;
  origin_url?: string;
  user_data?: Record<string, string>; // Stores name, email, etc.
  client_info?: any; // Stores browser info, cookies, UTMs
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  ANALYTICS = 'ANALYTICS',
  SETUP = 'SETUP',
  HISTORY = 'HISTORY'
}

// For Gemini Role Generation
export interface GenerationRequest {
  description: string;
}