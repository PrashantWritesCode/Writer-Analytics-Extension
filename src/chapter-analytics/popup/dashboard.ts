import { supabase } from "../../auth/supabase";
import { renderLoginScreen } from "../../auth/authUI";
import {
  calculateRetention,
  findBiggestDropOff,
  findStrongestChapter,
  findFatigueStart,
} from "../analytics/deriveMetrics";
import { getStoryDiagnosis } from "../analytics/storyInsights";
import { authService } from "../../auth/authService";

/* ---------------------------------------------
   TYPES & CONSTANTS
--------------------------------------------- */
const FREE_TRACKING_LIMIT = 2;

type ChapterStatsSnapshot = {
  reads: number | null;
  votes: number | null;
  comments: number | null;
  capturedAt: string;
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
   1. INIT (The Global Router)
--------------------------------------------- */
// export async function initChapterDashboard(): Promise<void> {
//   dashboardContainer = document.getElementById("chapter-dashboard");
//   if (!dashboardContainer) return;

//   // Check for an active Supabase session
//   const {
//     data: { session },
//   } = await supabase.auth.getSession();

//   if (!session) {
//     // If no user, the Auth module takes over the container
//     renderLoginScreen(dashboardContainer, () => {
//       initChapterDashboard(); // Success callback
//     });
//   } else {
//     // Session exists: Fetch stories from Supabase
//     const { data: stories, error } = await supabase
//       .from("tracked_stories")
//       .select("*")
//       .eq("user_id", session.user.id)
//       .is("deleted_at", null);

//     if (error) console.error("Supabase Error:", error);

//     // Sync DB snake_case to our production camelCase types
//     trackedStoriesCache = (stories || []).map((s: any) => ({
//       storyId: s.story_id,
//       title: s.title,
//       totalChapters: s.total_chapters,
//       lastUpdated: s.last_updated,
//     }));

//     renderChapterDashboard(dashboardContainer, trackedStoriesCache);
//   }
// }

export async function initChapterDashboard(): Promise<void> {
  dashboardContainer = document.getElementById("chapter-dashboard");
  if (!dashboardContainer) return;

  // 1. You call the centralized function
  // 2. You MUST put (session) here to "catch" the data from the service
  await authService.ensureAuth(dashboardContainer, async (session: any) => {
    // Now 'session' is defined and the error goes away!
    const { data: stories, error } = await supabase
      .from("tracked_stories")
      .select("*")
      .eq("user_id", session.user.id) // This works now!
      .is("deleted_at", null);

    if (error) console.error("Supabase Error:", error);

    trackedStoriesCache = (stories || []).map((s: any) => ({
      storyId: s.story_id,
      title: s.title,
      totalChapters: s.total_chapters,
      lastUpdated: s.last_updated,
    }));

    renderChapterDashboard(dashboardContainer!, trackedStoriesCache);
  });
}

/* ---------------------------------------------
   2. STORY LIST VIEW (UI STABLE)
--------------------------------------------- */
export function renderChapterDashboard(
  container: HTMLElement,
  stories: TrackedStory[] = [],
): void {
  if (!container) return;

  container.innerHTML = `
    <div class="chapter-view page-surface">
      <section class="chapter-top-banner">
        Track your stories for deeper reader insights (Beta)
      </section>

      <section class="chapter-track-card-premium">
        <div class="track-card-content">
          <h2 class="track-card-title">Track a new Wattpad story</h2>
          <p class="track-card-subtitle">Link your story to unlock chapter-level insights</p>
        </div>
        <button id="chapter-track-story-btn" class="track-action-btn">
          Track Story
        </button>
      </section>

      <h3 class="chapter-section-header">
        <span class="sparkle">✦</span> YOUR STORIES
      </h3>

      <section class="chapter-stories-list">
        ${
          stories.length
            ? stories
                .map(
                  (s) => `
          <article class="story-list-card" data-story-id="${s.storyId}">
            <div class="story-info-left">
              <h4 class="story-title">
                ${s.title || "Untitled Story"}
                <span class="verified-check">✓</span>
              </h4>
              <p class="story-meta">${s.totalChapters} chapters</p>
            </div>
            <div class="story-actions-group">
              <button class="story-btn update-btn" data-story-id="${s.storyId}">
                <span class="sync-icon">↻</span> Update
              </button>
              <button class="story-btn view-btn" data-story-id="${s.storyId}">
                View Insights →
              </button>
            </div>
          </article>
        `,
                )
                .join("")
            : `
          <div class="chapter-empty-state">
            <p>No stories tracked yet</p>
            <span>Open a Wattpad story and click Track Story</span>
          </div>
        `
        }
      </section>

      <div class="onboarding-container">
        <details class="how-to-accordion">
          <summary>
            ✨ How to Use Chapter Analytics (Beta)
            <span class="chevron">▼</span>
          </summary>
          <div class="instruction-list">
            <div class="step">
              <span class="number">1</span>
              <div>
                <strong>Open your story on Wattpad</strong>
                <p>Go to your story’s main page where you can see the Table of Contents.</p>
              </div>
            </div>
            <div class="step">
              <span class="number">2</span>
              <div>
                <strong>Click “Track Story”</strong>
                <p>While on the story page, click Track Story. Your story will now appear in the list below.</p>
              </div>
            </div>
            <div class="step">
              <span class="number">3</span>
              <div>
                <strong>Update your story stats</strong>
                <p>Click Update to collect chapter data. Stay on Wattpad—background tabs will briefly open to gather stats.</p>
              </div>
            </div>
            <div class="step">
              <span class="number">4</span>
              <div>
                <strong>Update regularly for better insights</strong>
                <p>Update 3–4 times per week to see clearer trends and reader behavior.</p>
              </div>
            </div>
            <div class="step">
              <span class="number">5</span>
              <div>
                <strong>View chapter insights</strong>
                <p>Once updated, click View Insights to explore drop-offs and engagement peaks.</p>
              </div>
            </div>
            <div class="step pro-step">
              <span class="number">6</span>
              <div class="step-content">
                <strong>Need more than 2 stories?</strong>
                <p>
                  Unlimited story tracking and advanced historical comparisons will be available soon in our upcoming 
                  <span class="pro-highlight">Pro Tier</span>. Stay tuned!
                </p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  `;

  attachListEventListeners(container);
}

/* ---------------------------------------------
   3. LIST VIEW EVENTS
--------------------------------------------- */
function attachListEventListeners(container: HTMLElement) {
  const trackBtn = container.querySelector(
    "#chapter-track-story-btn",
  ) as HTMLButtonElement;
  if (trackBtn) trackBtn.onclick = () => handleTrackStoryClick();

  container
    .querySelectorAll<HTMLButtonElement>(".update-btn")
    .forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const storyId = btn.dataset.storyId!;
        btn.innerHTML = `<span class="sync-icon spinning">↻</span> Updating...`;
        chrome.runtime.sendMessage({ type: "UPDATE_CHAPTER_STATS", storyId });
      };
    });

  const openDashboard = async (storyId: string) => {
    const snapshots = await getSupabaseSnapshots(storyId);
    const story = trackedStoriesCache.find((s) => s.storyId === storyId);

    if (!story || !snapshots || snapshots.length === 0) {
      alert("No data synced yet. Please click 'Update' to fetch stats.");
      return;
    }

    renderStoryDashboard(container, story, snapshots);
  };

  container.querySelectorAll<HTMLButtonElement>(".view-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openDashboard(btn.dataset.storyId!);
    };
  });

  container
    .querySelectorAll<HTMLDivElement>(".story-list-card")
    .forEach((card) => {
      card.onclick = () => openDashboard(card.dataset.storyId!);
    });
}

/* ---------------------------------------------
   4. STORY HEALTH DASHBOARD (PRESERVING ALL LOGIC)
--------------------------------------------- */
export function renderStoryDashboard(
  container: HTMLElement,
  story: TrackedStory,
  chapters: any[],
): void {
  const retention = calculateRetention(chapters);
  const dropOff = findBiggestDropOff(chapters);
  const strongest = findStrongestChapter(chapters);
  const fatigue = findFatigueStart(chapters);
  const diagnosis = getStoryDiagnosis(chapters);

  container.innerHTML = `
    <div class="chapter-view dashboard-mode page-surface">
      <div class="dashboard-page">
        <header class="dashboard-header">
          <div class="dashboard-header-left">
            <button class="chapter-back-btn">← Back to Stories</button>
            <div class="story-context">
              <h2 class="chapter-story-title-display">${
                story.title
              } <span class="verified-check">✓</span></h2>
              <p class="chapter-story-meta-display">
                ${story.totalChapters} chapters • Updated ${new Date(
                  story.lastUpdated,
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div class="dashboard-header-right">
            <button class="story-btn view-btn update-sync-btn" data-story-id="${
              story.storyId
            }">↻ Sync Latest Stats</button>
          </div>
        </header>

        <section class="dashboard-cards-surface">
          <section class="insight-grid">
            <article class="insight-card">
              <span class="card-label">Reader Retention</span>
              <div class="card-value">${retention.value}%</div>
              <span class="card-subtext">reach final chapter</span>
              <span class="status-badge ${retention.status
                .toLowerCase()
                .replace(" ", "-")}">${retention.status}</span>
            </article>
            <article class="insight-card">
              <span class="card-label">Biggest Drop-off</span>
              <div class="card-value">${dropOff.chapterLabel}</div>
              <span class="card-subtext red">▼ ${dropOff.dropValue}% loss</span>
            </article>
            <article class="insight-card">
              <span class="card-label">Engagement Peak</span>
              <div class="card-value">${strongest.title}</div>
              <span class="card-subtext teal">★ Highest comments & votes</span>
            </article>
            <article class="insight-card">
              <span class="card-label">Story Fatigue</span>
              <div class="card-value">Starts at</div>
              <span class="card-subtext">${fatigue}</span>
            </article>
          </section>
        </section>

        <section class="dashboard-content">
          <section class="diagnosis-panel">
            <h3 class="diagnosis-header">⚠ Intelligence Diagnosis</h3>
            <p class="primary-alert">${diagnosis.primaryAlert}</p>
            <div class="tag-row">${diagnosis.tags
              .map((tag: string) => `<span class="diag-tag">${tag}</span>`)
              .join("")}</div>
            ${
              diagnosis.recoveryChapter
                ? `<p class="recovery-text">Momentum recovers at <strong>${diagnosis.recoveryChapter}</strong></p>`
                : ""
            }
          </section>

          <section class="action-section">
            <h3 class="section-title">Priority Improvements</h3>
            <div class="checklist">
              <label class="check-item">
                <input type="checkbox" />
                <span>Rewrite <strong>${
                  dropOff.chapterLabel
                }</strong> to reduce drop-off</span>
              </label>
              <label class="check-item">
                <input type="checkbox" />
                <span>Review pacing around <strong>${fatigue}</strong></span>
              </label>
            </div>
          </section>
        </section>
      </div>
    </div>
  `;

  (container.querySelector(".chapter-back-btn") as HTMLElement).onclick = () =>
    initChapterDashboard();
  (container.querySelector(".update-sync-btn") as HTMLElement).onclick = () => {
    chrome.runtime.sendMessage({
      type: "UPDATE_CHAPTER_STATS",
      storyId: story.storyId,
    });
  };
}

/* ---------------------------------------------
   5. TRACK STORY (The Gated Logic)
--------------------------------------------- */
export async function handleTrackStoryClick(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    alert("Please log in to track stories.");
    return;
  }

  const userId = session.user.id;

  // TIER GUARD: Check limit of 2 stories in Supabase
  const { count } = await supabase
    .from("tracked_stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (count !== null && count >= FREE_TRACKING_LIMIT) {
    alert(
      "Chapter Analytics (Beta): Free plan includes tracking up to 2 stories. Upgrade to unlock unlimited tracking.",
    );
    return;
  }

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
          tocRoot.querySelectorAll('ul[aria-label="story-parts"] li a'),
        );
        const chapters = anchors.map((a: any, i: number) => ({
          chapterId:
            a.href
              .split("/")
              .pop()
              .match(/^(\d+)/)?.[1] || `chapter-${i + 1}`,
          chapterUrl: a.href,
          chapterTitle:
            a.querySelector(".wpYp-")?.textContent?.trim() ||
            `Chapter ${i + 1}`,
        }));
        return { storyId, title, chapters };
      },
    });

    if (!result || !result.storyId) return;

    // 1. Save the Master Story Record
    const { error: storyError } = await supabase.from("tracked_stories").upsert(
      {
        user_id: userId,
        story_id: result.storyId,
        title: result.title,
        total_chapters: result.chapters.length,
        last_updated: new Date().toISOString(),
        deleted_at: null, // 🔥 Important: This "undeletes" the story if it was previously removed
      },
      { onConflict: "user_id, story_id" }, // 🔥 Tell the DB to look for this pair
    );

    if (storyError) {
      alert("Error saving story: " + storyError.message);
      return;
    }

    // 2. 🔥 THE FIX: Save all extracted chapters to the database
    const chaptersToStore = result.chapters.map((ch: any, index: number) => ({
      user_id: userId,
      story_id: result.storyId,
      chapter_id: ch.chapterId,
      title: ch.chapterTitle,
      url: ch.chapterUrl, // Saving the URL for background.ts
      sequence_order: index,
    }));

    // Update the chapter upsert in dashboard.ts as well
    const { error: chaptersError } = await supabase
      .from("story_chapters")
      .upsert(chaptersToStore, { onConflict: "story_id, chapter_id" });

    if (!chaptersError) {
      console.log(`✅ ${result.chapters.length} chapters mapped in DB.`);
      initChapterDashboard();
    } else {
      console.error("Error saving chapters:", chaptersError.message);
    }
  });
}

/* ---------------------------------------------
   6. DATABASE HELPERS (FIXED FOR NESTED HISTORY)
--------------------------------------------- */
async function getSupabaseSnapshots(storyId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  // 1. Get the SKELETON (Structure)
  const { data: chapters, error: chError } = await supabase
    .from("story_chapters")
    .select("chapter_id, title, sequence_order")
    .eq("story_id", storyId)
    .order("sequence_order", { ascending: true }); // Sorts 1, 2, 3...

  if (chError || !chapters) {
    console.error("Error fetching chapters:", chError);
    return null;
  }

  // 2. Get the RAW HISTORY (Muscle)
  const { data: snapshots, error: snapError } = await supabase
    .from("chapter_snapshots")
    .select("*")
    .eq("story_id", storyId)
    .order("captured_at", { ascending: true }); // Oldest -> Newest (Important for .slice(-1))

  if (snapError) {
    console.error("Error fetching snapshots:", snapError);
    return null;
  }

  // 3. THE TRANSFORM: Nest snapshots inside chapters
  return chapters.map((ch) => {
    // specific history for this chapter
    const myHistory =
      snapshots?.filter((s) => s.chapter_id === ch.chapter_id) || [];

    // Return the Shape 'deriveMetrics.ts' expects:
    return {
      chapterId: ch.chapter_id,
      chapterTitle: ch.title, // Maps to 'c.chapterTitle' usage
      sequence: ch.sequence_order,

      // The Critical Part: 'statHistory'
      statHistory: myHistory.map((h) => ({
        reads: h.reads,
        votes: h.votes,
        comments: h.comments,
        capturedAt: h.captured_at,
      })),
    };
  });
}
