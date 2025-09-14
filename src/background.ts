type ParagraphComment = {
  pId: string;
  count: number | null;
  raw?: string;
  snippet?: string;
};

type StoryStats = {
  title?: string | null;
  author?: string | null;
  reads?: number | null;
  votes?: number | null;
  headerComments?: number | null;
  commentItemsCount?: number;
  paragraphComments?: ParagraphComment[];
  capturedAt?: string;
  wordCount?: number;
};

const CACHE_KEY = "writerAnalyticsStats";

// Load cached stats
async function loadCachedStats(): Promise<StoryStats | null> {
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

// Save stats to cache
async function saveCachedStats(stats: StoryStats): Promise<void> {
  try {
    await chrome.storage.local.set({ [CACHE_KEY]: stats });
    console.log("[WriterAnalytics][background] saved stats for", stats.title);
  } catch (err) {
    console.error("[WriterAnalytics][background] Error saving cache:", err);
  }
}

// Inject content script into Wattpad tabs
async function injectContentScript(tabId: number, url: string) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    console.log(`[WriterAnalytics][background] reinjected content.js into ${url}`);
  } catch (err) {
    console.warn(`[WriterAnalytics][background] failed to inject into ${url}:`, err);
  }
}

// Check if URL is a Wattpad story
function isWattpadStory(url: string): boolean {
  return url.includes("wattpad.com") && /\/\d+-/.test(url);
}

// Service worker startup
console.log("[WriterAnalytics][background] service worker starting");

// Extension installed/updated
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

// Tab navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && isWattpadStory(tab.url)) {
    await injectContentScript(tabId, tab.url);
  }
});

// Message handling with proper async support
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[WriterAnalytics][background] Received message:", message.type);
  
  if (message.type === "WA_STATS") {
    (async () => {
      try {
        const stats = message.payload as StoryStats;
        console.log("[WriterAnalytics][background] caching WA_STATS", stats.title);
        
        await saveCachedStats(stats);
        
        // Notify popup if open
        if (chrome.extension.getViews({ type: "popup" }).length > 0) {
          chrome.runtime.sendMessage({
            type: "WA_UPDATE",
            payload: stats
          });
        } else {
          console.log("[WriterAnalytics][background] Popup not open, stats cached");
        }
        
        sendResponse({ success: true });
      } catch (err: any) {
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
        sendResponse({ success: true, stats: stats });
      } catch (err: any) {
        console.error("[WriterAnalytics][background] Error loading cached stats:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  
  if (message.type === "WA_REFRESH") {
    (async () => {
      try {
        // Request content script to refresh
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
      } catch (err: any) {
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
              },
            }, async (injectionResults) => {
              if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                const stats = injectionResults[0].result as StoryStats;
                await saveCachedStats(stats);
                chrome.runtime.sendMessage({ type: "WA_UPDATE", payload: stats });
                sendResponse({ success: true });
              } else {
                sendResponse({ success: false });
              }
            });
          }
        });
      } catch (err: any) {
        console.error("[WriterAnalytics][background] Error handling WA_URL_CHANGE:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  
  return false;
});

// Remove placeholder function
// function extractStoryStats() {
//   // This should be implemented in content.ts
//   return null;
// }

console.log("[WriterAnalytics][background] background script loaded");