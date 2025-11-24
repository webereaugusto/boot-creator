export interface LeadConfig {
  enabled: boolean;
  title?: string;
  nameRequired: boolean;
  emailRequired: boolean;
  phoneRequired: boolean;
  customField?: string; // If set, asks for this specific info
}

export interface DaySchedule {
  day: string; // 'monday', 'tuesday', etc.
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "17:00"
}

export interface SchedulingConfig {
  enabled: boolean;
  durationMinutes: number; // e.g., 30
  bufferMinutes: number;   // e.g., 10 (break between slots)
  availability: DaySchedule[];
  timezone?: string;
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
  scheduling_config?: SchedulingConfig;
}

export interface Appointment {
  id: string;
  chatbot_id: string;
  session_id: string;
  user_data: any; // Name, email, etc.
  start_time: string; // ISO String
  end_time: string;   // ISO String
  status: 'confirmed' | 'cancelled' | 'pending';
  created_at: string;
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