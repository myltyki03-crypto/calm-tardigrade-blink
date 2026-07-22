import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const validateSupabaseConfig = () => {
  if (!rawUrl || !rawKey) return false;
  if (rawUrl.includes('YOUR_SUPABASE') || rawKey.includes('YOUR_SUPABASE')) return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = validateSupabaseConfig();

let supabaseClient = null;
if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(rawUrl, rawKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = supabaseClient;