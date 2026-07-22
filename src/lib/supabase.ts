import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getSupabaseCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('custom_supabase_url') || '';
  const localKey = localStorage.getItem('custom_supabase_key') || '';

  const url = localUrl.trim() || envUrl.trim();
  const key = localKey.trim() || envKey.trim();

  return { url, key };
};

export const checkSupabaseConnection = () => {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return false;
  if (url.includes('YOUR_SUPABASE') || key.includes('YOUR_SUPABASE')) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && key.length > 10;
  } catch {
    return false;
  }
};

export const saveCustomSupabaseConfig = (url: string, key: string) => {
  if (url) localStorage.setItem('custom_supabase_url', url.trim());
  else localStorage.removeItem('custom_supabase_url');

  if (key) localStorage.setItem('custom_supabase_key', key.trim());
  else localStorage.removeItem('custom_supabase_key');

  window.location.reload();
};

export const clearCustomSupabaseConfig = () => {
  localStorage.removeItem('custom_supabase_url');
  localStorage.removeItem('custom_supabase_key');
  window.location.reload();
};

export const getActiveSupabaseConfig = () => {
  return getSupabaseCredentials();
};

export const isSupabaseConfigured = checkSupabaseConnection();

const { url, key } = getSupabaseCredentials();
let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured && url && key) {
  try {
    supabaseClient = createClient(url, key);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = supabaseClient;