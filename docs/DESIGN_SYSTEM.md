# 🎨 DESIGN_SYSTEM.md
**Writer Analytics — Design System (v1.0)**  
_Last updated: 2025_

---

# ✨ 1. Purpose of This Design System

This document defines the **visual identity, UI rules, component patterns, and CSS architecture** for the Writer Analytics Chrome Extension.

It ensures:

- Consistency across all features  
- Beautiful, modern UI  
- Seamless experience for users (mostly young authors)  
- Easy Copilot-driven UI generation  
- Fully isolated feature styling  

This system evolves, but the **core tokens** must remain stable.

---

# ✨ 2. Global Style Tokens (Root Variables)

All global tokens live in `popup.css` → `:root`.

```
:root {
  /* Colors */
  --color-bg: #ffffff;
  --color-surface: #ffffff;
  --color-text: #1a202c;
  --color-muted: #6b7280;

  /* Accent gradients */
  --color-accent-a: #10b981;
  --color-accent-b: #6366f1;

  /* Feature-accent seeds */
  --color-teal: #26a69a;
  --color-pink: #ec4899;
  --color-purple: #8b5cf6;
  --color-blue: #3b82f6;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
  --shadow-md: 0 8px 24px rgba(16,24,40,0.08);
  --shadow-lg: 0 12px 32px rgba(16,24,40,0.12);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* Typography */
  --font-family: "Inter", system-ui, sans-serif;

  /* Spacing scale (8px system) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
}
```

---

# ✨ 3. Global Utility Classes

These must go in `popup.css` so all features can use them.

```
/* Typography */
.text-muted { color: var(--color-muted); }
.text-accent {
  background: linear-gradient(135deg, var(--color-accent-a), var(--color-accent-b));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Layout helpers */
.flex { display:flex; }
.flex-col { display:flex; flex-direction:column; }
.center { display:flex; justify-content:center; align-items:center; }

/* Generic card */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}

/* Buttons */
.btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-outline {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-gradient {
  background: linear-gradient(135deg, var(--color-accent-a), var(--color-accent-b));
  color: white;
}
```

---

# ✨ 4. Feature Namespace Rules (MOST IMPORTANT)

To prevent CSS conflicts:

| Feature             | Namespace prefix |
|--------------------|------------------|
| Story Analytics    | `.stat-`, `.para-`, `.top-` |
| **Chapter Analytics** | `.chapter-*` |
| StoryPlot          | `.plot-*` |
| StoryTeller        | `.tts-*` |

Every new feature MUST prefix all CSS classes with its namespace.

---

# ✨ 5. Component Patterns

## ✔ Cards (standard)
```
.card-base {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  background: linear-gradient(145deg, #f8fffd, #ffffff);
}
```

## ✔ Gradient banners
```
.banner {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  color: #1f2937;
  font-weight: 700;
  background: linear-gradient(135deg, #fdf2f8, #e0f2fe);
  box-shadow: var(--shadow-md);
}
```

## ✔ Section Titles
```
.section-title {
  font-weight: 600;
  font-size: 15px;
  margin: var(--space-3) 0 var(--space-2);
  color: var(--color-accent-a);
  display:flex;
  align-items:center;
  gap:6px;
}
```

## ✔ Scrollable panels
```
.scroll-box {
  max-height: 260px;
  overflow-y: auto;
  border-radius: var(--radius-md);
  padding: var(--space-3);
  border: 1px solid #eef2f5;
}
```

---

# ✨ 6. Chapter Analytics Design System Additions

All Chapter Analytics CSS must live inside:

```
src/chapter-analytics/styles/
```

All classes must begin with `.chapter-`.

## Example:

```
.chapter-card {
  background: linear-gradient(145deg, #fef6ff, #ffffff);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.chapter-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
```

---

# ✨ 7. Chapter Analytics UI Layout Rules

### Dashboard layout:
- 1 banner  
- “Track story” CTA card  
- Grid of tracked stories (max 2 per row)  
- Each story card shows:  
  - Title  
  - Chapter count  
  - Drop-off %  
  - Best performing chapter  

### Per-story analytics layout:
- Chapter list grid (2 columns)  
- Each chapter card displays:  
  - Chapter number  
  - Reads, votes, comments  
  - Engagement badge  

---

# ✨ 8. Iconography

We use **emoji-based icons** inside gradients for consistency:

- 📘 Stories  
- 📊 Analytics  
- ✨ Highlights  
- ⭐ Best chapter  
- 🔽 Drop-off  

This keeps the extension visually soft, friendly, suitable for teen writers.

---

# ✨ 9. Shadows & Elevation Rules

Use shadows sparingly:

- Small elements → var(--shadow-sm)  
- Cards → var(--shadow-md)  
- Hovered items → var(--shadow-lg)  

Never use random box-shadows.

---

# ✨ 10. UI Motion Rules

Allow subtle animations:

```
transition: all 0.25s ease;
transform: translateY(-2px);
opacity: 0.95;
```

No bouncing, no strong animations.

---

# 🎉 End of DESIGN SYSTEM v1.0
