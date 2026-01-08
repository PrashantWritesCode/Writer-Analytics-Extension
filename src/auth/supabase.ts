import { createClient } from '@supabase/supabase-js';

// 🛑 Replace these with your actual values from Supabase Dashboard 
// (Settings > API)
const SUPABASE_URL = "https://zxgsamzogtpaynecrgdr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z3NhbXpvZ3RwYXluZWNyZ2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTczNjQsImV4cCI6MjA3NDAzMzM2NH0.Ys8Xa8dBrgcIEjSq1x0cmEsOzkGTcepCera4fwNAtwg";

/**
 * CUSTOM STORAGE ADAPTER
 * Standard localStorage is unreliable in Extension popups.
 * This adapter forces Supabase to use Chrome's persistent storage.
 */
const extensionStorageAdapter = {
  getItem: async (key: string) => {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },
  setItem: async (key: string, value: string) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string) => {
    await chrome.storage.local.remove(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: extensionStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevents redirection bugs in the popup environment
    flowType: 'pkce',          // Using the secure 2026 standard flow
  },
});