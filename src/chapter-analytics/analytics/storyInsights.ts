import { findBiggestDropOff } from "./deriveMetrics";
import { StoryChapter } from "../storage/chapterStorage";

export function getStoryDiagnosis(chapters: StoryChapter[]) {
  const dropOff = findBiggestDropOff(chapters);
  
  // Logic-based diagnosis text
  let primaryAlert = `⚠️ Your story loses readers sharply at ${dropOff.chapterLabel}.`;
  let tags = ["Pacing slows", "Long exposition", "POV shift"]; // Static MVP tags
  
  // Example of conditional positive insight
  const recoveryPoint = chapters.find((c, i) => {
    if (i === 0) return false;
    const curr = c.statHistory?.slice(-1)[0]?.reads || 0;
    const prev = chapters[i-1].statHistory?.slice(-1)[0]?.reads || 0;
    return curr > prev; // Reader interest actually increased
  });

  return {
    primaryAlert,
    tags,
    recoveryChapter: recoveryPoint?.chapterTitle || null
  };
}