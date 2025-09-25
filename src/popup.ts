import html2canvas from "html2canvas";  // ✅ Import html2canvas

function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function firstN(text: string | undefined | null, n = 120) {
  if (!text) return "";
  const s = text.trim().replace(/\s+/g, " ");
  return s.length <= n ? s : s.slice(0, n).trim() + "…";
}

function showStatus(text: string, show = true) {
  const el = $("status");
  if (!el) return;
  el.textContent = text;
  el.style.display = show ? "block" : "none";
}

function svgCommentIcon(): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}

/* ------------------ Author Fix ------------------ */
function getAuthorFromDom(): string | null {
  const strongEl = document.querySelector(".author-info .info strong");
  if (strongEl && strongEl.textContent) {
    return strongEl.textContent.trim();
  }

  const selectors = [
    ".author-info a.on-navigate",
    ".author.hidden-lg a.on-navigate",
    ".author a.on-navigate",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent) {
      return el.textContent.replace(/^by\s*/i, "").trim();
    }
  }

  return null;
}

/* ------------------ Render Top Moments ------------------ */
function renderTopHits(paragraphs: ParagraphComment[] = []) {
  const topHitsList = $("topHitsList");
  if (!topHitsList) return;
  topHitsList.innerHTML = "";

  const sorted = [...(paragraphs || [])].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  const top = sorted.slice(0, 3);

  top.forEach((p, index) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.className = "top-hits-left";

    const medal = document.createElement("div");
    medal.className = "medal";

    const medalImg = document.createElement("img");
    if (index === 0) medalImg.src = "assets/gold.png";
    else if (index === 1) medalImg.src = "assets/silver.png";
    else medalImg.src = "assets/bronze.png";
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
    badge.innerHTML = `${svgCommentIcon()} ${countNum} comment${countNum === 1 ? "" : "s"}`;

    li.appendChild(left);
    li.appendChild(badge);

    topHitsList.appendChild(li);
  });

  if (top.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No top moments yet.";
    topHitsList.appendChild(li);
  }
}

/* ------------------ Render All Paragraphs ------------------ */
function renderParagraphs(paragraphs: ParagraphComment[] = []) {
  const container = $("paragraphsList");
  if (!container) return;
  container.innerHTML = "";

  if (!paragraphs || paragraphs.length === 0) {
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
    badge.innerHTML = `${svgCommentIcon()} ${cnt} comment${cnt === 1 ? "" : "s"}`;

    rightWrap.appendChild(badge);
    row.appendChild(left);
    row.appendChild(rightWrap);

    if ((p.count ?? 0) > 5) row.classList.add("highlight");
    container.appendChild(row);
  });
}

/* ------------------ Cache & Display ------------------ */
function loadCachedLatest(): Promise<StoryStats | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (all) => {
      const keys = Object.keys(all).filter((k) => k.startsWith("writerAnalyticsStats-"));
      if (keys.length === 0) {
        resolve(null);
        return;
      }
      let chosen: StoryStats | null = null;
      for (const k of keys) {
        const s = all[k] as StoryStats;
        if (!s) continue;
        if (!chosen) {
          chosen = s;
          continue;
        }
        if (s.capturedAt && chosen.capturedAt) {
          if (new Date(s.capturedAt).getTime() > new Date(chosen.capturedAt || 0).getTime())
            chosen = s;
        }
      }
      resolve(chosen);
    });
  });
}

function displayData(stats: StoryStats | null) {
  if (!stats) {
    showStatus("No data found. Visit a Wattpad story and refresh.", true);
    renderTopHits([]);
    renderParagraphs([]);
    return;
  }

  showStatus("", false);

  const titleEl = $("title");
  const authorEl = $("author");

  if (titleEl) titleEl.textContent = stats.title || "Untitled Story";

  let authorName = stats.author;
  if (!authorName || authorName === "Unknown Author") {
    authorName = getAuthorFromDom();
  }

  if (authorEl) authorEl.textContent = authorName ? `by ${authorName}` : "by Unknown Author";

  const readsEl = $("reads");
  const votesEl = $("votes");
  const headerCommentsEl = $("headerComments");
  const commentItemsEl = $("commentItemsCount");
  if (readsEl) readsEl.textContent = formatNumber(stats.reads ?? null);
  if (votesEl) votesEl.textContent = formatNumber(stats.votes ?? null);
  if (headerCommentsEl) headerCommentsEl.textContent = formatNumber(stats.headerComments ?? null);
  if (commentItemsEl) commentItemsEl.textContent = String(stats.commentItemsCount ?? "—");

  const engagementEl = $("engagementRate");
  const commentRatioEl = $("commentRatio");
  if (engagementEl)
    engagementEl.textContent =
      stats.reads && stats.votes && stats.reads > 0
        ? ((stats.votes! / stats.reads!) * 100).toFixed(2) + "%"
        : "—";
  if (commentRatioEl)
    commentRatioEl.textContent =
      stats.reads && stats.headerComments && stats.reads > 0
        ? ((stats.headerComments! / stats.reads!) * 100).toFixed(2) + "%"
        : "—";

  renderTopHits(stats.paragraphComments ?? []);
  renderParagraphs(stats.paragraphComments ?? []);
}

/* ------------------ Refresh ------------------ */
function refreshData() {
  showStatus("🔄 Refreshing...", true);
  chrome.runtime.sendMessage({ type: "WA_REFRESH" }, (resp) => {
    if (chrome.runtime.lastError) {
      loadCachedLatest().then((s) => {
        displayData(s);
        showStatus("", false);
      });
      return;
    }
    if (resp && resp.payload) {
      displayData(resp.payload as StoryStats);
      showStatus("", false);
    } else {
      loadCachedLatest().then((s) => {
        displayData(s);
        showStatus("", false);
      });
    }
  });
}

/* ------------------ Export PNG ------------------ */
function setupExportButton() {
  const exportBtn = $("export-btn");
  if (!exportBtn) return;
  exportBtn.addEventListener("click", async () => {
    const exportArea = document.getElementById("export-area");
    if (!exportArea) return alert("Nothing to export");

    try {
      const canvas = await html2canvas(exportArea as HTMLElement, {
        backgroundColor: null,
        scale: 2,
      });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "story-analytics.png";
      a.click();
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed — check console.");
    }
  });
}

/* ------------------ Refresh btn ------------------ */
function setupRefreshButton() {
  const btn = $("refresh-btn");
  if (!btn) return;
  btn.addEventListener("click", () => refreshData());
}

/* ------------------ Analyze btn ------------------ */
function setupAnalyzeButton() {
  const btn = $("analyze-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const analyzeScreen = $("analyze-screen");
    const analyticsUI = $("analytics-ui");

    if (analyzeScreen) analyzeScreen.style.display = "none";
    if (analyticsUI) analyticsUI.style.display = "block";

    // Switch body to full analytics mode
    document.body.classList.remove("analyze-mode");

    refreshData(); // load stats after showing analytics
  });
}

/* ------------------ Init ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  // Start in compact mode for Analyze screen
  document.body.classList.add("analyze-mode");

  setupAnalyzeButton();
  setupExportButton();
  setupRefreshButton();
  // don’t load stats immediately; wait until Analyze is clicked
});
