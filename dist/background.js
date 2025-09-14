// src/background.ts
var CACHE_KEY = "writerAnalyticsStats";
async function loadCachedStats() {
  try {
    const result = await chrome.storage.local.get([CACHE_KEY]);
    const cached = result[CACHE_KEY];
    console.log("[WriterAnalytics][background] loaded cached stats", !!cached);
    return cached || null;
  } catch (err) {
    console.error("[WriterAnalytics][background] Error loading cache:", err);
    return null;
  }
}
async function saveCachedStats(stats) {
  try {
    await chrome.storage.local.set({ [CACHE_KEY]: stats });
    console.log("[WriterAnalytics][background] saved stats for", stats.title);
  } catch (err) {
    console.error("[WriterAnalytics][background] Error saving cache:", err);
  }
}
async function injectContentScript(tabId, url) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    console.log(`[WriterAnalytics][background] reinjected content.js into ${url}`);
  } catch (err) {
    console.warn(`[WriterAnalytics][background] failed to inject into ${url}:`, err);
  }
}
function isWattpadStory(url) {
  return url.includes("wattpad.com") && /\/\d+-/.test(url);
}
console.log("[WriterAnalytics][background] service worker starting");
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[WriterAnalytics][background] onInstalled", details.reason);
  try {
    const tabs = await chrome.tabs.query({ url: "*://www.wattpad.com/*" });
    for (const tab of tabs) {
      if (tab.id && tab.url && isWattpadStory(tab.url)) {
        await injectContentScript(tab.id, tab.url);
      }
    }
  } catch (err) {
    console.error("[WriterAnalytics][background] Error injecting into existing tabs:", err);
  }
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && isWattpadStory(tab.url)) {
    await injectContentScript(tabId, tab.url);
  }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[WriterAnalytics][background] Received message:", message.type);
  if (message.type === "WA_STATS") {
    (async () => {
      try {
        const stats = message.payload;
        console.log("[WriterAnalytics][background] caching WA_STATS", stats.title);
        await saveCachedStats(stats);
        chrome.runtime.sendMessage({ type: "WA_UPDATE", payload: stats }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("[WriterAnalytics][background] No popup to update:", chrome.runtime.lastError.message);
          }
        });
        sendResponse({ success: true });
      } catch (err) {
        console.error("[WriterAnalytics][background] Error handling WA_STATS:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  if (message.type === "GET_WA_STATS") {
    (async () => {
      try {
        const stats = await loadCachedStats();
        console.log("[WriterAnalytics][background] Sending cached stats:", !!stats);
        sendResponse({ success: true, stats });
      } catch (err) {
        console.error("[WriterAnalytics][background] Error loading cached stats:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  if (message.type === "WA_REFRESH") {
    (async () => {
      try {
        chrome.runtime.sendMessage({ type: "WA_REFRESH" }, (response) => {
          if (response && response.payload) {
            console.log("[WriterAnalytics][background] Received refreshed stats:", response.payload);
            saveCachedStats(response.payload).then(() => {
              sendResponse({ success: true, payload: response.payload });
            });
          } else {
            loadCachedStats().then((stats) => {
              sendResponse({ success: true, payload: stats });
            });
          }
        });
      } catch (err) {
        console.error("[WriterAnalytics][background] Error handling WA_REFRESH:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  if (message.type === "WA_URL_CHANGE") {
    (async () => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => {
                return window.extractStoryStats ? window.extractStoryStats() : null;
              }
            }, async (injectionResults) => {
              if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                const stats = injectionResults[0].result;
                await saveCachedStats(stats);
                chrome.runtime.sendMessage({ type: "WA_UPDATE", payload: stats });
                sendResponse({ success: true });
              } else {
                sendResponse({ success: false });
              }
            });
          }
        });
      } catch (err) {
        console.error("[WriterAnalytics][background] Error handling WA_URL_CHANGE:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  return false;
});
//# sourceMappingURL=background.js.map
