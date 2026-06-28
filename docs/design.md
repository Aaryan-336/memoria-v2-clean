# Memoria v4 Design System — Warm Editorial

## Overview

This redesign transforms Memoria into a warm, paper-like editorial interface while preserving all existing functionality, backend APIs, routing, state management, and user flows.

The goal is NOT to rebuild the application.

The goal is to:
- Create a warm, inviting aesthetic inspired by paper and notebooks.
- Use pastel color-coded cards for content categorization.
- Provide a consistent bottom-dock navigation across all devices.
- Drop dark mode for a unified warm light experience.
- Retain all existing interactions and API contracts.

---

# Design Inspiration

The redesign combines:

1. Warm paper/cream backgrounds (notebook feel).
2. Pastel color-coded content cards (mint, peach, lavender, butter, sky).
3. Clean editorial typography.
4. Floating bottom dock navigation (all screen sizes).
5. Minimal borders, subtle shadows.
6. Content-first density.
7. Consistent responsive design across phone, iPad, and desktop.

Primary references:
- Academic paper collection UIs with colored cards.
- Medical dashboard UIs with warm cream backgrounds.
- Post-digital publishing archives with editorial minimalism.

---

# Design Principles

## 1. Content First

Memories and knowledge must always be the primary focus.
Avoid decorative elements that distract from content.

## 2. Warm & Inviting

Use cream/paper backgrounds and warm borders.
The app should feel like opening a well-crafted notebook.

## 3. Color-Coded Content

Use pastel backgrounds to categorize content by source type:
- Audio → Mint
- YouTube → Peach
- AI/Text → Lavender

## 4. Generous Spacing

Spacing scale: 4, 8, 12, 16, 24, 32, 48.
Never use arbitrary spacing values.

## 5. Responsive Consistency

Same bottom dock on phone, iPad, and desktop.
Content reflows naturally across breakpoints.

---

# Color System

## Background

Primary: #F7F3EE (warm cream)
Secondary: #EDE8E1 (darker cream)
Card: #FFFFFF (white)

## Pastel Card Accents

Mint: #D4EDDA (audio sources)
Lavender: #E8DFF5 (AI/text sources)
Peach: #FCE4D6 (YouTube sources)
Butter: #FFF3CD (study/flashcards)
Sky: #D6EAF8 (quiz/analytics)

## Interactive Accent

Forest Green: #2D6A4F (links, active states, focus rings)

## Text

Primary: #1A1A2E (near-black)
Secondary: #8C8478 (warm gray)
Muted: #A89F94 (lighter warm gray)

## Borders

Border: #E5DDD3 (warm tan)
Input: #E5DDD3

## Status Colors

Destructive: #E85D4A
Success: #2D6A4F
Warning: #D4A843

---

# Typography

Font: Inter (body), system default (headings — bold weight)
Headings: 700 weight
Body: 400–500

Desktop: H1: 36px, H2: 28px, H3: 22px, Body: 16px, Caption: 13px
Tablet: H1: 32px, H2: 26px, Body: 16px
Mobile: H1: 28px, H2: 24px, Body: 15px

---

# Layout System

Max width: 1200px
Content padding: 24px mobile, 32px tablet, 48px desktop

Mobile: Single column
Tablet: Single or 2-column
Desktop: 2-column grid

---

# Navigation

## Bottom Dock (All Screens)

The only navigation element. No sidebar.

5 tabs:
- Home
- Search
- AI
- Notes
- Profile

Phone: Full-width, 72px height, safe-area padding
iPad: Centered, max-w-lg, 72px height
Desktop: Centered, max-w-md, 64px height

Style:
- Floating with cream glass effect
- 28px border radius
- 1px warm border
- Subtle upward shadow
- Active indicator: forest green dot/underline

---

# Cards

Every major feature is a card.

Card styles:
- border-radius: 20px
- padding: 24px
- background: var(--card)
- border: 1px solid var(--border)
- shadow: 0 1px 3px rgba(0,0,0,0.04)

Hover: border-color transitions to --accent-forest

Source-typed cards use pastel backgrounds:
- Audio memory: mint background
- YouTube memory: peach background
- AI/text memory: lavender background

---

# Shadows

Minimal. Prefer borders over shadows.

Card: 0 1px 3px rgba(0,0,0,0.04)
Elevated: 0 4px 12px rgba(0,0,0,0.06)
Nav: 0 -2px 20px rgba(0,0,0,0.06)

---

# Responsive Breakpoints

Mobile: 0–768px
Tablet: 768–1024px
Desktop: 1024px+

---

# Component Rules

DO NOT CHANGE:
- API calls.
- State management.
- Database.
- Authentication.
- Backend endpoints.
- Existing business logic.
- Routing.
- Server actions.
- RAG pipelines.

Only redesign the UI layer.

---

# Accessibility

Minimum contrast: 4.5:1
Touch targets: 44px minimum.
Keyboard support: Required.

---

# Performance

Avoid large animations, heavy gradients, unnecessary re-renders.
Maintain Lighthouse score above 90.

---

# Animations

Duration: 200ms.
Easing: ease-out.
Use: Fade, Scale, Slide.
Avoid: Heavy motion.

---

# Implementation Order

1. Design tokens (globals.css).
2. Theme provider simplification.
3. Layout (remove sidebar accommodation).
4. Navigation dock (bottom dock all screens).
5. Dashboard.
6. Auth pages.
7. Feature pages (record, ask, youtube, search, notes).
8. Pricing and billing pages.
9. Components (workspace switcher, pricing card, etc.).
10. Responsive polish.
