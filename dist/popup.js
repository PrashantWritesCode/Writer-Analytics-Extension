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
function firstN(text, n = 120) {
  if (!text)
    return "";
  const s = text.trim().replace(/\s+/g, " ");
  return s.length <= n ? s : s.slice(0, n).trim() + "\u2026";
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
  const topHitsList = $("topHitsList");
  if (topHitsList && stats.paragraphComments) {
    topHitsList.innerHTML = "";
    const top = [...stats.paragraphComments].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 3);
    top.forEach((p, index) => {
      const li = document.createElement("li");
      const count = p.count ?? 0;
      const snippet = firstN(p.snippet || p.raw);
      li.innerHTML = `
        <div class="hit-item">
          <span class="hit-rank" data-rank="#${index + 1}">P${stats.paragraphComments.indexOf(p) + 1}</span>
          <div class="hit-content">
            <span class="content-label">Content:</span> <span class="content-text">${snippet}</span>
            <span class="comment-label">Comments:</span> <strong class="comment-count">${count} comment${count === 1 ? "" : "s"}</strong>
          </div>
        </div>
      `;
      if (index === 0)
        li.classList.add("top-hit");
      else if (count < 5)
        li.classList.add("revise");
      if (topHitsList)
        topHitsList.appendChild(li);
    });
  }
  const paragraphsList = $("paragraphsList");
  if (paragraphsList && stats.paragraphComments) {
    paragraphsList.innerHTML = "";
    stats.paragraphComments.forEach((p) => {
      const div = document.createElement("div");
      div.classList.add("para");
      const count = p.count ?? 0;
      const snippet = firstN(p.snippet || p.raw);
      div.innerHTML = `
        <span class="para-number">P${stats.paragraphComments.indexOf(p) + 1}</span>
        <div class="para-content">
          <span class="content-label">Content:</span> <span class="content-text">${snippet}</span>
          <span class="comment-label">Comments:</span> <span class="comment-count">${count} comment${count === 1 ? "" : "s"}</span>
        </div>
      `;
      if (count > 5)
        div.classList.add("highlight");
      else if (count < 2)
        div.classList.add("boost");
      if (paragraphsList)
        paragraphsList.appendChild(div);
    });
  }
  const suggestionEl = $("analyticsSuggestion");
  if (suggestionEl && stats.paragraphComments) {
    const minCountIndex = stats.paragraphComments.reduce((minIndex, p, i, arr) => (p.count ?? 0) < (arr[minIndex].count ?? 0) ? i : minIndex, 0);
    if (suggestionEl)
      suggestionEl.textContent = minCountIndex >= 0 ? `_P${minCountIndex + 1} needs a twist!_` : "Keep writing!";
  }
  console.log("DATA DISPLAY COMPLETE!");
}
function loadData(forceRefresh = false) {
  console.log("LOADING DATA FROM STORAGE...", { forceRefresh });
  showStatus("\u{1F504} Loading analytics...");
  try {
    if (forceRefresh) {
      console.log("[WriterAnalytics][popup] Forcing refresh, requesting new data from background...");
      chrome.runtime.sendMessage({ type: "WA_REFRESH" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("[WriterAnalytics][popup] Error requesting refresh:", chrome.runtime.lastError);
          if (chrome.runtime.lastError.message) {
            console.error("Detailed Error:", chrome.runtime.lastError.message);
          }
          showStatus("\u274C Refresh Error: Check console for details");
          return;
        }
        if (response && response.payload) {
          console.log("[WriterAnalytics][popup] Received refreshed data:", response.payload);
          displayData(response.payload);
        } else {
          chrome.storage.local.get(null, (result) => {
            const storyKeys = Object.keys(result).filter((key) => key.startsWith("writerAnalyticsStats-"));
            if (storyKeys.length > 0) {
              const latestKey = storyKeys[storyKeys.length - 1];
              const stats = result[latestKey];
              if (stats) {
                displayData(stats);
              } else {
                showStatus(`
                  <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 32px;">\u{1F4DD}</div>
                    <div><strong>No Data Found</strong></div>
                    <div style="font-size: 12px; color: #666;">Check storage or reload page!</div>
                  </div>
                `);
              }
            } else {
              showStatus(`
                <div style="text-align: center; padding: 20px;">
                  <div style="font-size: 32px;">\u{1F4DD}</div>
                  <div><strong>No Data Found</strong></div>
                  <div style="font-size: 12px; color: #666;">Visit a Wattpad story page first!</div>
                </div>
              `);
            }
          });
        }
      });
    } else {
      chrome.storage.local.get(null, (result) => {
        console.log("ALL STORAGE DATA:", result);
        const storyKeys = Object.keys(result).filter((key) => key.startsWith("writerAnalyticsStats-"));
        if (storyKeys.length > 0) {
          const latestKey = storyKeys[storyKeys.length - 1];
          const stats = result[latestKey];
          if (stats) {
            displayData(stats);
          } else {
            showStatus(`
              <div style="text-align: center; padding: 20px;">
                <div style="font-size: 32px;">\u{1F4DD}</div>
                <div><strong>No Data Found</strong></div>
                <div style="font-size: 12px; color: #666;">Check storage or reload page!</div>
              </div>
            `);
          }
        } else {
          showStatus(`
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 32px;">\u{1F4DD}</div>
              <div><strong>No Data Found</strong></div>
              <div style="font-size: 12px; color: #666;">Visit a Wattpad story page first!</div>
            </div>
          `);
        }
      });
    }
  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    showStatus("\u274C Critical Error: " + error.message);
  }
}
function initTheme() {
  const themeToggle = $("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function() {
      const isDark = document.body.classList.toggle("dark-theme");
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) {
        icon.textContent = isDark ? "\u2600\uFE0F" : "\u{1F319}";
      }
    });
  }
}
console.log("POPUP SCRIPT STARTING...");
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM LOADED!");
  initTheme();
  const refreshBtn = $("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      console.log("[WriterAnalytics][popup] Refresh button clicked");
      loadData(true);
    });
  } else {
    console.warn("[WriterAnalytics][popup] Refresh button not found, check HTML id");
  }
  setTimeout(loadData, 100);
});
setTimeout(function() {
  console.log("EMERGENCY FALLBACK CHECK");
  if ($("status")?.textContent?.includes("Loading")) {
    console.log("STILL LOADING, RETRYING...");
    loadData();
  }
}, 2e3);
var style = document.createElement("style");
style.textContent = `
  .top-hit { color: #26a69a; font-weight: bold; }
  .revise { color: #666; font-style: italic; }
  .highlight { background-color: #e0f7fa; padding: 5px; border-radius: 3px; }
  .boost { color: #757575; }
  .hit-item { display: flex; align-items: center; margin-bottom: 10px; }
  .hit-rank { font-weight: bold; margin-right: 10px; }
  .hit-content { flex-grow: 1; }
  .content-label { font-weight: bold; color: #26a69a; }
  .comment-label { font-weight: bold; color: #ab47bc; }
  .content-text { margin-right: 10px; }
  .comment-count { color: #ab47bc; }
  .para { margin-bottom: 5px; }
  .para-number { font-weight: bold; margin-right: 10px; }
  .para-content { display: inline-block; }
`;
document.head.appendChild(style);
//# sourceMappingURL=popup.js.map
