import { createClient } from '@supabase/supabase-js';

// 🛑 Replace these with your actual values from Supabase Dashboard 
// (Settings > API)
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';

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