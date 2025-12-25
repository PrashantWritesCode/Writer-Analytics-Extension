// src/background.ts
function loadAll() {
  return new Promise(
    (resolve) => chrome.storage.local.get(null, (r) => resolve(r))
  );
}
async function saveStats(stats) {
  const sid = stats.storyId || `unknown-${Date.now()}`;
  const key = `writerAnalyticsStats-${sid}`;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: stats }, () => {
      resolve();
    });
  });
}
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: "*://www.wattpad.com/*" });
    for (const t of tabs) {
      if (t.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: t.id },
            files: ["content.js"]
          });
        } catch {
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
      if (message.type === "GET_ACTIVE_STORY_ID") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs?.[0];
          const storyId = tab?.url?.match(/\/story\/(\d+)/i)?.[1] ?? null;
          sendResponse({ storyId });
        });
        return;
      }
      if (message.type === "WA_STATS") {
        const stats = message.payload;
        if (stats)
          await saveStats(stats);
        chrome.runtime.sendMessage(
          { type: "WA_UPDATE", payload: stats },
          () => {
          }
        );
        sendResponse({ success: true });
        return;
      }
      if (message.type === "GET_WA_STATS") {
        const all = await loadAll();
        const keys = Object.keys(all).filter(
          (k) => k.startsWith("writerAnalyticsStats-")
        );
        if (!keys.length) {
          sendResponse({ success: true, stats: null });
          return;
        }
        let chosen = null;
        for (const k of keys) {
          const s = all[k];
          if (!chosen)
            chosen = s;
          else if (s?.capturedAt && chosen?.capturedAt && new Date(s.capturedAt).getTime() > new Date(chosen.capturedAt).getTime()) {
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
            if (!tab?.id || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
              const all = await loadAll();
              const keys = Object.keys(all).filter(
                (k) => k.startsWith("writerAnalyticsStats-")
              );
              sendResponse({
                success: true,
                payload: keys.length ? all[keys[keys.length - 1]] : null
              });
              return;
            }
            chrome.tabs.sendMessage(
              tab.id,
              { type: "WA_REFRESH" },
              async (resp) => {
                if (resp?.payload) {
                  await saveStats(resp.payload);
                  sendResponse({ success: true, payload: resp.payload });
                } else {
                  const all = await loadAll();
                  const keys = Object.keys(all).filter(
                    (k) => k.startsWith("writerAnalyticsStats-")
                  );
                  sendResponse({
                    success: true,
                    payload: keys.length ? all[keys[keys.length - 1]] : null
                  });
                }
              }
            );
          }
        );
        return;
      }
      if (message.type === "UPDATE_CHAPTER_STATS") {
        const { storyId } = message;
        (async () => {
          try {
            const snapshotKey = `chapterAnalytics.snapshots.${storyId}`;
            const data = await chrome.storage.local.get(snapshotKey);
            const snapshot = data?.[snapshotKey];
            if (!snapshot?.chapters)
              return;
            for (const chapter of snapshot.chapters) {
              if (!chapter.chapterUrl)
                continue;
              let tab = await chrome.tabs.create({
                url: chapter.chapterUrl,
                active: false
              });
              await new Promise((resolve) => {
                const listener = (id, info) => {
                  if (id === tab.id && info.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                  }
                };
                chrome.tabs.onUpdated.addListener(listener);
              });
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
              });
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  type: "SCRAPE_CHAPTER_STATS",
                  storyId,
                  chapterId: chapter.chapterId
                });
                console.log(`\u2705 Chapter ${chapter.chapterId} processed.`);
              } catch (msgErr) {
                console.warn(
                  `\u26A0\uFE0F Failed to get response from chapter ${chapter.chapterId}:`,
                  msgErr
                );
              }
              await new Promise((r) => setTimeout(r, 500));
              await chrome.tabs.remove(tab.id).catch(() => {
              });
            }
            await finalizeChapterHistoryMapping(storyId);
            console.log("\u{1F3C1} All chapters scraped and history updated.");
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
        error: err?.message || "error"
      });
    }
  })();
  return true;
});
async function finalizeChapterHistoryMapping(storyId) {
  const snapshotKey = `chapterAnalytics.snapshots.${storyId}`;
  const allData = await chrome.storage.local.get(null);
  const snapshot = allData[snapshotKey];
  if (!snapshot || !snapshot.chapters)
    return;
  const keysToRemove = [];
  snapshot.chapters = snapshot.chapters.map((chapter) => {
    const lookupKey = `temp_chapter_stats_${storyId}_${chapter.chapterId}`;
    const freshStats = allData[lookupKey];
    if (freshStats) {
      if (!chapter.statHistory)
        chapter.statHistory = [];
      chapter.statHistory.push({
        reads: freshStats.reads,
        votes: freshStats.votes,
        comments: freshStats.comments,
        createdAt: freshStats.capturedAt
        // Matches your screenshot key 'createdAt'
      });
      chapter.reads = freshStats.reads;
      chapter.votes = freshStats.votes;
      chapter.comments = freshStats.comments;
      keysToRemove.push(lookupKey);
    }
    return chapter;
  });
  await chrome.storage.local.set({ [snapshotKey]: snapshot });
  await chrome.storage.local.remove(keysToRemove);
  console.log(`\u2705 Mapping complete. StatHistory updated for ${storyId}`);
}
//# sourceMappingURL=background.js.map
