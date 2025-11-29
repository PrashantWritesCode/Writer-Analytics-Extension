# 🤖 COPILOT_RULES.md

**Writer Analytics — Copilot Behavior Rules (v1.0)**  
_Last updated: 2025_

---

# ⚠️ 1. Critical Rule — DO NOT MODIFY EXISTING STORY ANALYTICS CODE

Copilot must *never* modify or generate changes inside the following files unless explicitly asked:

- `src/content.ts`
- `src/background.ts` (WA_* handlers)
- `src/popup/popup.ts` (story logic)
- `popup.html` (existing Story Analytics UI)
- `popup.css` (existing Story Analytics CSS)

These files contain **production-stable logic** used by real users.  
Copilot must treat them as **read-only**.

---

# 🧩 2. Feature Isolation Rules

Every new feature (e.g., Chapter Analytics, StoryPlot, StoryTeller, Growth Tracking) must be implemented inside its own folder:

```
src/<feature-name>/
    popup/
    background/
    content/
    storage/
    ui/
    styles/
```

Copilot must **not mix** code between features.

### ❌ Not allowed:
- Adding new feature logic into popup.ts  
- Adding new scraping code into content.ts  
- Adding new message handlers inside background.ts  

### ✔ Allowed:
- Adding navigation hooks in popup.ts
- Adding message routing stubs in background.ts
- Adding UI containers in popup.html

All logic must live inside feature folders only.

---

# 🧭 3. Popup Navigation Rules

Copilot must keep `popup.ts` strictly limited to:

- show/hide screen functions  
- event listeners  
- calling `init()` from feature modules  
- routing to screens  

### ❌ Do NOT:
- Write scraping logic  
- Write analytics computation  
- Write storage logic  
- Write direct DOM scraping  
- Write API calls  

All of that belongs inside the feature modules.

---

# 🛰️ 4. Background Message Routing Rules

`background.ts` must NOT contain new logic.

Copilot must:

### ✔ Add new message routing only:
```ts
if (message.type.startsWith("CHAPTER_")) {
    return chapterHandler(message, sender, sendResponse);
}
```

### ❌ Do NOT:
- Add logic directly in background.ts  
- Modify existing WA_* logic  
- Change auto-injected scrapers  

All new logic must go inside:
```
src/chapter-analytics/background/chapterHandler.ts
```

---

# 🕵️ 5. Scraper Rules

## Story Analytics Scraper
- Lives in `src/content.ts`
- Auto-runs using manifest
- Must NOT be modified

## Chapter Analytics Scrapers
Must live inside:
```
src/chapter-analytics/content/
```

Copilot must ensure:

### ✔ Use manual injection:
```ts
chrome.scripting.executeScript({...})
```

### ✔ Use isolated DOM selectors  
### ✔ No auto-run behavior  
### ✔ No interfering with Story Analytics selectors  

---

# 💾 6. Storage Rules

Each feature must have isolated storage.

## Story Analytics
Key format:
```
writerAnalyticsStats-<storyId>
```

## Chapter Analytics
Key format:
```
chapterAnalytics.trackedStories
chapterAnalytics.snapshots.<storyId>
chapterAnalytics.settings
```

Copilot must:

- NEVER mix feature storage keys  
- NEVER reuse Story Analytics keys  
- ALWAYS create a dedicated storage wrapper inside:  
  `src/chapter-analytics/storage/`

---

# 🎨 7. CSS & UI Rules

Global CSS lives in:
`popup.css`  
Copilot must NOT modify Story Analytics CSS classes.

## New features must:

- Create a dedicated CSS file:  
  ```
  src/<feature>/styles/*.css
  ```

- Use required namespace prefix:
  - Chapter Analytics → `.chapter-*`
  - Plot feature → `.plot-*`
  - TTS feature → `.tts-*`

### ❌ Never mix Story Analytics CSS with new feature CSS.

---

# 📦 8. Naming Conventions

## Message Prefixes
Copilot must follow:

| Feature | Prefix |
|--------|--------|
| Story Analytics | `WA_*` |
| Chapter Analytics | `CHAPTER_*` |
| StoryPlot | `PLOT_*` |
| StoryTeller | `TTS_*` |

## File Naming
- Scrapers → `SomethingScraper.ts`
- Background handlers → `*Handler.ts`
- UI components → PascalCase
- CSS filenames → lowercase with dashes

---

# 🧱 9. Code Generation Rules

Copilot MUST:

### ✔ Keep all new logic modular  
### ✔ Generate strongly typed TypeScript  
### ✔ Use async/await for async code  
### ✔ Use feature-level wrappers for storage  
### ✔ Use clean DOM selectors  
### ✔ Add clear comments  

And Copilot must NOT:

### ❌ Inject script incorrectly (must use chrome.scripting)  
### ❌ Call deprecated APIs  
### ❌ Place logic in popup.ts  
### ❌ Touch manifest.json unless instructed  
### ❌ Pollute global CSS  

---

# 🧪 10. Testing Rules

Copilot must ensure:

- All new screens are hidden by default  
- Navigation is smooth  
- WA_* features remain functional  
- New scrapers do not interfere with content.ts  
- No console errors  
- No infinite loops in background or popup  

---

# 🔮 11. Future-Proofing Rules

Copilot must generate code that supports:

- Easily adding backend sync  
- Snapshot-based chapter tracking  
- User accounts  
- Multiple stories  
- Bulk scraping  
- Efficient storage  

---

# 🎉 END OF COPILOT BEHAVIOR RULES v1.0
