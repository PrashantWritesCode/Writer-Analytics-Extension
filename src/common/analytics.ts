// src/common/analytics.ts
// Adjust the path to your supabase client as needed (e.g., ../auth/supabaseClient)
import { supabase } from '../auth/supabase'; 

export interface AnalyticsMetadata {
  title?: string;
  author?: string;
  storyId?: string;
  source?: string;
  [key: string]: any;
}

/**
 * Gets or creates a permanent ID for this browser.
 */
function getAnonymousId(): string {
  const STORAGE_KEY = 'wa_device_id';
  let id = localStorage.getItem(STORAGE_KEY);
  
  if (!id) {
    id = crypto.randomUUID(); // Native browser UUID
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export async function trackStoryEvent(eventName: string, metadata: AnalyticsMetadata = {}) {
  try {
    // 1. Get Auth User (if any)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // 2. Get Guest ID (always exists)
    const anonId = getAnonymousId();

    // 3. Insert into dedicated columns
    await supabase.from('feature_logs').insert({
      user_id: userId,          // Column 1: Link to Auth Users (or NULL)
      anonymous_id: anonId,     // Column 2: The persistent browser ID
      event_name: eventName,
      metadata: {
        ...metadata,
        platform: 'wattpad',
        captured_at: new Date().toISOString()
      }
    });

    // Debug
    console.log(`[Telemetry] 📡 Logged: ${eventName} (AnonID: ${anonId.slice(0,4)}...)`);

  } catch (error) {
    console.warn('[Telemetry] Logging skipped:', error);
  }
}