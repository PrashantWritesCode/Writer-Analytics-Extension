import {
  getTrackedStories,
  saveSnapshot,
  saveTrackedStories,
} from "../storage/chapterStorage";
import { 
  calculateRetention, 
  findBiggestDropOff, 
  findStrongestChapter, 
  findFatigueStart 
} from "../analytics/deriveMetrics";
import { getStoryDiagnosis } from "../analytics/storyInsights";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */
type ChapterStatsSnapshot = {
  reads: number | null;
  votes: number | null;
  comments: number | null;
  capturedAt: string;
};

type ChapterEntry = {
  chapterId: string;
  chapterTitle: string;
  chapterUrl: string;
  statHistory?: ChapterStatsSnapshot[];
};

type TrackedStory = {
  storyId: string;
  title: string;
  totalChapters: number;
  lastUpdated: string;
};

/* ---------------------------------------------
   STATE
--------------------------------------------- */
let dashboardContainer: HTMLElement | null = null;
let trackedStoriesCache: TrackedStory[] = [];

/* ---------------------------------------------
   RENDER MAIN DASHBOARD (Story List)
--------------------------------------------- */
export function renderChapterDashboard(
  container: HTMLElement,
  stories: TrackedStory[] = []
): void {
  if (!container) return;

  container.innerHTML = `
    <div class="chapter-view">
      <section class="chapter-top-banner">
        <span>Track your stories for insights</span>
      </section>

      <div class="chapter-track-card-premium">
        <div class="track-card-content">
          <h2 class="track-card-title">Track a new Wattpad story</h2>
          <p class="track-card-subtitle">Link your Wattpad stories for deeper insights</p>
        </div>
        <button id="chapter-track-story-btn" class="track-action-btn">
          Track Story
        </button>
      </div>

      <h3 class="chapter-section-header">
        <span class="sparkle">✦</span> YOUR STORIES
      </h3>

      <div class="chapter-stories-list">
        ${
          stories.length
            ? stories
                .map(
                  (s) => `
                    <div class="story-list-card" data-story-id="${s.storyId}">
                      <div class="story-info-left">
                        <h4 class="story-title">
                          ${s.title || "Untitled Story"}
                          <span class="verified-check">✓</span>
                        </h4>
                        <p class="story-meta">
                          ${s.totalChapters} chapters
                        </p>
                      </div>

                      <div class="story-actions-group">
                        <button class="story-btn update-btn" data-story-id="${s.storyId}">
                          <span class="sync-icon">↻</span> Update
                        </button>
                        <button class="story-btn view-btn" data-story-id="${s.storyId}">
                          View Insights →
                        </button>
                      </div>
                    </div>
                  `
                )
                .join("")
            : `
              <div class="chapter-empty-state">
                <p>No stories tracked yet.</p>
                <span>Add your first story to begin</span>
              </div>
            `
        }
      </div>
    </div>
  `;

  attachListEventListeners(container);
}

/* ---------------------------------------------
   EVENT LISTENERS (List View)
--------------------------------------------- */
function attachListEventListeners(container: HTMLElement) {
  // 1. Track New Story
  const trackBtn = container.querySelector("#chapter-track-story-btn");
  if (trackBtn) (trackBtn as HTMLElement).onclick = () => handleTrackStoryClick();

  // 2. Update Button (Sync Only)
  container.querySelectorAll<HTMLButtonElement>(".update-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation(); // Stop from opening the dashboard
      const storyId = btn.dataset.storyId!;
      
      // Visual feedback for click
      btn.innerHTML = `<span class="sync-icon spinning">↻</span> Updating...`;
      
      chrome.runtime.sendMessage({
        type: "UPDATE_CHAPTER_STATS",
        storyId,
      });
    };
  });

  // 3. View Insights Button OR Card Click (Navigate)
  const openDashboard = async (storyId: string) => {
    const snapshot = await getSnapshot(storyId);
    const story = trackedStoriesCache.find((s) => s.storyId === storyId);
    if (!story || !snapshot) return;
    renderStoryDashboard(container, story, snapshot.chapters || []);
  };

  container.querySelectorAll<HTMLButtonElement>(".view-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openDashboard(btn.dataset.storyId!);
    };
  });

  container.querySelectorAll<HTMLDivElement>(".story-list-card").forEach((card) => {
    card.onclick = () => openDashboard(card.dataset.storyId!);
  });
}

/* ---------------------------------------------
   STORY HEALTH DASHBOARD (The "Brain")
--------------------------------------------- */
export function renderStoryDashboard(
  container: HTMLElement,
  story: TrackedStory,
  chapters: any[] 
): void {
  const retention = calculateRetention(chapters);
  const dropOff = findBiggestDropOff(chapters);
  const strongest = findStrongestChapter(chapters);
  const fatigue = findFatigueStart(chapters);
  const diagnosis = getStoryDiagnosis(chapters);

  container.innerHTML = `
    <div class="chapter-view dashboard-mode">
      <div class="dashboard-header">
        <button class="chapter-back-btn">← Back to Stories</button>
        <div class="header-main">
          <h2 class="chapter-story-title-display">${story.title} <span class="verified-check">✓</span></h2>
          <p class="chapter-story-meta-display">
            ${chapters.length} chapters • Updated ${new Date(story.lastUpdated).toLocaleDateString()}
          </p>
        </div>
        <button class="story-btn view-btn update-sync-btn" data-story-id="${story.storyId}">
          ↻ Sync Latest Stats
        </button>
      </div>

      <div class="insight-grid">
        <div class="insight-card">
          <span class="card-label">Reader Retention</span>
          <div class="card-value">${retention.value}%</div>
          <span class="card-subtext">reach final chapter</span>
          <span class="status-badge ${retention.status.toLowerCase().replace(' ', '-')}">${retention.status}</span>
        </div>
        <div class="insight-card">
          <span class="card-label">Biggest Drop-off</span>
          <div class="card-value">${dropOff.chapterLabel}</div>
          <div class="card-subtext red">▼ ${dropOff.dropValue}% loss</div>
        </div>
        <div class="insight-card">
          <span class="card-label">Engagement Peak</span>
          <div class="card-value">${strongest.title}</div>
          <div class="card-subtext teal">★ Highest comments/votes</div>
        </div>
        <div class="insight-card">
          <span class="card-label">Story Fatigue</span>
          <div class="card-value">Starts at</div>
          <div class="card-subtext">${fatigue}</div>
        </div>
      </div>

      <div class="diagnosis-panel">
        <div class="diagnosis-header">⚠️ Intelligence Diagnosis</div>
        <div class="diagnosis-content">
          <p class="primary-alert">${diagnosis.primaryAlert}</p>
          <div class="tag-row">
            ${diagnosis.tags.map((tag:any) => `<span class="diag-tag">${tag}</span>`).join('')}
          </div>
          ${diagnosis.recoveryChapter ? `<p class="recovery-text">✅ Momentum recovers at <strong>${diagnosis.recoveryChapter}</strong></p>` : ''}
        </div>
      </div>

      <div class="action-section">
        <h3 class="section-title">Priority Improvements</h3>
        <div class="checklist">
          <div class="check-item">
            <input type="checkbox"> 
            <span>Rewrite <strong>${dropOff.chapterLabel}</strong> to prevent the ${dropOff.dropValue}% drop</span>
          </div>
          <div class="check-item">
            <input type="checkbox"> 
            <span>Check pacing at <strong>${fatigue}</strong></span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Back Button Logic
  (container.querySelector(".chapter-back-btn") as HTMLElement).onclick = () => {
    renderChapterDashboard(container, trackedStoriesCache);
  };

  // Sync Button Logic
  (container.querySelector(".update-sync-btn") as HTMLElement).onclick = () => {
    chrome.runtime.sendMessage({ 
      type: "UPDATE_CHAPTER_STATS", 
      storyId: story.storyId 
    });
  };
}

/* ---------------------------------------------
   INIT & TRACKING LOGIC
--------------------------------------------- */
export async function initChapterDashboard(): Promise<void> {
  dashboardContainer = document.getElementById("chapter-dashboard");
  if (!dashboardContainer) return;

  trackedStoriesCache = (await getTrackedStories()) as TrackedStory[];
  renderChapterDashboard(dashboardContainer, trackedStoriesCache);
}

export async function handleTrackStoryClick(): Promise<void> {
  if (!dashboardContainer) return;

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const storyId = window.location.href.match(/story\/(\d+)/)?.[1] ?? null;
        if (!storyId) return null;

        const title =
          document.querySelector(".gF-N5")?.textContent?.trim() ||
          document.querySelector("h1")?.textContent?.trim() ||
          "Untitled Story";

        const tocRoot = document.querySelector('div[data-testid="toc"]');
        if (!tocRoot) return null;

        const anchors = Array.from(tocRoot.querySelectorAll('ul[aria-label="story-parts"] li a'));

        const chapters = anchors.map((a: any, i: number) => {
          const urlParts = a.href.split("/");
          const lastSegment = urlParts[urlParts.length - 1];
          const match = lastSegment.match(/^(\d+)/);
          return {
            chapterId: match ? match[1] : `chapter-${i + 1}`,
            chapterUrl: a.href,
            chapterTitle: a.querySelector(".wpYp-")?.textContent?.trim() || `Chapter ${i + 1}`,
          };
        });

        return { storyId, title, chapters };
      },
    });

    if (!result || !result.storyId) return;

    const { storyId, title, chapters } = result;
    const newStory: TrackedStory = {
      storyId,
      title,
      totalChapters: chapters.length,
      lastUpdated: new Date().toISOString(),
    };

    trackedStoriesCache = [...trackedStoriesCache.filter((s) => s.storyId !== storyId), newStory];
    await saveTrackedStories(trackedStoriesCache);
    await saveSnapshot(storyId, chapters);

    renderChapterDashboard(dashboardContainer!, trackedStoriesCache);
  });
}

async function getSnapshot(storyId: string) {
  const key = `chapterAnalytics.snapshots.${storyId}`;
  const data = await chrome.storage.local.get(key);
  return data[key] ?? null;
}