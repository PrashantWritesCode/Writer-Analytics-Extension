// Copilot, insert at the top:

/*
IMPORTANT:
- Do NOT modify this file.
- This is the stable Story Analytics scraper.
- New scrapers must be added in src/chapter-analytics/content/.
*/

// Only add the comment.
// Do not change any functional code.

// src/content.ts
type ParagraphComment = {
  pId: string;
  count: number | null;
  raw?: string;
  snippet?: string;
};

type StoryStats = {
  storyId?: string;
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

function parseNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.replace(/[^\d.KMB]/gi, "");
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  if (text.toUpperCase().includes("K")) return Math.round(num * 1000);
  if (text.toUpperCase().includes("M")) return Math.round(num * 1000000);
  if (text.toUpperCase().includes("B")) return Math.round(num * 1000000000);
  return Math.round(num);
}

function extractParagraphComments(): ParagraphComment[] {
  const out: ParagraphComment[] = [];
  try {
    const paragraphElements = document.querySelectorAll("p[data-p-id]");
    paragraphElements.forEach((p) => {
      const text = (p.textContent || "").trim();
      if (text.length < 8) return;
      const pId = p.getAttribute("data-p-id") || `p-${out.length}`;
      let count = 0;
      const numEl = p.querySelector(".num-comment") as HTMLElement | null;
      if (numEl && numEl.textContent) {
        count = parseNumber(numEl.textContent.trim()) || 0;
      }
      out.push({
        pId,
        count,
        raw: text,
        snippet: text.slice(0, 150) + (text.length > 150 ? "..." : ""),
      });
    });
  } catch (err) {
    console.error("[content] paragraph extraction", err);
  }
  return out;
}

function extractStoryStats(): StoryStats | null {
  try {
    // ---------- Title ----------
    const titleSelectors = [
      'h1[data-testid="story-title"]',
      "h1.story-title",
      "h1.h2",
      ".story-header h1",
      ".part-title h1",
      "h1:first-of-type",
    ];
    let title = null;
    for (const s of titleSelectors) {
      const el = document.querySelector(s);
      if (el && el.textContent && el.textContent.trim()) {
        title = el.textContent.trim();
        break;
      }
    }

    // ---------- Author (FIXED) ----------
    const authorSelectors = [
      ".author-info .info strong", // sidebar strong
      ".author-info a.on-navigate",
      ".author.hidden-lg a.on-navigate",
      ".author-name a",
      ".story-author a",
      ".username a",
      ".author a",
    ];
    let author = null;
    for (const s of authorSelectors) {
      const el = document.querySelector(s);
      if (el && el.textContent && el.textContent.trim()) {
        author = el.textContent.replace(/^by\s*/i, "").trim();
        break;
      }
    }

    // ---------- Reads ----------
    const readsSelectors = [
      '[data-testid="story-stats"] span:first-child',
      ".reads-count",
      ".story-stats .reads",
      ".stats .reads",
    ];
    let reads = null;
    for (const s of readsSelectors) {
      const el = document.querySelector(s);
      if (el && el.textContent && el.textContent.trim()) {
        reads = parseNumber(el.textContent.trim());
        break;
      }
    }

    // ---------- Votes ----------
    const votesSelectors = [
      '[data-testid="story-votes"] span',
      ".votes-count",
      ".story-stats .votes",
      ".stats .votes",
    ];
    let votes = null;
    for (const s of votesSelectors) {
      const el = document.querySelector(s);
      if (el && el.textContent && el.textContent.trim()) {
        votes = parseNumber(el.textContent.trim());
        break;
      }
    }

    // ---------- Comments ----------
    const commentsSelectors = [
      '[data-testid="story-comments"] span',
      ".comments-count",
      ".story-stats .comments",
      ".stats .comments",
    ];
    let headerComments = null;
    for (const s of commentsSelectors) {
      const el = document.querySelector(s);
      if (el && el.textContent && el.textContent.trim()) {
        headerComments = parseNumber(el.textContent.trim());
        break;
      }
    }

    // ---------- Paragraph Comments ----------
    const paragraphComments = extractParagraphComments();
    const storyId = (
      window.location.pathname.split("/").pop() || "unknown-story"
    ).replace(/\?.*$/, "");

    const stats: StoryStats = {
      storyId,
      title,
      author,
      reads,
      votes,
      headerComments,
      commentItemsCount: paragraphComments.length,
      paragraphComments,
      capturedAt: new Date().toISOString(),
    };

    if (
      !title &&
      !author &&
      !reads &&
      !votes &&
      !headerComments &&
      paragraphComments.length === 0
    )
      return null;

    try {
      const key = `writerAnalyticsStats-${storyId}`;
      chrome.storage.local.set({ [key]: stats }, () => {});
    } catch (err) {
      console.warn("[content] storage set failed", err);
    }

    try {
      chrome.runtime.sendMessage(
        { type: "WA_STATS", payload: stats },
        () => {}
      );
    } catch (e) {}

    return stats;
  } catch (err) {
    console.error("[content] extract error", err);
    return null;
  }
}

function waitForContent(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (document.querySelector("h1") || document.querySelector("p"))
        resolve();
      else setTimeout(check, 400);
    };
    check();
  });
}

async function init() {
  if (!window.location.href.includes("wattpad.com")) return;
  await waitForContent();
  await new Promise((r) => setTimeout(r, 800));
  const stats = extractStoryStats();
  if (!stats) {
    const sample: StoryStats = {
      storyId: "sample",
      title: "Sample Story Title",
      author: "Sample Author",
      reads: 12345,
      votes: 678,
      headerComments: 21,
      commentItemsCount: 3,
      paragraphComments: [
        { pId: "p1", count: 5, snippet: "Sample para one..." },
        { pId: "p2", count: 3, snippet: "Sample para two..." },
        { pId: "p3", count: 8, snippet: "Sample para three..." },
      ],
      capturedAt: new Date().toISOString(),
    };
    try {
      chrome.runtime.sendMessage(
        { type: "WA_STATS", payload: sample },
        () => {}
      );
    } catch {}
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "WA_REFRESH") {
    const s = extractStoryStats();
    sendResponse({ payload: s || null });
    return true;
  }
  if (message.type === "WA_URL_CHANGE") {
    const s = extractStoryStats();
    sendResponse({ success: !!s, payload: s || null });
    return true;
  }

  /* --- CHAPTER ANALYTICS CONTENT SCRIPT LISTENER --- */
  if (message.type === "SCRAPE_CHAPTER_STATS") {
    // We wrap this in an async IIFE to use 'await'
    (async () => {
      try {
        // 1. Wait for the SPA to render the stats (reads, votes, etc.)
        await waitForChapterStats();

        // 2. Extract the data using your replicated selector logic
        const stats = extractChapterStatsOnly();

        // 3. Destructure the IDs passed from the background script
        const { storyId, chapterId } = message;

        // 4. Create the predictable storage key for the aggregator
        const storageKey = `temp_chapter_stats_${storyId}_${chapterId}`;

        // 5. CRITICAL: Await the storage write so the data is saved
        // BEFORE we tell the background script to close the tab
        await chrome.storage.local.set({
          [storageKey]: {
            reads: stats.reads,
            votes: stats.votes,
            comments: stats.comments,
            capturedAt: new Date().toISOString(),
          },
        });

        console.log(`✅ Data saved to storage: ${storageKey}`);

        // 6. Send the "Heartbeat" back to background.ts
        sendResponse({ success: true });
      } catch (error:any) {
        console.error("[ChapterAnalytics] Scrape failed:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    // Return true to keep the message channel open for the async response
    return true;
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  setTimeout(init, 600);
}

let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    init();
  }
}, 1200);

// Chapter Analytics message handler

/**
 * REPLICATED SELECTOR LOGIC
 * Extracts numeric stats from the DOM using proven selectors.
 */
function extractChapterStatsOnly() {
  // 1. Reads
  const readsSelectors = [
    '[data-testid="story-stats"] span:first-child',
    ".reads-count",
    ".story-stats .reads",
    ".stats .reads",
  ];
  let reads = null;
  for (const s of readsSelectors) {
    const el = document.querySelector(s);
    if (el && el.textContent?.trim()) {
      reads = parseNumber(el.textContent.trim());
      break;
    }
  }

  // 2. Votes
  const votesSelectors = [
    '[data-testid="story-votes"] span',
    ".votes-count",
    ".story-stats .votes",
    ".stats .votes",
  ];
  let votes = null;
  for (const s of votesSelectors) {
    const el = document.querySelector(s);
    if (el && el.textContent?.trim()) {
      votes = parseNumber(el.textContent.trim());
      break;
    }
  }

  // 3. Comments (Header)
  const commentsSelectors = [
    '[data-testid="story-comments"] span',
    ".comments-count",
    ".story-stats .comments",
    ".stats .comments",
  ];
  let comments = null;
  for (const s of commentsSelectors) {
    const el = document.querySelector(s);
    if (el && el.textContent?.trim()) {
      comments = parseNumber(el.textContent.trim());
      break;
    }
  }

  return {
    reads,
    votes,
    comments,
  };
}

/**
 * Polls the DOM until the stat elements are present and contain text.
 * Resolves when data is ready or after a 10s timeout.
 */
async function waitForChapterStats(): Promise<void> {
  const MAX_ATTEMPTS = 20; // 20 attempts * 500ms = 10 seconds
  const INTERVAL = 500;

  return new Promise((resolve) => {
    let attempts = 0;

    const checkInterval = setInterval(() => {
      attempts++;

      // Use your primary selector to check if data has loaded
      const readsEl =
        document.querySelector(
          '[data-testid="story-stats"] span:first-child'
        ) || document.querySelector(".reads-count");

      // Check if element exists AND has text content (not just an empty span)
      const isReady =
        readsEl && readsEl.textContent && readsEl.textContent.trim().length > 0;

      if (isReady) {
        console.log(
          `[ChapterAnalytics] DOM ready after ${attempts * INTERVAL}ms`
        );
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= MAX_ATTEMPTS) {
        console.warn(
          "[ChapterAnalytics] Timeout waiting for stats. Proceeding anyway."
        );
        clearInterval(checkInterval);
        resolve(); // Resolve anyway to prevent the background loop from hanging
      }
    }, INTERVAL);
  });
}
