import { createClient, SupabaseClient } from '@supabase/supabase-js';

// In a real production app, these would be environment variables.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabase) {
    // Try to restore from local storage if not in memory
    const storedUrl = localStorage.getItem('sb_url');
    const storedKey = localStorage.getItem('sb_key');
    if (storedUrl && storedKey) {
      try {
        supabase = createClient(storedUrl, storedKey);
      } catch (e) {
        console.error("Failed to restore Supabase client from local storage", e);
      }
    }
  }
  return supabase;
};

export const initSupabase = (url: string, key: string) => {
  try {
    supabase = createClient(url, key);
    // Persist connection details for this session/browser
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    return true;
  } catch (error) {
    console.error("Failed to init Supabase", error);
    return false;
  }
};

// Attempt auto-init if env vars exist
if (supabaseUrl && supabaseAnonKey) {
  initSupabase(supabaseUrl, supabaseAnonKey);
}

export const SQL_SETUP_SCRIPT = `
-- Enable UUID extension (Required for gen_random_uuid())
create extension if not exists "pgcrypto";

-- Create tables
create table if not exists chatbots (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  role_definition text,
  knowledge_base text,
  api_key text,
  theme_color text default '#3b82f6',
  avatar_url text
);

create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  chatbot_id uuid references chatbots(id) on delete cascade,
  preview_text text
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  chatbot_id uuid references chatbots(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  role text not null,
  content text not null
);

-- Enable Row Level Security
alter table chatbots enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;

-- Policy: Allow public access for this demo builder (WARNING: NOT FOR PRODUCTION)
create policy "Public chatbots access" on chatbots for all using (true);
create policy "Public sessions access" on sessions for all using (true);
create policy "Public messages access" on messages for all using (true);
`;