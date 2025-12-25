/**
 * Background entry point
 *
 * - Story Analytics (WA_*) is handled here directly
 * - Chapter Analytics (CHAPTER_*) is handled ONLY by chapter orchestrator
 * - background.ts must NOT intercept CHAPTER_* messages
 */

import { appendChapterStat } from "./chapter-analytics/storage/chapterStorage";

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
        const { storyId } = message;

        (async () => {
          try {
            const snapshotKey = `chapterAnalytics.snapshots.${storyId}`;
            const data = await chrome.storage.local.get(snapshotKey);
            const snapshot = data?.[snapshotKey];

            if (!snapshot?.chapters) return;

            for (const chapter of snapshot.chapters) {
              if (!chapter.chapterUrl) continue;

              let tab = await chrome.tabs.create({
                url: chapter.chapterUrl,
                active: false,
              });

              // 1. Wait for tab to be fully loaded
              await new Promise<void>((resolve) => {
                const listener = (id: number, info: any) => {
                  if (id === tab.id && info.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                  }
                };
                chrome.tabs.onUpdated.addListener(listener);
              });

              // 2. Inject content script
              await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                files: ["content.js"],
              });

              // 3. THE HANDSHAKE: Await the response from the content script
              // This ensures the content script finishes waitForChapterStats() and storage.set()
              try {
                await chrome.tabs.sendMessage(tab.id!, {
                  type: "SCRAPE_CHAPTER_STATS",
                  storyId: storyId,
                  chapterId: chapter.chapterId,
                });
                console.log(`✅ Chapter ${chapter.chapterId} processed.`);
              } catch (msgErr) {
                console.warn(
                  `⚠️ Failed to get response from chapter ${chapter.chapterId}:`,
                  msgErr
                );
              }

              // 4. Small buffer to allow Chrome to settle its storage sync
              await new Promise((r) => setTimeout(r, 500));

              // 5. Safe to remove tab now
              await chrome.tabs.remove(tab.id!).catch(() => {});
            }

            // 🏁 Aggregation: Map the temporary keys into the main snapshot history
            await finalizeChapterHistoryMapping(storyId);

            console.log("🏁 All chapters scraped and history updated.");
          } catch (err) {
            console.error("Decoupled Loop Error:", err);
          }
        })();

        sendResponse({ success: true, status: "Processing" });
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
async function finalizeChapterHistoryMapping(storyId: string) {
  const snapshotKey = `chapterAnalytics.snapshots.${storyId}`;
  const allData = await chrome.storage.local.get(null);
  const snapshot = allData[snapshotKey];

  if (!snapshot || !snapshot.chapters) return;

  const keysToRemove: string[] = [];

  snapshot.chapters = snapshot.chapters.map((chapter: any) => {
    // This MUST match the key created in content.ts
    const lookupKey = `temp_chapter_stats_${storyId}_${chapter.chapterId}`;
    const freshStats = allData[lookupKey];

    if (freshStats) {
      if (!chapter.statHistory) chapter.statHistory = [];

      // PUSH the data into the history array
      chapter.statHistory.push({
        reads: freshStats.reads,
        votes: freshStats.votes,
        comments: freshStats.comments,
        createdAt: freshStats.capturedAt, // Matches your screenshot key 'createdAt'
      });

      // Update current values for the UI
      chapter.reads = freshStats.reads;
      chapter.votes = freshStats.votes;
      chapter.comments = freshStats.comments;

      keysToRemove.push(lookupKey);
    }
    return chapter;
  });

  // Save the updated master snapshot back to DB
  await chrome.storage.local.set({ [snapshotKey]: snapshot });

  // Clean up the temporary keys
  await chrome.storage.local.remove(keysToRemove);

  console.log(`✅ Mapping complete. StatHistory updated for ${storyId}`);
}
