import { StoryChapter } from "../storage/chapterStorage";

/**
 * KPI 1: Reader Retention
 * Compares the latest reads of Chapter 1 vs. the Final Chapter.
 */
export function calculateRetention(chapters: StoryChapter[]) {
  if (chapters.length < 2) return { value: 100, status: "Good" };

  const firstReads = chapters[0].statHistory?.slice(-1)[0]?.reads || 0;
  const lastReads = chapters[chapters.length - 1].statHistory?.slice(-1)[0]?.reads || 0;

  if (firstReads === 0) return { value: 0, status: "Needs Attention" };

  const retention = Math.round((lastReads / firstReads) * 100);
  const status = retention < 40 ? "Needs Attention" : "Good";

  return { value: retention, status };
}

/**
 * KPI 2: Biggest Drop-off
 * Finds the largest percentage loss between any two consecutive chapters.
 */
export function findBiggestDropOff(chapters: StoryChapter[]) {
  let maxDropPercent = 0;
  let problematicChapter = "N/A";

  for (let i = 1; i < chapters.length; i++) {
    const prevReads = chapters[i - 1].statHistory?.slice(-1)[0]?.reads || 0;
    const currReads = chapters[i].statHistory?.slice(-1)[0]?.reads || 0;

    if (prevReads > 0) {
      const drop = (prevReads - currReads) / prevReads;
      if (drop > maxDropPercent) {
        maxDropPercent = drop;
        problematicChapter = chapters[i].chapterTitle || `Chapter ${i + 1}`;
      }
    }
  }

  return {
    chapterLabel: problematicChapter,
    dropValue: Math.round(maxDropPercent * 100)
  };
}

/**
 * KPI 3: Strongest Chapter
 * Finds the chapter with the highest Engagement Ratio: (Votes + Comments) / Reads.
 */
export function findStrongestChapter(chapters: StoryChapter[]) {
  let bestRatio = 0;
  let bestChapter = chapters[0]?.chapterTitle || "Chapter 1";

  chapters.forEach((c) => {
    const latest = c.statHistory?.slice(-1)[0];
    if (latest && latest.reads && latest.reads > 0) {
      const ratio = ((latest.votes || 0) + (latest.comments || 0)) / latest.reads;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestChapter = c.chapterTitle;
      }
    }
  });

  return { title: bestChapter };
}

/**
 * KPI 4: Story Fatigue
 * Identifies where reads fall below 30% of the start and stay low.
 */
export function findFatigueStart(chapters: StoryChapter[]) {
  const firstReads = chapters[0].statHistory?.slice(-1)[0]?.reads || 0;
  if (!firstReads) return "N/A";

  const fatigueChapter = chapters.find((c) => {
    const reads = c.statHistory?.slice(-1)[0]?.reads || 0;
    return (reads / firstReads) < 0.3; // Threshold: 30%
  });

  return fatigueChapter ? fatigueChapter.chapterTitle : "None detected";
}