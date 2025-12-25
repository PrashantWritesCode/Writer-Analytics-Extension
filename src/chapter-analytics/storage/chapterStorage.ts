/**
 * Chapter Analytics — Storage Layer (MVP)
 * Local-first, DB-ready structure
 */

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

export type ChapterStats = {
  reads: number | null;
  votes: number | null;
  comments: number | null;
};

export type StatHistory = {
  reads: number | null;
  votes: number | null;
  comments: number | null;
  createdAt: string;
};

export type StoryChapter = {
  chapterId: string;
  chapterUrl: string;
  chapterTitle: string;
  statHistory: StatHistory[];
};

export type ChapterSnapshot = {
  storyId: string;
  updatedAt: string;
  chapters: StoryChapter[];
};

export type TrackedStory = {
  storyId: string;
  title: string;
  totalChapters: number;
  lastUpdated: string;
};

/* ---------------------------------------------
   STORAGE KEYS
--------------------------------------------- */

const TRACKED_STORIES_KEY = "chapterAnalytics.trackedStories";
const SNAPSHOT_KEY_PREFIX = "chapterAnalytics.snapshots.";

/* ---------------------------------------------
   INTERNAL HELPERS
--------------------------------------------- */

function storageGet<T>(keys: string | string[]): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result as T);
    });
  });
}

function storageSet(values: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

/* ---------------------------------------------
   TRACKED STORIES
--------------------------------------------- */

export async function getTrackedStories(): Promise<TrackedStory[]> {
  const data = await storageGet<Record<string, unknown>>(TRACKED_STORIES_KEY);
  const raw = (data as any)[TRACKED_STORIES_KEY];
  return Array.isArray(raw) ? raw : [];
}

export async function saveTrackedStories(
  stories: TrackedStory[]
): Promise<void> {
  await storageSet({
    [TRACKED_STORIES_KEY]: Array.isArray(stories) ? stories : [],
  });
}

/* ---------------------------------------------
   STORY SNAPSHOTS
--------------------------------------------- */

export async function saveSnapshot(
  storyId: string,
  chapters: {
    chapterId: string;
    chapterUrl: string;
    chapterTitle: string;
  }[]
): Promise<void> {
  if (!storyId || !Array.isArray(chapters)) return;

  const key = `${SNAPSHOT_KEY_PREFIX}${storyId}`;

  const normalizedChapters: StoryChapter[] = chapters.map((c) => ({
    chapterId: c.chapterId,
    chapterUrl: c.chapterUrl,
    chapterTitle: c.chapterTitle,
    statHistory: [],
  }));

  const snapshot: ChapterSnapshot = {
    storyId,
    updatedAt: new Date().toISOString(),
    chapters: normalizedChapters,
  };

  await storageSet({ [key]: snapshot });
}

export async function getSnapshot(
  storyId: string
): Promise<ChapterSnapshot | null> {
  if (!storyId) return null;

  const key = `${SNAPSHOT_KEY_PREFIX}${storyId}`;
  const data = await storageGet<Record<string, ChapterSnapshot>>(key);
  return data[key] ?? null;
}

/* ---------------------------------------------
   APPEND CHAPTER STATS (IMPORTANT)
--------------------------------------------- */

export async function appendChapterStat(
  storyId: string,
  chapterId: string,
  stats: ChapterStats
): Promise<void> {
  if (!storyId || !chapterId || !stats) return;

  const key = `${SNAPSHOT_KEY_PREFIX}${storyId}`;
  const data = await storageGet<Record<string, ChapterSnapshot>>(key);
  const snapshot = data[key];

  if (!snapshot) return;

  const chapter = snapshot.chapters.find(
    (c) => c.chapterId === chapterId
  );
  if (!chapter) return;

  chapter.statHistory.push({
    reads: stats.reads ?? null,
    votes: stats.votes ?? null,
    comments: stats.comments ?? null,
    createdAt: new Date().toISOString(),
  });

  snapshot.updatedAt = new Date().toISOString();

  await storageSet({ [key]: snapshot });
}
