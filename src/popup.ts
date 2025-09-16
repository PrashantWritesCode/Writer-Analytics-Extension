
function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function firstN(text: string | undefined | null, n = 120) {
  if (!text) return "";
  const s = text.trim().replace(/\s+/g, " ");
  return s.length <= n ? s : s.slice(0, n).trim() + "…";
}

function showStatus(text: string, visible = true) {
  const s = $("status");
  if (!s) return;
  s.innerHTML = text;
  s.style.display = visible ? "block" : "none";
}

function displayData(stats: StoryStats) {
  showStatus("", false);

  const titleEl = $("title");
  const authorEl = $("author");
  if (titleEl) titleEl.textContent = stats.title || "Untitled Story";
  if (authorEl) authorEl.textContent = stats.author ? `by ${stats.author}` : "by Unknown Author";

  const readsEl = $("reads");
  const votesEl = $("votes");
  const headerCommentsEl = $("headerComments");
  const paragraphsCountEl = $("paragraphsCount");

  if (readsEl) readsEl.textContent = formatNumber(stats.reads);
  if (votesEl) votesEl.textContent = formatNumber(stats.votes);
  if (headerCommentsEl) headerCommentsEl.textContent = formatNumber(stats.headerComments);
  if (paragraphsCountEl) paragraphsCountEl.textContent = formatNumber(stats.commentItemsCount);

  const engagementEl = $("engagementRate");
  const commentRatioEl = $("commentRatio");
  const engagementRate = stats.reads && stats.votes && stats.reads > 0 ? ((stats.votes! / stats.reads!) * 100).toFixed(2) + "%" : "—";
  const commentRatio = stats.reads && stats.headerComments && stats.reads > 0 ? ((stats.headerComments! / stats.reads!) * 100).toFixed(2) + "%" : "—";
  if (engagementEl) engagementEl.textContent = engagementRate;
  if (commentRatioEl) commentRatioEl.textContent = commentRatio;

  // Top hits
  const topHitsList = $("topHitsList");
  if (topHitsList) {
    topHitsList.innerHTML = "";
    if (stats.paragraphComments && stats.paragraphComments.length > 0) {
      const top = [...stats.paragraphComments].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 3);
      top.forEach((p) => {
        const li = document.createElement("li");
        const snippet = firstN(p.snippet || p.raw || "", 80);
        const count = p.count ?? 0;
        li.innerHTML = `<span>${snippet}</span><span class="comment-badge">💬 ${count} comments</span>`;
        topHitsList.appendChild(li);
      });
    } else {
      topHitsList.innerHTML = `<li style="opacity:.7">No paragraph-level comments found</li>`;
    }
  }

  // Paragraphs
  const paragraphsList = $("paragraphsList");
  if (paragraphsList) {
    paragraphsList.innerHTML = "";
    if (stats.paragraphComments && stats.paragraphComments.length > 0) {
      stats.paragraphComments.forEach((p) => {
        const div = document.createElement("div");
        div.className = "para";
        const snippet = firstN(p.snippet || p.raw || "", 90);
        const count = p.count ?? 0;
        div.innerHTML = `<span>${snippet}</span><span class="comment-badge">💬 ${count} comments</span>`;
        if (count > 5) div.classList.add("highlight");
        paragraphsList.appendChild(div);
      });
    } else {
      paragraphsList.innerHTML = `<div style="padding:8px;opacity:.7">No paragraphs available</div>`;
    }
  }
}

// load latest cached stats (search keys writerAnalyticsStats-*)
function loadCachedLatest(callback: (stats: StoryStats | null) => void) {
  chrome.storage.local.get(null, (result) => {
    const keys = Object.keys(result).filter(k => k.startsWith("writerAnalyticsStats-"));
    if (keys.length === 0) {
      callback(null);
      return;
    }
    // prefer latest by capturedAt if available
    let chosen: StoryStats | null = null;
    let chosenKey = keys[0];
    keys.forEach(k => {
      const s = result[k];
      if (!s) return;
      if (!chosen) {
        chosen = s;
        chosenKey = k;
        return;
      }
      try {
        const a = s.capturedAt ? new Date(s.capturedAt).getTime() : 0;
        const b = chosen.capturedAt ? new Date(chosen.capturedAt).getTime() : 0;
        if (a > b) {
          chosen = s;
          chosenKey = k;
        }
      } catch {
        // fallback: pick last key
        chosen = s;
        chosenKey = k;
      }
    });
    callback(chosen);
  });
}

function loadData(forceRefresh = false) {
  showStatus("🔄 Loading analytics...", true);

  if (forceRefresh) {
    chrome.runtime.sendMessage({ type: "WA_REFRESH" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Refresh request error:", chrome.runtime.lastError.message);
        // fallback to cached
        loadCachedLatest((s) => {
          if (s) displayData(s);
          else showStatus("No data found (refresh failed).", true);
        });
        return;
      }

      if (response && response.payload) {
        displayData(response.payload);
      } else {
        loadCachedLatest((s) => {
          if (s) displayData(s);
          else showStatus("No data found after refresh.", true);
        });
      }
    });
  } else {
    loadCachedLatest((s) => {
      if (s) displayData(s);
      else showStatus("Visit a Wattpad story page and let the extension collect data.", true);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // initial load
  setTimeout(() => loadData(false), 80);

  // refresh button
  $("refresh-btn")?.addEventListener("click", () => {
    loadData(true);
  });

  // export
  $("export-btn")?.addEventListener("click", () => {
    chrome.storage.local.get(null, (result) => {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "writer-analytics.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  });
});
