"use strict";
(() => {
  // src/content.ts
  function parseNumber(text) {
    if (!text)
      return null;
    const cleanText = text.replace(/[^\d.KMB]/gi, "");
    const num = parseFloat(cleanText);
    if (isNaN(num))
      return null;
    if (text.toUpperCase().includes("K"))
      return Math.round(num * 1e3);
    if (text.toUpperCase().includes("M"))
      return Math.round(num * 1e6);
    if (text.toUpperCase().includes("B"))
      return Math.round(num * 1e9);
    return Math.round(num);
  }
  function extractParagraphComments() {
    const paragraphs = [];
    try {
      const pages = document.querySelectorAll(".page.highlighter");
      if (!pages || pages.length === 0) {
        const fallback = document.querySelectorAll("p[data-p-id]");
        fallback.forEach((p) => {
          const pId = p.getAttribute("data-p-id") || `p-${paragraphs.length}`;
          const text = p.textContent?.trim() || "";
          if (text.length < 10)
            return;
          const commentElement = p.querySelector(".num-comment");
          let count = 0;
          if (commentElement) {
            const countText = commentElement.textContent?.trim() || "0";
            count = parseNumber(countText) || 0;
          }
          paragraphs.push({
            pId,
            count,
            raw: text,
            snippet: text.slice(0, 150) + (text.length > 150 ? "..." : "")
          });
        });
        return paragraphs;
      }
      pages.forEach((page) => {
        const paragraphElements = page.querySelectorAll("p[data-p-id]");
        paragraphElements.forEach((p) => {
          const pId = p.getAttribute("data-p-id") || `p-${paragraphs.length}`;
          const text = p.textContent?.trim() || "";
          if (text.length < 10)
            return;
          const commentElement = p.querySelector(".num-comment");
          let count = 0;
          if (commentElement) {
            const countText = commentElement.textContent?.trim() || "0";
            count = parseNumber(countText) || 0;
          }
          paragraphs.push({
            pId,
            count,
            raw: text,
            snippet: text.slice(0, 150) + (text.length > 150 ? "..." : "")
          });
        });
      });
    } catch (err) {
      console.error("[content] paragraph extraction error:", err);
    }
    return paragraphs;
  }
  function extractStoryStats() {
    try {
      const titleSelectors = [
        'h1[data-testid="story-title"]',
        "h1.story-title",
        "h1.h2",
        ".story-header h1",
        ".part-title h1",
        "h1:first-of-type"
      ];
      let title = null;
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          title = el.textContent.trim();
          break;
        }
      }
      const authorSelectors = [
        '[data-testid="story-author"] a',
        ".author-name a",
        ".story-author a",
        ".username a",
        ".author a"
      ];
      let author = null;
      for (const sel of authorSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          author = el.textContent.trim();
          break;
        }
      }
      const readsSelectors = [
        '[data-testid="story-stats"] span:first-child',
        ".reads-count",
        ".story-stats .reads",
        ".stats .reads"
      ];
      let reads = null;
      for (const sel of readsSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          reads = parseNumber(el.textContent.trim());
          break;
        }
      }
      const votesSelectors = [
        '[data-testid="story-votes"] span',
        ".votes-count",
        ".story-stats .votes",
        ".stats .votes"
      ];
      let votes = null;
      for (const sel of votesSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          votes = parseNumber(el.textContent.trim());
          break;
        }
      }
      const commentsSelectors = [
        '[data-testid="story-comments"] span',
        ".comments-count",
        ".story-stats .comments",
        ".stats .comments"
      ];
      let headerComments = null;
      for (const sel of commentsSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          headerComments = parseNumber(el.textContent.trim());
          break;
        }
      }
      const paragraphComments = extractParagraphComments();
      const storyId = (window.location.pathname.split("/").pop() || "unknown-story").replace(/\?.*$/, "");
      const stats = {
        storyId,
        title,
        author,
        reads,
        votes,
        headerComments,
        commentItemsCount: paragraphComments.length,
        paragraphComments,
        capturedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (!title && !author && !reads && !votes && !headerComments && paragraphComments.length === 0) {
        return null;
      }
      const key = `writerAnalyticsStats-${storyId}`;
      try {
        chrome.storage.local.set({ [key]: stats }, () => {
          console.log(`[content] saved stats to ${key}`);
        });
      } catch (err) {
        console.warn("[content] storage set error:", err);
      }
      try {
        chrome.runtime.sendMessage({ type: "WA_STATS", payload: stats }, (resp) => {
          if (chrome.runtime.lastError) {
            console.warn("[content] sendMessage WA_STATS error:", chrome.runtime.lastError.message);
          }
        });
      } catch (err) {
        console.warn("[content] send WA_STATS failed:", err);
      }
      return stats;
    } catch (err) {
      console.error("[content] extractStoryStats error:", err);
      return null;
    }
  }
  function waitForPageContent() {
    return new Promise((resolve) => {
      const check = () => {
        const has = document.querySelector("h1") || document.querySelector(".story-title") || document.querySelector("p");
        if (has)
          return resolve();
        setTimeout(check, 500);
      };
      check();
    });
  }
  async function init() {
    if (!window.location.href.includes("wattpad.com"))
      return;
    try {
      await waitForPageContent();
      await new Promise((r) => setTimeout(r, 1e3));
      const stats = extractStoryStats();
      if (!stats) {
        const sample = {
          storyId: "sample",
          title: "Sample Story Title (no data found)",
          author: "Sample Author",
          reads: 1234,
          votes: 56,
          headerComments: 12,
          commentItemsCount: 3,
          paragraphComments: [
            { pId: "p1", count: 5, snippet: "This is sample paragraph one..." },
            { pId: "p2", count: 3, snippet: "Sample paragraph two..." },
            { pId: "p3", count: 8, snippet: "Sample paragraph three..." }
          ],
          capturedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        chrome.runtime.sendMessage({ type: "WA_STATS", payload: sample }, () => {
        });
      }
    } catch (err) {
      console.error("[content] init error:", err);
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type)
      return;
    if (message.type === "WA_REFRESH") {
      const stats = extractStoryStats();
      sendResponse({ payload: stats || null });
      return true;
    }
    if (message.type === "WA_URL_CHANGE") {
      const stats = extractStoryStats();
      sendResponse({ success: !!stats, payload: stats || null });
      return true;
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 800);
  }
  var lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      init();
    }
  }, 1e3);
})();
//# sourceMappingURL=content.js.map
