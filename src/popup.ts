// import Chart from "chart.js/auto";

// type ParagraphComment = {
//   pId: string;
//   count: number | null;
//   raw?: string;
//   snippet?: string;
// };

// type StoryStats = {
//   title?: string | null;
//   author?: string | null;
//   reads?: number | null;
//   votes?: number | null;
//   headerComments?: number | null;
//   commentItemsCount?: number;
//   paragraphComments?: ParagraphComment[];
//   capturedAt?: string;
//   wordCount?: number;
// };

// function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
//   return document.getElementById(id) as T | null;
// }

// function showStatus(text: string) {
//   const status = $("status");
//   const content = $("content");
//   if (status) {
//     status.style.display = "block";
//     status.textContent = text;
//   }
//   if (content) content.style.display = "none";
// }

// function showContent() {
//   const status = $("status");
//   const content = $("content");
//   if (status) status.style.display = "none";
//   if (content) content.style.display = "block";
// }

// function formatNumber(num: number | null | undefined): string {
//   if (num === null || num === undefined) return "—";
//   if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
//   if (num >= 1000) return (num / 1000).toFixed(1) + "K";
//   return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
// }

// function firstN(text: string | undefined | null, n = 120) {
//   if (!text) return "";
//   const s = text.trim().replace(/\s+/g, " ");
//   return s.length <= n ? s : s.slice(0, n).trim() + "…";
// }

// let chart: Chart | null = null;

// // Theme handling
// function initTheme() {
//   const themeToggle = $("theme-toggle");
//   const themeIcon = themeToggle?.querySelector(".theme-icon");
  
//   // Load saved theme
//   chrome.storage.local.get(["theme"], (result) => {
//     const isDark = result.theme === "dark";
//     document.body.classList.toggle("dark-theme", isDark);
//     if (themeIcon) themeIcon.textContent = isDark ? "☀️" : "🌙";
//   });

//   // Theme toggle handler
//   themeToggle?.addEventListener("click", () => {
//     const isDark = document.body.classList.toggle("dark-theme");
//     if (themeIcon) themeIcon.textContent = isDark ? "☀️" : "🌙";
//     chrome.storage.local.set({ theme: isDark ? "dark" : "light" });
    
//     // Update chart colors if exists
//     if (chart) {
//       updateChartTheme();
//     }
//   });
// }

// function updateChartTheme() {
//   if (!chart) return;
  
//   const isDark = document.body.classList.contains("dark-theme");
//   const textColor = isDark ? "#e2e8f0" : "#4a5568";
//   const gridColor = isDark ? "#4a5568" : "#e2e8f0";
  
//   if (chart.options.scales?.x?.ticks) chart.options.scales.x.ticks.color = textColor;
//   if (chart.options.scales?.y?.ticks) chart.options.scales.y.ticks.color = textColor;
//   if (chart.options.scales?.x?.grid) chart.options.scales.x.grid.color = gridColor;
//   if (chart.options.scales?.y?.grid) chart.options.scales.y.grid.color = gridColor;
  
//   chart.update();
// }

// function renderChart(paragraphs: ParagraphComment[]) {
//   const canvas = $("commentsChart");
//   if (!(canvas instanceof HTMLCanvasElement)) {
//     console.warn("Chart creation failed: canvas element not found or invalid.");
//     return;
//   }

//   const ctx = canvas.getContext("2d");
//   if (!ctx) {
//     console.warn("Chart creation failed: unable to get 2d context.");
//     return;
//   }

//   if (paragraphs.length === 0) {
//     if (chart) {
//       chart.destroy();
//       chart = null;
//     }
//     ctx.fillStyle = "#888";
//     ctx.textAlign = "center";
//     ctx.fillText("No paragraph data available", canvas.width / 2, canvas.height / 2);
//     return;
//   }

//   if (chart) chart.destroy();

//   const isDark = document.body.classList.contains("dark-theme");
//   const textColor = isDark ? "#e2e8f0" : "#4a5568";
//   const gridColor = isDark ? "#4a5568" : "#e2e8f0";

//   chart = new Chart(ctx, {
//     type: "bar",
//     data: {
//       labels: paragraphs.map((_, i) => `P${i + 1}`),
//       datasets: [
//         {
//           label: "Comments",
//           data: paragraphs.map((p) => p.count ?? 0),
//           backgroundColor: "rgba(38, 166, 154, 0.6)",
//           borderColor: "rgba(38, 166, 154, 1)",
//           borderWidth: 2,
//           borderRadius: 4,
//         },
//       ],
//     },
//     options: {
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: { 
//           display: false 
//         },
//         tooltip: {
//           backgroundColor: isDark ? "#2d3748" : "#ffffff",
//           titleColor: textColor,
//           bodyColor: textColor,
//           borderColor: isDark ? "#4a5568" : "#e2e8f0",
//           borderWidth: 1,
//         },
//       },
//       scales: {
//         x: { 
//           ticks: { 
//             maxRotation: 45, 
//             minRotation: 0,
//             color: textColor,
//           },
//           grid: {
//             color: gridColor,
//           }
//         },
//         y: { 
//           beginAtZero: true,
//           ticks: {
//             color: textColor,
//           },
//           grid: {
//             color: gridColor,
//           }
//         },
//       },
//     },
//   });
// }

// function renderTopParagraphs(paragraphs: ParagraphComment[]) {
//   const topList = $("topList");
//   if (!topList) return;

//   topList.innerHTML = "";
//   const top = [...paragraphs]
//     .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
//     .slice(0, 3);

//   if (top.length === 0) {
//     const li = document.createElement("li");
//     li.textContent = "No paragraph comments found";
//     li.style.listStyle = "none";
//     topList.appendChild(li);
//     return;
//   }

//   top.forEach((p) => {
//     const li = document.createElement("li");
//     const count = p.count ?? 0;
//     const snippet = firstN(p.snippet || p.raw);
//     li.innerHTML = `<strong>${count} comment${count === 1 ? "" : "s"}:</strong> "${snippet}"`;
//     topList.appendChild(li);
//   });
// }

// function renderAllParagraphs(paragraphs: ParagraphComment[]) {
//   const pWrap = $("paragraphs");
//   if (!pWrap) return;

//   pWrap.innerHTML = "";
  
//   if (paragraphs.length === 0) {
//     const div = document.createElement("div");
//     div.className = "para";
//     div.textContent = "No paragraphs found";
//     pWrap.appendChild(div);
//     return;
//   }

//   paragraphs.forEach((p: ParagraphComment, i: number) => {
//     const div = document.createElement("div");
//     div.className = "para";
//     const snippet = firstN(p.snippet ?? p.raw ?? "", 100);
//     const count = p.count ?? 0;
//     div.innerHTML = `<strong>Paragraph ${i + 1}:</strong> "${snippet || "..."}" — <span style="color: var(--accent-primary); font-weight: 600;">${count} comment${count === 1 ? "" : "s"}</span>`;
//     pWrap.appendChild(div);
//   });
// }

// function renderStats(stats: StoryStats | null | undefined) {
//   console.log("[WriterAnalytics][popup] renderStats called with:", stats);
  
//   if (!stats) {
//     showStatus("No stats found for this story yet. Please visit a Wattpad story page.");
//     return;
//   }

//   showContent();

//   // Title & author
//   const titleEl = $("title");
//   const authorEl = $("author");
//   if (titleEl) titleEl.textContent = stats.title ?? "Untitled Story";
//   if (authorEl) authorEl.textContent = stats.author ? `by ${stats.author}` : "by Unknown Author";

//   // Stats cards
//   const readsEl = $("reads");
//   const votesEl = $("votes");
//   const headerCommentsEl = $("headerComments");
//   const commentItemsCountEl = $("commentItemsCount");
  
//   if (readsEl) readsEl.textContent = formatNumber(stats.reads);
//   if (votesEl) votesEl.textContent = formatNumber(stats.votes);
//   if (headerCommentsEl) headerCommentsEl.textContent = formatNumber(stats.headerComments);
//   if (commentItemsCountEl) commentItemsCountEl.textContent = formatNumber(stats.commentItemsCount);

//   // Analytics calculations
//   const engagementRate = stats.reads && stats.votes && stats.reads > 0
//     ? ((stats.votes / stats.reads) * 100).toFixed(2) + "%"
//     : "—";
//   const commentRatio = stats.reads && stats.headerComments && stats.reads > 0
//     ? ((stats.headerComments / stats.reads) * 100).toFixed(2) + "%"
//     : "—";

//   const engagementEl = $("engagementRate");
//   const commentRatioEl = $("commentRatio");
//   if (engagementEl) engagementEl.textContent = engagementRate;
//   if (commentRatioEl) commentRatioEl.textContent = commentRatio;

//   // Paragraphs
//   const paragraphs = stats.paragraphComments ?? [];
//   renderChart(paragraphs);
//   renderTopParagraphs(paragraphs);
//   renderAllParagraphs(paragraphs);
// }

// // DIRECT STORAGE READ - This will definitely work
// function loadAndDisplayData() {
//   console.log("[WriterAnalytics][popup] Loading data from storage...");
  
//   chrome.storage.local.get(["writerAnalyticsStats"], (result) => {
//     console.log("[WriterAnalytics][popup] Storage result:", result);
    
//     const stats = result.writerAnalyticsStats;
    
//     if (!stats) {
//       showStatus("No data found. Please visit a Wattpad story page first.");
//       return;
//     }

//     console.log("[WriterAnalytics][popup] Found stored stats, displaying...");
//     renderStats(stats);
//   });
// }

// // Initialize
// document.addEventListener("DOMContentLoaded", () => {
//   console.log("[WriterAnalytics][popup] DOM loaded, initializing...");
//   initTheme();
//   loadAndDisplayData();
// });




// BULLETPROOF POPUP - GUARANTEED TO WORK
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

  // Display top paragraphs
  const topList = $("topList");
  if (topList && stats.paragraphComments) {
    topList.innerHTML = "";
    const top = [...stats.paragraphComments]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 3);

    top.forEach((p) => {
      const li = document.createElement("li");
      const count = p.count ?? 0;
      const snippet = (p.snippet || p.raw || "").substring(0, 80) + "...";
      li.innerHTML = `<strong>${count} comments:</strong> "${snippet}"`;
      topList.appendChild(li);
    });
  }

  // Simple chart (no Chart.js dependency)
  const canvas = $("commentsChart");
  if (canvas instanceof HTMLCanvasElement && stats.paragraphComments) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#26a69a";
      ctx.font = "16px Arial";
      ctx.fillText("📊 Comment Distribution", 20, 30);
      
      // Draw simple bars
      const maxCount = Math.max(...stats.paragraphComments.map((p:any) => p.count || 0));
      stats.paragraphComments.slice(0, 15).forEach((p:any, i:any) => {
        const height = Math.max((p.count || 0) / maxCount * 80, 2);
        const x = 25 + i * 25;
        const y = 120 - height;
        
        ctx.fillStyle = "#26a69a";
        ctx.fillRect(x, y, 20, height);
        
        ctx.fillStyle = "#666";
        ctx.font = "10px Arial";
        ctx.fillText(`P${i+1}`, x, 135);
      });
    }
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
  } catch (error:any) {
    console.error("CRITICAL ERROR:", error);
    showStatus("❌ Critical Error: " + error.message);
  }
}

// Theme toggle
function initTheme() {
  const themeToggle = $("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function() {
      document.body.classList.toggle("dark-theme");
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) {
        icon.textContent = document.body.classList.contains("dark-theme") ? "☀️" : "🌙";
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
