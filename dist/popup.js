// src/popup.ts
function $(id) {
  return document.getElementById(id);
}
function showStatus(text) {
  console.log("SHOWING STATUS:", text);
  const status = $("status");
  const content = $("content");
  if (status) {
    status.style.display = "block";
    status.innerHTML = text;
  }
  if (content)
    content.style.display = "none";
}
function showContent() {
  console.log("SHOWING CONTENT");
  const status = $("status");
  const content = $("content");
  if (status)
    status.style.display = "none";
  if (content)
    content.style.display = "block";
}
function formatNumber(num) {
  if (num === null || num === void 0)
    return "\u2014";
  if (num >= 1e6)
    return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3)
    return (num / 1e3).toFixed(1) + "K";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function displayData(stats) {
  console.log("DISPLAYING DATA:", stats);
  showContent();
  const titleEl = $("title");
  const authorEl = $("author");
  if (titleEl)
    titleEl.textContent = stats.title || "Untitled Story";
  if (authorEl)
    authorEl.textContent = stats.author ? `by ${stats.author}` : "by Unknown Author";
  const readsEl = $("reads");
  const votesEl = $("votes");
  const headerCommentsEl = $("headerComments");
  const commentItemsCountEl = $("commentItemsCount");
  if (readsEl)
    readsEl.textContent = formatNumber(stats.reads);
  if (votesEl)
    votesEl.textContent = formatNumber(stats.votes);
  if (headerCommentsEl)
    headerCommentsEl.textContent = formatNumber(stats.headerComments);
  if (commentItemsCountEl)
    commentItemsCountEl.textContent = formatNumber(stats.commentItemsCount);
  const engagementRate = stats.reads && stats.votes && stats.reads > 0 ? (stats.votes / stats.reads * 100).toFixed(2) + "%" : "\u2014";
  const commentRatio = stats.reads && stats.headerComments && stats.reads > 0 ? (stats.headerComments / stats.reads * 100).toFixed(2) + "%" : "\u2014";
  const engagementEl = $("engagementRate");
  const commentRatioEl = $("commentRatio");
  if (engagementEl)
    engagementEl.textContent = engagementRate;
  if (commentRatioEl)
    commentRatioEl.textContent = commentRatio;
  const topList = $("topList");
  if (topList && stats.paragraphComments) {
    topList.innerHTML = "";
    const top = [...stats.paragraphComments].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 3);
    top.forEach((p) => {
      const li = document.createElement("li");
      const count = p.count ?? 0;
      const snippet = (p.snippet || p.raw || "").substring(0, 80) + "...";
      li.innerHTML = `<strong>${count} comments:</strong> "${snippet}"`;
      topList.appendChild(li);
    });
  }
  const canvas = $("commentsChart");
  if (canvas instanceof HTMLCanvasElement && stats.paragraphComments) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#26a69a";
      ctx.font = "16px Arial";
      ctx.fillText("\u{1F4CA} Comment Distribution", 20, 30);
      const maxCount = Math.max(...stats.paragraphComments.map((p) => p.count || 0));
      stats.paragraphComments.slice(0, 15).forEach((p, i) => {
        const height = Math.max((p.count || 0) / maxCount * 80, 2);
        const x = 25 + i * 25;
        const y = 120 - height;
        ctx.fillStyle = "#26a69a";
        ctx.fillRect(x, y, 20, height);
        ctx.fillStyle = "#666";
        ctx.font = "10px Arial";
        ctx.fillText(`P${i + 1}`, x, 135);
      });
    }
  }
  console.log("DATA DISPLAY COMPLETE!");
}
function loadData() {
  console.log("LOADING DATA FROM STORAGE...");
  showStatus("\u{1F504} Loading analytics...");
  try {
    chrome.storage.local.get(["writerAnalyticsStats"], function(result) {
      console.log("STORAGE RESULT:", result);
      if (chrome.runtime.lastError) {
        console.error("STORAGE ERROR:", chrome.runtime.lastError);
        showStatus("\u274C Storage Error");
        return;
      }
      const stats = result.writerAnalyticsStats;
      if (!stats) {
        showStatus(`
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 32px;">\u{1F4DD}</div>
            <div><strong>No Data Found</strong></div>
            <div style="font-size: 12px; color: #666;">Visit a Wattpad story page first!</div>
          </div>
        `);
        return;
      }
      console.log("CALLING DISPLAY DATA...");
      displayData(stats);
    });
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    showStatus("\u274C Critical Error: " + error.message);
  }
}
function initTheme() {
  const themeToggle = $("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function() {
      document.body.classList.toggle("dark-theme");
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) {
        icon.textContent = document.body.classList.contains("dark-theme") ? "\u2600\uFE0F" : "\u{1F319}";
      }
    });
  }
}
console.log("POPUP SCRIPT STARTING...");
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM LOADED!");
  initTheme();
  setTimeout(loadData, 100);
});
setTimeout(function() {
  console.log("EMERGENCY FALLBACK CHECK");
  if ($("status")?.textContent?.includes("Loading")) {
    console.log("STILL LOADING, RETRYING...");
    loadData();
  }
}, 2e3);
//# sourceMappingURL=popup.js.map
