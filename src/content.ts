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
      chrome.runtime.sendMessage({ type: "WA_STATS", payload: stats }, () => {});
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
      if (document.querySelector("h1") || document.querySelector("p")) resolve();
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
      chrome.runtime.sendMessage({ type: "WA_STATS", payload: sample }, () => {});
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
