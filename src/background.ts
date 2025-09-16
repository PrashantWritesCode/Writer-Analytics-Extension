

console.log("[background] service worker starting");

// Helpers: load all saved writerAnalyticsStats-* keys
async function loadAllSavedStats(): Promise<{ key: string; stats: StoryStats }[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (all) => {
      const keys = Object.keys(all).filter(k => k.startsWith("writerAnalyticsStats-"));
      const arr = keys.map(k => ({ key: k, stats: all[k] as StoryStats }));
      resolve(arr);
    });
  });
}

async function loadLatestSavedStats(): Promise<StoryStats | null> {
  const arr = await loadAllSavedStats();
  if (arr.length === 0) return null;
  // pick by capturedAt if present
  arr.sort((a, b) => {
    const ta = a.stats?.capturedAt ? new Date(a.stats.capturedAt).getTime() : 0;
    const tb = b.stats?.capturedAt ? new Date(b.stats.capturedAt).getTime() : 0;
    return tb - ta;
  });
  return arr[0].stats || null;
}

async function saveStatsForStory(stats: StoryStats) {
  const sid = stats.storyId || `unknown-${Date.now()}`;
  const key = `writerAnalyticsStats-${sid}`;
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ [key]: stats }, () => {
      console.log("[background] saved stats under", key);
      resolve();
    });
  });
}

// try injecting content script into a given tab
async function injectContentScript(tabId: number, url: string) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    console.log(`[background] injected content.js into ${url}`);
  } catch (err) {
    console.warn(`[background] inject failed for ${url}:`, err);
  }
}

// onInstalled: try injecting into open Wattpad story tabs
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const tabs = await chrome.tabs.query({ url: "*://www.wattpad.com/*" });
    for (const t of tabs) {
      if (t.id && t.url && t.url.includes("/")) {
        await injectContentScript(t.id, t.url);
      }
    }
  } catch (err) {
    console.error("[background] onInstalled error:", err);
  }
});

// Listen for messages from content/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (!message || !message.type) {
        sendResponse({ success: false, error: "invalid message" });
        return;
      }

      if (message.type === "WA_STATS") {
        const stats = message.payload as StoryStats;
        if (stats && stats.storyId) {
          await saveStatsForStory(stats);
        } else if (stats) {
          // try to save with fallback key
          await saveStatsForStory(stats);
        }
        // broadcast update to any popup listeners
        chrome.runtime.sendMessage({ type: "WA_UPDATE", payload: stats }, () => {
          if (chrome.runtime.lastError) {
            // likely popup not open — that's okay
          }
        });
        sendResponse({ success: true });
        return;
      }

      if (message.type === "GET_WA_STATS") {
        const stats = await loadLatestSavedStats();
        sendResponse({ success: true, stats });
        return;
      }

      if (message.type === "WA_REFRESH") {
        // send refresh request to active tab's content script and wait for response
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            // fallback to cached
            loadLatestSavedStats().then((stats) => sendResponse({ success: true, payload: stats }));
            return;
          }
          const tabId = tabs[0].id!;
          chrome.tabs.sendMessage(tabId, { type: "WA_REFRESH" }, async (response) => {
            if (chrome.runtime.lastError) {
              // content script not present or error — attempt injection then fallback
              console.warn("[background] sendMessage to tab failed:", chrome.runtime.lastError.message);
              try {
                await injectContentScript(tabId, tabs[0].url || "");
                // ask again after injection
                chrome.tabs.sendMessage(tabId, { type: "WA_REFRESH" }, (resp2) => {
                  if (resp2 && resp2.payload) {
                    saveStatsForStory(resp2.payload as StoryStats).then(() => {
                      sendResponse({ success: true, payload: resp2.payload });
                    });
                  } else {
                    loadLatestSavedStats().then((stats) => sendResponse({ success: true, payload: stats }));
                  }
                });
              } catch (err) {
                loadLatestSavedStats().then((stats) => sendResponse({ success: true, payload: stats }));
              }
              return;
            }
            if (response && response.payload) {
              await saveStatsForStory(response.payload as StoryStats);
              sendResponse({ success: true, payload: response.payload });
            } else {
              const stats = await loadLatestSavedStats();
              sendResponse({ success: true, payload: stats });
            }
          });
        });
        return;
      }

      if (message.type === "WA_URL_CHANGE") {
        // try to execute extractStoryStats in active tab and save
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || !tabs[0] || !tabs[0].id) {
            sendResponse({ success: false });
            return;
          }
          const tabId = tabs[0].id!;
          chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              // run in page context
              try {
                // @ts-ignore
                const fn = (window as any).extractStoryStats;
                return fn ? fn() : null;
              } catch (e) {
                return null;
              }
            }
          }, async (injectionResults) => {
            if (injectionResults && injectionResults[0] && injectionResults[0].result) {
              const stats = injectionResults[0].result as StoryStats;
              if (stats) {
                await saveStatsForStory(stats);
                chrome.runtime.sendMessage({ type: "WA_UPDATE", payload: stats }, () => {});
                sendResponse({ success: true });
                return;
              }
            }
            sendResponse({ success: false });
          });
        });
        return;
      }

      // default
      sendResponse({ success: false, error: "unknown type" });
    } catch (err) {
      console.error("[background] message handler error:", err);
      try { sendResponse({ success: false, error: (err as any).message || "error" }); } catch {}
    }
  })();

  return true; // indicate async sendResponse
});
