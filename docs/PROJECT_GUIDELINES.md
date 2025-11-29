# Project Guidelines

**Writer Analytics — Project Guidelines (v1.0)**  
_Last updated: 29_Nov_2025

---

# ✨ 1. Project Purpose

Writer Analytics is a Chrome extension designed to help Wattpad and Webnovel authors understand their story performance through:

- **Story Analytics** (existing feature)  
- **Chapter Analytics** (new feature, modular architecture)  
- Future expansions:  
  - StoryTeller (TTS)  
  - StoryPlot (character/plot visualizer)  
  - Growth Analytics  
  - AI Writing Insights  

The project must remain **modular, scalable, and safe**, ensuring new features never break existing ones.

---

# ✨ 2. Core Engineering Principles

## ✔ Stability First  
Existing Story Analytics is live & stable.  
It must remain untouched until the new Chapter Analytics feature is fully implemented.

## ✔ Feature Isolation  
Every new feature must live inside its own folder with its own:

- popup logic  
- scrapers  
- background handlers  
- storage  
- styles  
- UI components  

No feature modifies another feature’s code.

## ✔ Popup Navigation Only  
`popup.ts` should only handle:

- Showing/hiding screens  
- Button event bindings  
- Calling feature `init()` functions  

Business logic NEVER goes inside popup.ts.

## ✔ Scalable Architecture  
Future backend integration should be easy due to modular separation.

---

# ✨ 3. Project Folder Structure Overview

src/
popup/
popup.ts <-- navigation controller (NO logic)
popup.html
popup.css

content.ts <-- Story Analytics scraper (DO NOT MODIFY)
background.ts <-- Story Analytics handlers (DO NOT MODIFY)

chapter-analytics/
popup/
dashboard.ts <-- Screen 1 (tracked stories)
analytics.ts <-- Screen 2 (chapter insights)
content/
tocScraper.ts
chapterScraper.ts
background/
chapterHandler.ts
storage/
chapterStorage.ts
ui/
ChapterCard.ts
SummaryCard.ts
InsightsRow.ts
styles/
index.css
dashboard.css
analytics.css


---

# ✨ 4. Feature Development Rules

## ✔ A. DO NOT MODIFY Story Analytics files
The following files are **production-stable**:

- `src/content.ts`  
- `src/background.ts` (WA_* logic)  
- `src/popup/popup.ts` (story logic)  
- `popup.html` (Story Analytics UI)  
- `popup.css` (global & Story CSS)  

These must remain untouched until official refactor.

---

## ✔ B. All new features MUST use modular folders

Example for Chapter Analytics:

src/chapter-analytics/
popup/
content/
background/
storage/
ui/
styles/


Future features will follow the same pattern:

src/storyplot/
src/storyteller/
src/growth/


---

## ✔ C. Message Naming Rules

| Feature            | Prefix      | Examples                      |
|-------------------|-------------|--------------------------------|
| Story Analytics    | `WA_*`      | WA_STATS, WA_REFRESH           |
| Chapter Analytics  | `CHAPTER_*` | CHAPTER_TOC_SCRAPE, CHAPTER_*  |
| Future features    | feature_*   | PLOT_*, TTS_*, GROWTH_*        |

---

## ✔ D. Scraper Rules

**Story Analytics scrapers:**
- Auto-run via manifest injection  
- Located in `content.ts`  
- DO NOT MODIFY  

**Chapter Analytics scrapers:**
- Must be triggered manually via `chrome.scripting.executeScript`  
- Live inside `chapter-analytics/content/`  
- Never auto-run

---

## ✔ E. Storage Namespaces  

Story Analytics uses:

writerAnalyticsStats-*

Chapter Analytics uses:

chapterAnalytics.*

Future features use:

<feature>.*


Each feature must manage its own storage wrapper.

---

## ✔ F. CSS Namespace Rules  

Story Analytics classes use:

.stat-*
.para-*
.top-hits-*

Chapter Analytics must use:

.chapter-*

Each feature must define its own scoped CSS under:


src/<feature>/styles/


Avoid modifying global popup.css except for utilities.

---

# ✨ 5. Development Workflow

### **1. Create modular folder for new feature**  
`src/chapter-analytics/`

### **2. Add new screens to popup.html**  
Hidden sections:  
- `#chapter-dashboard`  
- `#chapter-analytics-screen`

### **3. Add navigation hooks in popup.ts**  
Only show/hide logic.

### **4. Write feature popup logic inside feature folder**  
`popup/dashboard.ts` and `popup/analytics.ts`

### **5. Write scrapers inside feature folder**  
`tocScraper.ts`, `chapterScraper.ts`

### **6. Add background handlers inside feature folder**  
`background/chapterHandler.ts`

### **7. Implement feature storage**  
`storage/chapterStorage.ts`

### **8. Add styles inside feature folder**  
Under `styles/` with `.chapter-*` namespace.

### **9. Test using Load Unpacked**  
Ensure **Story Analytics still works 100%**.

---

# ✨ 6. Project Vision

Writer Analytics aims to evolve into a comprehensive analytics platform:

- Multi-feature dashboards  
- Cloud sync & login  
- Weekly insights & growth stats  
- AI rewrite suggestions  
- Plot analysis  
- Consistency and character tracking  
- Story health score  

These guidelines ensure the project remains scalable, safe, and organized as it grows.

---

# 🎉 END OF PROJECT GUIDELINES v1.0
