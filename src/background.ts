/**
 * Background entry point
 *
 * - Story Analytics (WA_*) is handled here directly
 * - Chapter Analytics (CHAPTER_*) is handled ONLY by chapter orchestrator
 * - background.ts must NOT intercept CHAPTER_* messages
 */

import { supabase } from "./auth/supabase";

// helpers
function loadAll(): Promise<Record<string, any>> {
  return new Promise((resolve) =>
    chrome.storage.local.get(null, (r) => resolve(r))
  );
}

async function saveStats(stats: StoryStats) {
  const sid = stats.storyId || `unknown-${Date.now()}`;
  const key = `writerAnalyticsStats-${sid}`;
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ [key]: stats }, () => {
      resolve();
    });
  });
}

// onInstalled: try injecting into existing wattpad tabs (best-effort)
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: "*://www.wattpad.com/*" });
    for (const t of tabs) {
      if (t.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: t.id },
            files: ["content.js"],
          });
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    console.warn("[background] onInstalled error", err);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (!message || !message.type) {
        sendResponse({ success: false, error: "invalid" });
        return;
      }

      // console.log("[background] UPDATE_CHAPTER_STATS received:", message);
      // -------------------------------
      // Story Analytics (UNCHANGED)
      // -------------------------------

      if (message.type === "GET_ACTIVE_STORY_ID") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs?.[0];
          const storyId = tab?.url?.match(/\/story\/(\d+)/i)?.[1] ?? null;
          sendResponse({ storyId });
        });
        return;
      }

      if (message.type === "WA_STATS") {
        const stats = message.payload as StoryStats;
        if (stats) await saveStats(stats);
        chrome.runtime.sendMessage(
          { type: "WA_UPDATE", payload: stats },
          () => {}
        );
        sendResponse({ success: true });
        return;
      }

      if (message.type === "GET_WA_STATS") {
        const all = await loadAll();
        const keys = Object.keys(all).filter((k) =>
          k.startsWith("writerAnalyticsStats-")
        );
        if (!keys.length) {
          sendResponse({ success: true, stats: null });
          return;
        }

        let chosen: StoryStats | null = null;
        for (const k of keys) {
          const s = all[k] as StoryStats;
          if (!chosen) chosen = s;
          else if (
            s?.capturedAt &&
            chosen?.capturedAt &&
            new Date(s.capturedAt).getTime() >
              new Date(chosen.capturedAt).getTime()
          ) {
            chosen = s;
          }
        }

        sendResponse({ success: true, stats: chosen });
        return;
      }

      if (message.type === "WA_REFRESH") {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async (tabs) => {
            const tab = tabs?.[0];

            // 🚨 CRITICAL GUARD
            if (
              !tab?.id ||
              !tab.url ||
              tab.url.startsWith("chrome://") ||
              tab.url.startsWith("edge://") ||
              tab.url.startsWith("about:")
            ) {
              const all = await loadAll();
              const keys = Object.keys(all).filter((k) =>
                k.startsWith("writerAnalyticsStats-")
              );
              sendResponse({
                success: true,
                payload: keys.length ? all[keys[keys.length - 1]] : null,
              });
              return;
            }

            chrome.tabs.sendMessage(
              tab.id,
              { type: "WA_REFRESH" },
              async (resp) => {
                if (resp?.payload) {
                  await saveStats(resp.payload as StoryStats);
                  sendResponse({ success: true, payload: resp.payload });
                } else {
                  const all = await loadAll();
                  const keys = Object.keys(all).filter((k) =>
                    k.startsWith("writerAnalyticsStats-")
                  );
                  sendResponse({
                    success: true,
                    payload: keys.length ? all[keys[keys.length - 1]] : null,
                  });
                }
              }
            );
          }
        );
        return;
      }

      /* --- CHAPTER ANALYTICS UPDATE LOOP --- */
      if (message.type === "UPDATE_CHAPTER_STATS") {
        // We return 'true' at the bottom to keep the port open for async
        handleChapterSyncFlow(message.storyId, sendResponse);
        return true;
      }

      sendResponse({ success: false, error: "unknown type" });
    } catch (err) {
      console.error("[background] handler err", err);
      sendResponse({
        success: false,
        error: (err as any)?.message || "error",
      });
    }
  })();

  return true;
});

// --- CORE CHAPTER SYNC LOGIC ---

// --- 3. BRIDGE FUNCTION ---
async function handleChapterSyncFlow(storyId: string, sendResponse: (resp: any) => void) {
  try {
    // Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      sendResponse({ success: false, error: "Please log in." });
      return;
    }

    // Check Story
    const { data: storyData } = await supabase.from("tracked_stories")
      .select("total_chapters")
      .eq("story_id", storyId)
      .single();

    if (!storyData) {
      sendResponse({ success: false, error: "Story not found." });
      return;
    }

    // Respond Success Immediately
    sendResponse({ success: true, status: "Processing started" });
    
    // Start the Native Loop
    await runNativeScrapeLoop(storyId, session.user.id);

  } catch (err: any) {
    console.error("Sync Flow Error:", err);
  }
}

// --- 4. THE NATIVE SCRAPE LOOP ---

async function runNativeScrapeLoop(storyId: string, userId: string) {
  const { data: chapters } = await supabase
    .from('story_chapters')
    .select('chapter_id, url')
    .eq('story_id', storyId)
    .order('sequence_order', { ascending: true });

  if (!chapters || chapters.length === 0) return;

  console.log(`[Background] Syncing ${chapters.length} chapters via Native Flow...`);

  for (const ch of chapters) {
    if (!ch.url) continue;

    // 1. Calculate the Key
    // Logic: Split URL by "/" and take the last part (the slug)
    const slug = ch.url.split("/").pop()?.split("?")[0] || ""; 
    const storageKey = `writerAnalyticsStats-${slug}`;

    // 2. Clear old data
    await chrome.storage.local.remove(storageKey);

    // 3. Open Tab
    let tab = await chrome.tabs.create({ url: ch.url, active: false });

    // 4. Wait for Native Stats
    const stats = await waitForNativeStats(storageKey, tab.id!);

    if (stats) {
      console.log(`✅ [${ch.chapter_id}] Captured: Reads=${stats.reads}`);
      
      // --- DEBUG: DB INSERT WITH LOGGING ---
      const payload = {
        user_id: userId,
        story_id: storyId,
        chapter_id: ch.chapter_id,
        reads: stats.reads || 0,
        votes: stats.votes || 0,
        comments: stats.headerComments || 0,
        captured_at: new Date().toISOString()
      };

      console.log("Attempting DB Insert:", payload);

      const { error } = await supabase
        .from("chapter_snapshots").insert(payload);

      if (error) {
        console.error(`❌ SUPABASE ERROR [${ch.chapter_id}]:`, error.message, error.details || "");
      } else {
        console.log(`💾 DB Success for ${ch.chapter_id}`);
      }
      // -------------------------------------

    } else {
      console.warn(`❌ [${ch.chapter_id}] Timed out (content.ts didn't save).`);
    }

    // 5. Close Tab
    await chrome.tabs.remove(tab.id!).catch(() => {});
    
    // Small buffer before next tab
    await new Promise(r => setTimeout(r, 1000));
  }

  // Final Cleanup
  await supabase.from("tracked_stories")
    .update({ last_updated: new Date().toISOString() })
    .eq("story_id", storyId);
    
  // Silence "Receiving end" error
  chrome.runtime.sendMessage({ type: "STATS_UPDATED_SUCCESS", storyId }, () => {
     if (chrome.runtime.lastError) { /* ignore */ }
  });
}

// --- 5. NATIVE POLLER ---
async function waitForNativeStats(key: string, tabId: number): Promise<any> {
  let attempts = 0;
  // content.ts takes ~1.5s to fire. We wait up to 10s.
  while (attempts < 10) { 
    const data = await new Promise<any>((resolve) => {
      chrome.storage.local.get(key, (res) => resolve(res[key]));
    });

    if (data) {
      // If we see data, return it!
      // (Optional: You can add a check here to wait if reads === 0)
      return data;
    }

    // Wait 1s and check again
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }
  return null;
}