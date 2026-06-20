# Character Card Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pointer-following pink-purple glow border to home-page character cards.

**Architecture:** A focused `GlowingEffect` client component owns pointer tracking and border rendering. `CharacterCard` only mounts that effect inside its existing relative card container, preserving all current behavior.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4

---

### Task 1: Add the glow component

**Files:**
- Create: `src/components/ui/glowing-effect.tsx`

- [ ] **Step 1: Implement the supplied pointer tracking**

Create a memoized client component that:

- tracks global pointer movement and scroll position;
- calculates whether the pointer is inside the configured proximity range;
- animates the conic-mask angle with `requestAnimationFrame`;
- renders a pointer-events-none pink-purple border layer;
- cancels pending animation frames and removes listeners on cleanup.

- [ ] **Step 2: Type-check the component**

Run: `pnpm.cmd ts-check`

Expected: exit code 0.

### Task 2: Mount the effect in character cards

**Files:**
- Modify: `src/components/CharacterCard.tsx`

- [ ] **Step 1: Import and render `GlowingEffect`**

Place the effect as the first child of the existing relative card container
with `disabled={false}`, `proximity={80}`, `spread={28}`,
`movementDuration={1.2}`, and `borderWidth={2}`.

- [ ] **Step 2: Verify static quality gates**

Run: `pnpm.cmd ts-check`

Expected: exit code 0.

Run: `pnpm.cmd eslint src/components/CharacterCard.tsx src/components/ui/glowing-effect.tsx`

Expected: exit code 0 with no lint errors.

### Task 3: Verify the interaction

**Files:**
- No source changes expected

- [ ] **Step 1: Open the home page**

Start the existing development server and open its configured local URL.

- [ ] **Step 2: Check behavior**

Verify that:

- the glow follows the pointer near each card;
- the border is pink-purple and visually balanced;
- card content and layout do not move;
- clicking a card still opens that character's chat.
