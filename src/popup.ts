function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function showStatus(text: string) {
  console.log("SHOWING STATUS:", text);
  const status = $("status");
  const content = $("content");
  if (status) {
    status.style.display = "block";
    status.innerHTML = text;
  }
  if (content) content.style.display = "none";
}

function showContent() {
  console.log("SHOWING CONTENT");
  const status = $("status");
  const content = $("content");
  if (status) status.style.display = "none";
  if (content) content.style.display = "block";
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

function displayData(stats: any) {
  console.log("DISPLAYING DATA:", stats);
  showContent();

  // Title & author
  const titleEl = $("title");
  const authorEl = $("author");
  if (titleEl) titleEl.textContent = stats.title || "Untitled Story";
  if (authorEl) authorEl.textContent = stats.author ? `by ${stats.author}` : "by Unknown Author";

  // Stats cards
  const readsEl = $("reads");
  const votesEl = $("votes");
  const headerCommentsEl = $("headerComments");
  const commentItemsCountEl = $("commentItemsCount");
  if (readsEl) readsEl.textContent = formatNumber(stats.reads);
  if (votesEl) votesEl.textContent = formatNumber(stats.votes);
  if (headerCommentsEl) headerCommentsEl.textContent = formatNumber(stats.headerComments);
  if (commentItemsCountEl) commentItemsCountEl.textContent = formatNumber(stats.commentItemsCount);

  // Calculate engagement
  const engagementRate = stats.reads && stats.votes && stats.reads > 0
    ? ((stats.votes / stats.reads) * 100).toFixed(2) + "%"
    : "—";
  const commentRatio = stats.reads && stats.headerComments && stats.reads > 0
    ? ((stats.headerComments / stats.reads) * 100).toFixed(2) + "%"
    : "—";

  const engagementEl = $("engagementRate");
  const commentRatioEl = $("commentRatio");
  if (engagementEl) engagementEl.textContent = engagementRate;
  if (commentRatioEl) commentRatioEl.textContent = commentRatio;

  // Display top hits
  const topHitsList = $("topHitsList");
  if (topHitsList && stats.paragraphComments) {
    topHitsList.innerHTML = "";
    const top = [...stats.paragraphComments]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 3);

    top.forEach((p, index) => {
      const li = document.createElement("li");
      const count = p.count ?? 0;
      const snippet = firstN(p.snippet || p.raw);
      li.setAttribute("data-rank", `#${index + 1}`);
      li.innerHTML = `<strong>${count} comment${count === 1 ? "" : "s"}:</strong> "${snippet}"`;
      if (index === 0) li.classList.add("top-hit"); // Top hit with star
      else if (count < 5) li.classList.add("revise"); // Low engagement flag
      if (topHitsList) topHitsList.appendChild(li);
    });
  }

  // Custom chart to match image
  const canvas = $("commentsChart");
  if (canvas instanceof HTMLCanvasElement && stats.paragraphComments && canvas) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDark = document.body.classList.contains("dark-theme");
      const textColor = isDark ? "#e2e8f0" : "#4a5568";
      const gridColor = isDark ? "#4a5568" : "#e2e8f0";
      const accentColor = isDark ? "#26a69a" : "#26a69a";

      // Title
      ctx.fillStyle = accentColor;
      ctx.font = "14px Arial";
      ctx.fillText("Comment Distribution", 10, 20);

      // Axes and grid
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 20);
      ctx.lineTo(30, canvas.height - 30);
      ctx.lineTo(canvas.width - 10, canvas.height - 30);
      ctx.stroke();

      // Grid lines and labels
      const maxCount = Math.max(...stats.paragraphComments.map((p: any) => p.count ?? 0));
      for (let i = 0; i <= 5; i++) {
        const y = canvas.height - 30 - (i / 5) * (canvas.height - 60);
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(canvas.width - 10, y);
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.fillText((maxCount * i / 5).toFixed(0), 5, y);
      }
      for (let i = 0; i < 15; i++) {
        const x = 30 + i * 25;
        ctx.fillText(`P${i + 1}`, x, canvas.height - 15);
      }

      // Bars with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "rgba(38, 166, 154, 0.8)");
      gradient.addColorStop(1, "rgba(38, 166, 154, 0.3)");
      stats.paragraphComments.slice(0, 15).forEach((p: any, i: number) => {
        const height = maxCount > 0 ? (p.count ?? 0) / maxCount * 120 : 0;
        const x = 30 + i * 25;
        const y = canvas.height - 30 - height;
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, 20, height);
        ctx.fillStyle = textColor;
        ctx.font = "10px Arial";
      });
    }
  }

  // Display paragraphs
  const paragraphsList = $("paragraphsList");
  if (paragraphsList && stats.paragraphComments) {
    paragraphsList.innerHTML = "";
    stats.paragraphComments.forEach((p: any) => {
      const div = document.createElement("div");
      div.classList.add("para");
      const count = p.count ?? 0;
      const snippet = firstN(p.snippet || p.raw);
      div.innerHTML = `<strong>P${stats.paragraphComments.indexOf(p) + 1}:</strong> ${count} comment${count === 1 ? "" : "s"} - "${snippet}"`;
      if (count > 5) div.classList.add("highlight");
      else if (count < 2) div.classList.add("boost");
      if (paragraphsList) paragraphsList.appendChild(div);
    });
  }

  // Analytics suggestion
  const suggestionEl = $("analyticsSuggestion");
  if (suggestionEl && stats.paragraphComments) {
    const minCountIndex = stats.paragraphComments.reduce((minIndex: number, p: any, i: number, arr: any[]) =>
      (p.count ?? 0) < (arr[minIndex].count ?? 0) ? i : minIndex, 0);
    if (suggestionEl) suggestionEl.textContent = minCountIndex >= 0 ? `_P${minCountIndex + 1} needs a twist!_` : "Keep writing!";
  }

  console.log("DATA DISPLAY COMPLETE!");
}

function loadData() {
  console.log("LOADING DATA FROM STORAGE...");
  showStatus("🔄 Loading analytics...");
  
  try {
    chrome.storage.local.get(["writerAnalyticsStats"], function(result) {
      console.log("STORAGE RESULT:", result);
      
      if (chrome.runtime.lastError) {
        console.error("STORAGE ERROR:", chrome.runtime.lastError);
        showStatus("❌ Storage Error");
        return;
      }
      
      const stats = result.writerAnalyticsStats;
      
      if (!stats) {
        showStatus(`
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 32px;">📝</div>
            <div><strong>No Data Found</strong></div>
            <div style="font-size: 12px; color: #666;">Visit a Wattpad story page first!</div>
          </div>
        `);
        return;
      }
      
      console.log("CALLING DISPLAY DATA...");
      displayData(stats);
    });
  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);
    showStatus("❌ Critical Error: " + error.message);
  }
}

// Theme toggle
function initTheme() {
  const themeToggle = $("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function() {
      const isDark = document.body.classList.toggle("dark-theme");
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) {
        icon.textContent = isDark ? "☀️" : "🌙";
      }
      // Re-render chart with new theme
      const canvas = $("commentsChart");
      if (canvas instanceof HTMLCanvasElement) {
        const ctx = canvas.getContext("2d");
        if (ctx) displayData({ paragraphComments: [] }); // Trigger chart redraw
      }
    });
  }
}

// Initialize
console.log("POPUP SCRIPT STARTING...");

document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM LOADED!");
  initTheme();
  setTimeout(loadData, 100);
});

// Emergency fallback
setTimeout(function() {
  console.log("EMERGENCY FALLBACK CHECK");
  if ($("status")?.textContent?.includes("Loading")) {
    console.log("STILL LOADING, RETRYING...");
    loadData();
  }
}, 2000);