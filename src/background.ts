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

// background.ts
// --- CORE CHAPTER SYNC LOGIC ---
async function handleChapterSyncFlow(storyId: string, sendResponse: (resp: any) => void) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please log in to update stats.");

    // 1. GUARD: Check the URL before doing anything
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
      throw new Error("Cannot access a chrome:// URL. Please stay on Wattpad.");
    }

    // Story master check
    const { data: storyData } = await supabase.from("tracked_stories").select("total_chapters").eq("story_id", storyId).single();
    if (!storyData) throw new Error("Story not found in database.");

    // Respond to popup so it can show "Processing..."
    sendResponse({ success: true, status: "Processing" });

    // Start the heavy lifting
    await runScrapeLoop(storyId, session.user.id);

  } catch (err: any) {
    console.error("Sync Flow Error:", err);
    sendResponse({ success: false, error: err.message });
  }
}

async function runScrapeLoop(storyId: string, userId: string) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;

  // Scrape chapter list from current page
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => {
      const anchors = Array.from(document.querySelectorAll('ul[aria-label="story-parts"] li a'));
      return anchors.map((a: any, i: number) => ({
        chapterId: a.href.split("/").pop().match(/^(\d+)/)?.[1] || `ch-${i}`,
        url: a.href,
      }));
    },
  });

  if (!result || !result.length) return;

  for (const ch of result) {
    let tab = await chrome.tabs.create({ url: ch.url, active: false });

    await new Promise<void>((res) => {
      const listener = (id: number, info: any) => {
        if (id === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          res();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    const [{ result: stats }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        const reads = document.querySelector(".icon-read + span")?.textContent || "0";
        const votes = document.querySelector(".icon-vote + span")?.textContent || "0";
        const comments = document.querySelector(".icon-comment + span")?.textContent || "0";
        return {
          reads: parseInt(reads.replace(/,/g, "")),
          votes: parseInt(votes.replace(/,/g, "")),
          comments: parseInt(comments.replace(/,/g, "")),
        };
      },
    });

    if (stats) {
      await supabase.from("chapter_snapshots").upsert({
        user_id: userId,
        story_id: storyId,
        chapter_id: ch.chapterId,
        reads: stats.reads,
        votes: stats.votes,
        comments: stats.comments,
        captured_at: new Date().toISOString(),
      });
    }

    await chrome.tabs.remove(tab.id!);
    await new Promise((r) => setTimeout(r, 800));
  }

  // Update Master Timestamp
  await supabase.from("tracked_stories").update({ last_updated: new Date().toISOString() }).eq("story_id", storyId);

  // 🔥 SAFE NOTIFY: Try to tell the popup we are done
  // If the user closed the popup, this .catch() will prevent the error from showing up
  chrome.runtime.sendMessage({ type: "STATS_UPDATED_SUCCESS", storyId }).catch(() => {
    console.log("Popup closed; sync completed silently.");
  });
}