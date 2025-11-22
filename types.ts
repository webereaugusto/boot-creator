export interface Chatbot {
  id: string;
  created_at: string;
  name: string;
  role_definition: string;
  knowledge_base: string;
  api_key: string;
  theme_color: string;
  avatar_url?: string;
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
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  ANALYTICS = 'ANALYTICS',
  SETUP = 'SETUP'
}

// For Gemini Role Generation
export interface GenerationRequest {
  description: string;
}
