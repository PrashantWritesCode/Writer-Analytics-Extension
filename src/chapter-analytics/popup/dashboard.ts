import {
  getTrackedStories,
  saveSnapshot,
  saveTrackedStories,
} from "../storage/chapterStorage";

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
  chapterId: string;    // Matches scraper
  chapterTitle: string;  // Matches scraper
  chapterUrl: string;    // Matches scraper
  statHistory?: ChapterStatsSnapshot[]; // Ensure this matches background.ts push
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
   STATS HELPERS
--------------------------------------------- */
function getLatestStats(chapter: ChapterEntry): ChapterStatsSnapshot | null {
  const h = chapter.statHistory;
  if (!h || h.length === 0) return null;
  return h[h.length - 1];
}

function getPreviousStats(chapter: ChapterEntry): ChapterStatsSnapshot | null {
  const h = chapter.statHistory;
  if (!h || h.length < 2) return null;
  return h[h.length - 2];
}

function computeDelta(
  latest?: ChapterStatsSnapshot | null,
  prev?: ChapterStatsSnapshot | null
) {
  if (!latest || !prev) return null;
  return {
    reads:
      latest.reads !== null && prev.reads !== null
        ? latest.reads - prev.reads
        : null,
    votes:
      latest.votes !== null && prev.votes !== null
        ? latest.votes - prev.votes
        : null,
    comments:
      latest.comments !== null && prev.comments !== null
        ? latest.comments - prev.comments
        : null,
  };
}

/* ---------------------------------------------
   RENDER MAIN DASHBOARD
--------------------------------------------- */
export function renderChapterDashboard(
  container: HTMLElement,
  stories: TrackedStory[] = []
): void {
  if (!container) return;

  container.innerHTML = `
    <section class="chapter-banner">Track 2 stories for free</section>

    <button id="chapter-track-story-btn" class="chapter-track-card">
      <span class="chapter-track-card__title">Track a new Wattpad story</span>
      <span class="chapter-track-card__subtitle">Open a story page to begin</span>
    </button>

    <h3 class="chapter-section-title">Your Stories</h3>

    <div class="chapter-stories">
      ${
        stories.length
          ? stories
              .map(
                (s) => `
                  <div class="chapter-story-card" data-story-id="${s.storyId}">
                    <div class="chapter-story-main">
                      <div class="chapter-story-title">
                        ${s.title || "Untitled Story"}
                      </div>
                      <div class="chapter-story-meta">
                        ${s.totalChapters} chapters
                      </div>
                    </div>

                    <div class="chapter-story-actions">
                      <button
                        class="chapter-update-btn"
                        data-story-id="${s.storyId}"
                      >
                        Update
                      </button>
                      <span class="chapter-story-chevron">→</span>
                    </div>
                  </div>
                `
              )
              .join("")
          : `
            <div class="chapter-empty">
              <p>No stories tracked yet</p>
              <span class="chapter-empty__subtitle">
                Add your first story to begin
              </span>
            </div>
          `
      }
    </div>
  `;

  container
    .querySelectorAll<HTMLDivElement>(".chapter-story-card")
    .forEach((card) => {
      card.onclick = async () => {
        const storyId = card.dataset.storyId!;
        const snapshot = await getSnapshot(storyId);
        const story = trackedStoriesCache.find((s) => s.storyId === storyId);
        if (!story) return;

        renderStoryChaptersView(container, story, snapshot?.chapters || []);
      };
    });

  container
    .querySelectorAll<HTMLButtonElement>(".chapter-update-btn")
    .forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const storyId = btn.dataset.storyId!;
        chrome.runtime.sendMessage({
          type: "UPDATE_CHAPTER_STATS",
          storyId,
        });
      };
    });
}

/* ---------------------------------------------
   STORY → CHAPTER INSIGHTS VIEW
--------------------------------------------- */
function renderStoryChaptersView(
  container: HTMLElement,
  story: TrackedStory,
  chapters: ChapterEntry[]
): void {
  container.innerHTML = `
    <div class="chapter-view">

      <button class="chapter-back-btn">← Back</button>

      <div class="chapter-header">
        <h2 class="chapter-story-title">${story.title}</h2>
        <p class="chapter-story-meta">
          ${chapters.length} chapters
        </p>
      </div>

      <div class="chapter-divider"></div>

      <div class="chapter-list">
        ${
          chapters.length
            ? chapters
                .map((c) => {
                  const latest: any = getLatestStats(c);
                  const prev = getPreviousStats(c);
                  const delta = computeDelta(latest, prev);
                  console.log({ latest, prev, delta });
                  let subtitle = "No data yet";
                  if (latest?.reads !== null) {
                    subtitle = `${latest.reads} reads`;
                    if (delta?.reads) {
                      subtitle += ` · ${delta.reads > 0 ? "+" : ""}${
                        delta.reads
                      }`;
                    }
                  }

                  return `
                    <div class="chapter-card">
                      <div class="chapter-index-badge">
                        ${String(c.chapterId).padStart(2, "0")}
                      </div>

                      <div class="chapter-info">
                        <div class="chapter-title">${c.chapterTitle}</div>
                        <div class="chapter-subtitle">${subtitle}</div>
                      </div>

                      <div class="chapter-chevron">›</div>
                    </div>
                  `;
                })
                .join("")
            : `<p class="chapter-empty">No chapters found</p>`
        }
      </div>

    </div>
  `;

  (container.querySelector(".chapter-back-btn") as HTMLElement).onclick =
    () => {
      renderChapterDashboard(container, trackedStoriesCache);
    };
}

/* ---------------------------------------------
   INIT DASHBOARD
--------------------------------------------- */
export async function initChapterDashboard(): Promise<void> {
  dashboardContainer = document.getElementById("chapter-dashboard");
  if (!dashboardContainer) return;

  trackedStoriesCache = (await getTrackedStories()) as TrackedStory[];
  renderChapterDashboard(dashboardContainer, trackedStoriesCache);
}

/* ---------------------------------------------
   TRACK STORY CLICK
--------------------------------------------- */
export async function handleTrackStoryClick(): Promise<void> {
  if (!dashboardContainer)
    dashboardContainer = document.getElementById("chapter-dashboard");
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

        const anchors = Array.from(
          tocRoot.querySelectorAll('ul[aria-label="story-parts"] li a')
        );

        // const chapters = anchors.map((a: any, i: number) => {
        //   const chapterId =
        //     a.href.match(/\/(\d+)(?:\?|$)/)?.[1] ?? `chapter-${i + 1}`;

        //   return {
        //     chapterId,
        //     chapterUrl: a.href,
        //     chapterTitle:
        //       a.querySelector(".wpYp-")?.textContent?.trim() ||
        //       `Chapter ${i + 1}`,
        //   };
        // });

        // Inside handleTrackStoryClick -> executeScript -> func
        const chapters = anchors.map((a: any, i: number) => {
          // IMPROVED REGEX: Look for digits at the start of the last URL segment
          const urlParts = a.href.split("/");
          const lastSegment = urlParts[urlParts.length - 1];
          const match = lastSegment.match(/^(\d+)/);

          const chapterId = match ? match[1] : `chapter-${i + 1}`;

          return {
            chapterId, // This will now be "1414501394"
            chapterUrl: a.href,
            chapterTitle:
              a.querySelector(".wpYp-")?.textContent?.trim() ||
              `Chapter ${i + 1}`,
          };
        });

        return { storyId, title, chapters };
      },
    });

    if (!result || !result.storyId || !result.chapters.length) return;

    const { storyId, title, chapters } = result;

    const newStory: TrackedStory = {
      storyId,
      title,
      totalChapters: chapters.length,
      lastUpdated: new Date().toISOString(),
    };

    trackedStoriesCache = [
      ...trackedStoriesCache.filter((s) => s.storyId !== storyId),
      newStory,
    ];

    await saveTrackedStories(trackedStoriesCache);
    await saveSnapshot(storyId, chapters);

    renderChapterDashboard(dashboardContainer!, trackedStoriesCache);
  });
}

/* ---------------------------------------------
   STORAGE HELPER
--------------------------------------------- */
async function getSnapshot(storyId: string) {
  const key = `chapterAnalytics.snapshots.${storyId}`;
  const data = await chrome.storage.local.get(key);
  return data[key] ?? null;
}
