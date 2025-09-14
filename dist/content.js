"use strict";
(() => {
  // src/content.ts
  function extractStoryStats() {
    try {
      console.log("[WriterAnalytics][content] Starting data extraction...");
      const titleSelectors = [
        'h1[data-testid="story-title"]',
        "h1.story-title",
        "h1.h2",
        ".story-header h1",
        ".part-title h1",
        "h1:first-of-type"
      ];
      let title = null;
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          title = el.textContent.trim();
          console.log(`[WriterAnalytics][content] Found title using selector: ${selector}`);
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
      for (const selector of authorSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          author = el.textContent.trim();
          console.log(`[WriterAnalytics][content] Found author using selector: ${selector}`);
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
      for (const selector of readsSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          reads = parseNumber(el.textContent.trim());
          console.log(`[WriterAnalytics][content] Found reads using selector: ${selector}, value: ${reads}`);
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
      for (const selector of votesSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          votes = parseNumber(el.textContent.trim());
          console.log(`[WriterAnalytics][content] Found votes using selector: ${selector}, value: ${votes}`);
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
      for (const selector of commentsSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          headerComments = parseNumber(el.textContent.trim());
          console.log(`[WriterAnalytics][content] Found comments using selector: ${selector}, value: ${headerComments}`);
          break;
        }
      }
      const paragraphComments = extractParagraphComments();
      const stats = {
        title,
        author,
        reads,
        votes,
        headerComments,
        commentItemsCount: paragraphComments.length,
        paragraphComments,
        capturedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log("[WriterAnalytics][content] Extracted stats:", stats);
      if (!title && !author && !reads && !votes && !headerComments && paragraphComments.length === 0) {
        console.warn("[WriterAnalytics][content] No data extracted, returning null");
        return null;
      }
      const storyId = window.location.pathname.split("/").pop() || "unknown-story";
      chrome.storage.local.set({ [`writerAnalyticsStats-${storyId}`]: stats }, () => {
        console.log(`[WriterAnalytics][content] Saved stats for story ${storyId}`);
      });
      return stats;
    } catch (err) {
      console.error("[WriterAnalytics][content] Error extracting stats:", err);
      return null;
    }
  }
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
      console.log("[WriterAnalytics][content] Extracting paragraph comments...");
      const pages = document.querySelectorAll(".page.highlighter");
      console.log("[WriterAnalytics][content] Found pages:", pages.length);
      pages.forEach((page) => {
        const paragraphElements = page.querySelectorAll("p[data-p-id]");
        console.log(`[WriterAnalytics][content] Found ${paragraphElements.length} paragraphs in page`);
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
            console.log(`[WriterAnalytics][content] Found comment count ${count} for pId ${pId}`);
          } else {
            console.warn(`[WriterAnalytics][content] No comment count found for pId ${pId}, setting to 0`);
          }
          paragraphs.push({
            pId,
            count,
            raw: text,
            snippet: text.slice(0, 150) + (text.length > 150 ? "..." : "")
          });
        });
      });
      console.log(`[WriterAnalytics][content] Extracted ${paragraphs.length} paragraphs with comments`);
    } catch (err) {
      console.error("[WriterAnalytics][content] Error extracting paragraph comments:", err);
    }
    return paragraphs;
  }
  function sendStatsToBackground(stats) {
    try {
      console.log("[WriterAnalytics][content] Sending stats to background:", stats);
      chrome.runtime.sendMessage({
        type: "WA_STATS",
        payload: stats
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("[WriterAnalytics][content] Error sending stats:", chrome.runtime.lastError);
        } else {
          console.log("[WriterAnalytics][content] Stats sent successfully:", response);
        }
      });
    } catch (err) {
      console.error("[WriterAnalytics][content] Error in sendStatsToBackground:", err);
    }
  }
  function waitForPageContent() {
    return new Promise((resolve) => {
      const checkContent = () => {
        const hasContent = document.querySelector("h1") || document.querySelector(".story-title") || document.querySelector("p");
        if (hasContent) {
          console.log("[WriterAnalytics][content] Page content detected");
          resolve();
        } else {
          console.log("[WriterAnalytics][content] Waiting for page content...");
          setTimeout(checkContent, 500);
        }
      };
      checkContent();
    });
  }
  async function init() {
    console.log("[WriterAnalytics][content] Content script loaded on:", window.location.href);
    if (!window.location.href.includes("wattpad.com") || !window.location.pathname.includes("/")) {
      console.log("[WriterAnalytics][content] Not a Wattpad story page, skipping");
      return;
    }
    try {
      await waitForPageContent();
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      const stats = extractStoryStats();
      if (stats) {
        sendStatsToBackground(stats);
      } else {
        console.log("[WriterAnalytics][content] No stats extracted from this page");
        const sampleStats = {
          title: "Sample Story Title (No Real Data Found)",
          author: "Sample Author",
          reads: 1234,
          votes: 56,
          headerComments: 12,
          commentItemsCount: 5,
          paragraphComments: [
            { pId: "p1", count: 5, snippet: "This is a sample paragraph for testing..." },
            { pId: "p2", count: 3, snippet: "Another sample paragraph..." },
            { pId: "p3", count: 8, snippet: "Third sample paragraph with more engagement..." }
          ],
          capturedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        console.log("[WriterAnalytics][content] Sending sample data for testing");
        sendStatsToBackground(sampleStats);
      }
    } catch (err) {
      console.error("[WriterAnalytics][content] Error in init:", err);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 1e3);
  }
  var lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log("[WriterAnalytics][content] URL changed to:", lastUrl);
      init();
    }
  }, 1e3);
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "WA_REFRESH") {
      console.log("[WriterAnalytics][content] Received WA_REFRESH, re-extracting stats...");
      const stats = extractStoryStats();
      if (stats) {
        sendStatsToBackground(stats);
        sendResponse({ payload: stats });
      } else {
        sendResponse({ payload: null });
      }
      return true;
    }
    if (message.type === "WA_URL_CHANGE") {
      console.log("[WriterAnalytics][content] Received WA_URL_CHANGE, re-extracting stats...");
      const stats = extractStoryStats();
      if (stats) {
        sendStatsToBackground(stats);
        sendResponse({ success: true, payload: stats });
      } else {
        sendResponse({ success: false });
      }
      return true;
    }
  });
})();
//# sourceMappingURL=content.js.map
