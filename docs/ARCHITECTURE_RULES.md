# 📘 ARCHITECTURE_RULES.md

**Writer Analytics — Architecture Rules (v1.0)**  
_Last updated: 2025_

---

# 🔧 1. Overview
Writer Analytics uses a **modular MV3 Chrome Extension architecture**, designed to support multiple independent features (Story Analytics, Chapter Analytics, StoryPlot, StoryTeller, etc).

Every feature must be built in isolation, using consistent messaging, storage, scraping, and UI structure.

This document contains explicit technical rules to ensure all code remains scalable and conflict-free.

---

# 🔧 2. Extension Architecture Diagram

┌──────────────────────┐
│        popup         │  — UI screens, navigation only
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      background      │  — message router (per feature)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     content scripts  │  — scrapers (per feature)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       storage        │  — persistent storage (per feature)
└──────────────────────┘

---

# 🔧 3. Core Architectural Rules

## ✔ Rule 1 — Story Analytics code is OFF-LIMITS  
The following files must **never be modified** unless explicit refactoring is underway:

- src/content.ts  
- src/background.ts (WA_* handlers)  
- src/popup/popup.ts (Story Analytics logic)
- popup.html (Story Analytics UI)
- popup.css (global & Story style)

These files contain stable production behavior.

---

## ✔ Rule 2 — Every new feature MUST have its own isolated module

Each feature follows this structure:

```
src/<feature-name>/
    popup/
    background/
    content/
    storage/
    ui/
    styles/
```

No part of one feature should depend on another.

---

## ✔ Rule 3 — popup.ts acts ONLY as navigation

popup.ts must **only**:

- show/hide screens  
- register button listeners  
- call feature init() functions  

popup.ts must **NOT** contain business logic.

---

## ✔ Rule 4 — Messaging Prefix Rules

| Feature            | Prefix        | Examples              |
|-------------------|---------------|------------------------|
| Story Analytics    | WA_*          | WA_STATS, WA_REFRESH  |
| Chapter Analytics  | CHAPTER_*     | CHAPTER_TOC_SCRAPE    |
| StoryPlot          | PLOT_*        | PLOT_ANALYZE          |
| StoryTeller (TTS)  | TTS_*         | TTS_GENERATE          |

Prefixes prevent collisions.

---

## ✔ Rule 5 — Background Logic Separation

background.ts is **not** for logic.  
It must only:

- initialize listeners  
- detect message prefixes  
- route messages to feature handlers  

Example:

```ts
if (message.type.startsWith("CHAPTER_")) {
    return chapterHandler(message, sender, sendResponse);
}
```

All new logic must live inside:  
```
src/chapter-analytics/background/chapterHandler.ts
```

---

## ✔ Rule 6 — Scraper Isolation

**Story Analytics scrapers**  
- Live in `content.ts`  
- Auto-run via manifest  
- DO NOT MODIFY  

**Chapter Analytics scrapers**  
- Must be inside:  
  ```
  src/chapter-analytics/content/
  ```
- Must be executed using `chrome.scripting.executeScript`
- Must not auto-run  
- Must not interfere with Story Analytics scraping

---

## ✔ Rule 7 — Storage Architecture

Each feature must use its own namespace.

Story Analytics:
```
writerAnalyticsStats-<storyId>
```

Chapter Analytics:
```
chapterAnalytics.trackedStories
chapterAnalytics.snapshots.<storyId>
chapterAnalytics.settings
```

Future features:
```
plotAnalytics.*
ttsAnalytics.*
```

---

## ✔ Rule 8 — UI & CSS Architecture

Global UI:  
- popup.html + popup.css

Feature UI:  
- src/<feature>/popup/  
- src/<feature>/styles/

All CSS must use feature-prefixed classes:

```
.stat-*      (Story Analytics)
.chapter-*   (Chapter Analytics)
.plot-*      (StoryPlot)
.tts-*       (StoryTeller)
```

---

## ✔ Rule 9 — File Responsibility Map

| File                                | Responsibility                       |
|------------------------------------|---------------------------------------|
| popup.ts                           | Navigation only                       |
| popup.html                         | UI containers                         |
| popup.css                          | Global + Story Analytics styles       |
| <feature>/popup/*.ts               | Feature UI rendering                  |
| <feature>/background/*.ts          | Message handling                      |
| <feature>/content/*.ts             | Scraping logic                        |
| <feature>/storage/*.ts             | Persistent storage                    |
| <feature>/ui/*.ts                  | Reusable feature components           |
| <feature>/styles/*.css             | Feature-specific styling              |

---

## ✔ Rule 10 — Backward Compatibility Guarantee

Every new commit MUST ensure:

- Story Analytics still loads correctly  
- Story Analytics still scrapes  
- UI buttons function normally  
- No global CSS breaks existing views  
- No new scrapers auto-run  
- CHAPTER_* logic never overrides WA_* logic  

---

# 🔧 4. Future Backend Integration Rules

When backend is added:

- Use Supabase / Firebase / custom API  
- Background service will sync snapshots  
- Chapter Analytics snapshot format stays stable  
- No backend logic inside popup.ts or content scripts  

---

# 🎉 End of Architecture Rules v1.0
