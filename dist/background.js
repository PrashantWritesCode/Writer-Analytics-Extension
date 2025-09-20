// src/background.ts
console.log("[background] starting");
function loadAll() {
  return new Promise((resolve) => chrome.storage.local.get(null, (r) => resolve(r)));
}
async function saveStats(stats) {
  const sid = stats.storyId || `unknown-${Date.now()}`;
  const key = `writerAnalyticsStats-${sid}`;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: stats }, () => {
      console.log("[background] saved", key);
      resolve();
    });
  });
}
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: "*://www.wattpad.com/*" });
    for (const t of tabs) {
      if (t.id && t.url && t.url.includes("/")) {
        try {
          await chrome.scripting.executeScript({ target: { tabId: t.id }, files: ["content.js"] });
        } catch (e) {
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
      if (message.type === "WA_STATS") {
        const stats = message.payload;
        if (stats)
          await saveStats(stats);
        chrome.runtime.sendMessage({ type: "WA_UPDATE", payload: stats }, () => {
        });
        sendResponse({ success: true });
        return;
      }
      if (message.type === "GET_WA_STATS") {
        const all = await loadAll();
        const keys = Object.keys(all).filter((k) => k.startsWith("writerAnalyticsStats-"));
        if (keys.length === 0) {
          sendResponse({ success: true, stats: null });
          return;
        }
        let chosen = null;
        for (const k of keys) {
          const s = all[k];
          if (!s)
            continue;
          if (!chosen) {
            chosen = s;
            continue;
          }
          if (s.capturedAt && chosen.capturedAt) {
            if (new Date(s.capturedAt).getTime() > new Date(chosen.capturedAt).getTime())
              chosen = s;
          }
        }
        sendResponse({ success: true, stats: chosen });
        return;
      }
      if (message.type === "WA_REFRESH") {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            const all = await loadAll();
            const keys = Object.keys(all).filter((k) => k.startsWith("writerAnalyticsStats-"));
            const stats = keys.length ? all[keys[keys.length - 1]] : null;
            sendResponse({ success: true, payload: stats });
            return;
          }
          const tabId = tabs[0].id;
          chrome.tabs.sendMessage(tabId, { type: "WA_REFRESH" }, async (resp) => {
            if (chrome.runtime.lastError) {
              try {
                await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
                chrome.tabs.sendMessage(tabId, { type: "WA_REFRESH" }, async (resp2) => {
                  if (resp2 && resp2.payload) {
                    await saveStats(resp2.payload);
                    sendResponse({ success: true, payload: resp2.payload });
                  } else {
                    const all = await loadAll();
                    const keys = Object.keys(all).filter((k) => k.startsWith("writerAnalyticsStats-"));
                    const stats = keys.length ? all[keys[keys.length - 1]] : null;
                    sendResponse({ success: true, payload: stats });
                  }
                });
              } catch (err) {
                const all = await loadAll();
                const keys = Object.keys(all).filter((k) => k.startsWith("writerAnalyticsStats-"));
                const stats = keys.length ? all[keys[keys.length - 1]] : null;
                sendResponse({ success: true, payload: stats });
              }
              return;
            }
            if (resp && resp.payload) {
              await saveStats(resp.payload);
              sendResponse({ success: true, payload: resp.payload });
            } else {
              const all = await loadAll();
              const keys = Object.keys(all).filter((k) => k.startsWith("writerAnalyticsStats-"));
              const stats = keys.length ? all[keys[keys.length - 1]] : null;
              sendResponse({ success: true, payload: stats });
            }
          });
        });
        return;
      }
      sendResponse({ success: false, error: "unknown type" });
    } catch (err) {
      console.error("[background] handler err", err);
      try {
        sendResponse({ success: false, error: err.message || "error" });
      } catch {
      }
    }
  })();
  return true;
});
//# sourceMappingURL=background.js.map
