import html2canvas from "html2canvas";

/* ---------------------------------------------
   Helper DOM Utilities
--------------------------------------------- */
function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function formatNumber(num: number | null | undefined): string {
  if (num == null) return "—";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

function firstN(text?: string | null, n = 120): string {
  if (!text) return "";
  const s = text.trim().replace(/\s+/g, " ");
  return s.length <= n ? s : s.slice(0, n).trim() + "…";
}

function showStatus(text: string, show = true): void {
  const el = $("status");
  if (!el) return;
  el.textContent = text;
  el.style.display = show ? "block" : "none";
}

function svgCommentIcon(): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}

/* ---------------------------------------------
   DOM Author Detection
--------------------------------------------- */
function getAuthorFromDom(): string | null {
  const strongEl = document.querySelector(".author-info .info strong");
  if (strongEl?.textContent) return strongEl.textContent.trim();

  const selectors = [
    ".author-info a.on-navigate",
    ".author.hidden-lg a.on-navigate",
    ".author a.on-navigate",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent) return el.textContent.replace(/^by\s*/i, "").trim();
  }
  return null;
}

/* ---------------------------------------------
   Types
--------------------------------------------- */
type ParagraphComment = {
  pId?: number;
  count?: number;
  snippet?: string;
  raw?: string;
};

type StoryStats = {
  title?: string;
  author?: string;
  reads?: number;
  votes?: number;
  headerComments?: number;
  commentItemsCount?: number;
  paragraphComments?: ParagraphComment[];
  capturedAt?: string | null;
};

/* ---------------------------------------------
   Rendering Functions
--------------------------------------------- */
function renderTopHits(paragraphs: ParagraphComment[] = []): void {
  const topHitsList = $("topHitsList");
  if (!topHitsList) return;
  topHitsList.innerHTML = "";

  const sorted = [...paragraphs].sort(
    (a, b) => (b.count ?? 0) - (a.count ?? 0)
  );
  const top = sorted.slice(0, 3);

  if (top.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No top moments yet.";
    topHitsList.appendChild(li);
    return;
  }

  top.forEach((p, index) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.className = "top-hits-left";

    const medal = document.createElement("div");
    medal.className = "medal";

    const medalImg = document.createElement("img");
    medalImg.src =
      index === 0
        ? "assets/gold.png"
        : index === 1
        ? "assets/silver.png"
        : "assets/bronze.png";
    medalImg.alt = `Rank ${index + 1}`;
    medal.appendChild(medalImg);

    const txt = document.createElement("div");
    txt.className = "hit-text";
    txt.textContent = firstN(p.snippet || p.raw || `P${p.pId}`, 120);

    left.appendChild(medal);
    left.appendChild(txt);

    const badge = document.createElement("div");
    badge.className = "comment-badge";
    const countNum = p.count ?? 0;
    badge.innerHTML = `${svgCommentIcon()} ${countNum} comment${
      countNum === 1 ? "" : "s"
    }`;

    li.appendChild(left);
    li.appendChild(badge);
    topHitsList.appendChild(li);
  });
}

function renderParagraphs(paragraphs: ParagraphComment[] = []): void {
  const container = $("paragraphsList");
  if (!container) return;
  container.innerHTML = "";

  if (!paragraphs.length) {
    const div = document.createElement("div");
    div.style.padding = "8px";
    div.style.opacity = "0.7";
    div.textContent = "No paragraphs available";
    container.appendChild(div);
    return;
  }

  paragraphs.forEach((p) => {
    const row = document.createElement("div");
    row.className = "para";

    const left = document.createElement("div");
    left.className = "para-left";
    left.textContent = firstN(p.snippet || p.raw || `P${p.pId}`, 140);

    const rightWrap = document.createElement("div");
    rightWrap.className = "para-badge";

    const badge = document.createElement("div");
    badge.className = "comment-badge";
    const cnt = p.count ?? 0;
    badge.innerHTML = `${svgCommentIcon()} ${cnt} comment${
      cnt === 1 ? "" : "s"
    }`;

    rightWrap.appendChild(badge);
    row.appendChild(left);
    row.appendChild(rightWrap);

    if ((p.count ?? 0) > 5) row.classList.add("highlight");
    container.appendChild(row);
  });
}

/* ---------------------------------------------
   Data Handling
--------------------------------------------- */
async function loadCachedLatest(): Promise<StoryStats | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (all) => {
      const keys = Object.keys(all).filter((k) =>
        k.startsWith("writerAnalyticsStats-")
      );
      if (!keys.length) return resolve(null);

      const latest = keys
        .map((k) => all[k] as StoryStats)
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.capturedAt || 0).getTime() -
            new Date(a.capturedAt || 0).getTime()
        )[0];
      resolve(latest || null);
    });
  });
}

/* ---------------------------------------------
   Empty / Sample State
--------------------------------------------- */
function showEmptyState(): void {
  const empty = $("empty-state");
  const analytics = $("analytics-ui");
  const home = $("home-screen");

  if (analytics) analytics.style.display = "none";
  if (home) home.style.display = "none";
  if (empty) {
    empty.style.display = "flex";
    empty.style.opacity = "1";
  }
}

function hideEmptyState(): void {
  const empty = $("empty-state");
  if (empty) empty.style.display = "none";
}

/* Sample demo data for preview */
const SAMPLE_STORY: StoryStats = {
  title: "The Light Beyond Shadows",
  author: "Ava Winters",
  reads: 12800,
  votes: 3200,
  headerComments: 480,
  commentItemsCount: 42,
  paragraphComments: [
    {
      pId: 1,
      count: 16,
      snippet: "The night whispered secrets only she could hear.",
    },
    {
      pId: 2,
      count: 12,
      snippet: "His eyes met hers — and time ceased to exist.",
    },
    {
      pId: 3,
      count: 9,
      snippet: "Rain kissed the window like a promise unfulfilled.",
    },
  ],
  capturedAt: new Date().toISOString(),
};

/* ---------------------------------------------
   Data Rendering
--------------------------------------------- */
function displayData(stats: StoryStats | null): void {
  if (!stats) {
    showEmptyState();
    showStatus("No story loaded.", true);
    return;
  }

  hideEmptyState();
  showStatus("", false);

  const titleEl = $("title");
  const authorEl = $("author");
  if (titleEl) titleEl.textContent = stats.title || "Untitled Story";
  const authorName = stats.author || getAuthorFromDom() || "Unknown Author";
  if (authorEl) authorEl.textContent = `by ${authorName}`;

  $("reads")!.textContent = formatNumber(stats.reads);
  $("votes")!.textContent = formatNumber(stats.votes);
  $("headerComments")!.textContent = formatNumber(stats.headerComments);
  $("commentItemsCount")!.textContent = String(stats.commentItemsCount ?? "—");

  $("engagementRate")!.textContent =
    stats.reads && stats.votes
      ? ((stats.votes / stats.reads) * 100).toFixed(2) + "%"
      : "—";

  $("commentRatio")!.textContent =
    stats.reads && stats.headerComments
      ? ((stats.headerComments / stats.reads) * 100).toFixed(2) + "%"
      : "—";

  renderTopHits(stats.paragraphComments ?? []);
  renderParagraphs(stats.paragraphComments ?? []);
}

/* ---------------------------------------------
   Data Refresh & Export
--------------------------------------------- */
function refreshData(): void {
  showStatus("🔄 Refreshing...", true);
  chrome.runtime.sendMessage({ type: "WA_REFRESH" }, (resp) => {
    if (chrome.runtime.lastError) {
      loadCachedLatest().then(displayData);
      return;
    }
    if (resp?.payload) displayData(resp.payload as StoryStats);
    else loadCachedLatest().then(displayData);
    showStatus("", false);
  });
}

function setupExportButton(): void {
  const exportBtn = $("export-btn");
  if (!exportBtn) return;

  exportBtn.addEventListener("click", async () => {
    const exportArea = $("export-area");
    if (!exportArea) return alert("Nothing to export");

    const canvas = await html2canvas(exportArea, {
      backgroundColor: "#fff",
      scale: 2,
      useCORS: true,
    });

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "story-analytics.png";
    a.click();
  });
}

/* ---------------------------------------------
   Navigation
--------------------------------------------- */
function showAnalytics(): void {
  const home = $("home-screen");
  const analytics = $("analytics-ui");
  const empty = $("empty-state");

  if (home) home.style.display = "none";
  if (empty) empty.style.display = "none";

  if (analytics) {
    analytics.style.display = "block";
    analytics.style.opacity = "1";
  }
}

function showHome(): void {
  const home = $("home-screen");
  const analytics = $("analytics-ui");
  const empty = $("empty-state");

  if (analytics) analytics.style.display = "none";
  if (empty) empty.style.display = "none";

  if (home) {
    home.style.display = "flex";
    home.style.opacity = "1";
  }
}

function setupStoryAnalyticsButton(): void {
  const btn = $("open-analytics");
  if (!btn) return;
  btn.addEventListener("click", () => {
    showAnalytics();
    refreshData();
  });
}

function setupBackButton(): void {
  const backBtn = $("back-to-home");
  if (!backBtn) return;
  backBtn.addEventListener("click", showHome);
}

/* ---------------------------------------------
   Feedback
--------------------------------------------- */
function setupFeedbackButton(): void {
  const openForm = () =>
    chrome.tabs.create({ url: "https://forms.gle/JEBaepXGLnaufZPn9" });

  ["feedback-btn", "feedback-btn-bottom", "feedback-btn-home"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("click", openForm);
  });
}

/* ---------------------------------------------
   Sample Story Button (New)
--------------------------------------------- */
function setupSampleStoryButton(): void {
  const btn = $("sample-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    showAnalytics();
    displayData(SAMPLE_STORY);
  });
}

/* ---------------------------------------------
   Initialization
--------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  showHome();
  setupStoryAnalyticsButton();
  setupExportButton();
  setupFeedbackButton();
  setupBackButton();
  setupSampleStoryButton();

  const refreshBtn = $("refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", refreshData);
});
