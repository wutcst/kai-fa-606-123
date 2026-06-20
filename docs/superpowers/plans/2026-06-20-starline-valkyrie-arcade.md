# Starline Valkyrie Arcade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete vanilla Canvas horizontal arcade shooter focused on immediate action and high feedback.

**Architecture:** Keep simulation rules in small testable ES modules and render with a single Canvas layer plus HTML HUD overlays. Do not add a framework or external asset pipeline.

**Tech Stack:** HTML, CSS, vanilla ES modules, Canvas 2D, Node built-in test runner.

---

### Task 1: Core Arcade Rules

**Files:**
- Create: `package.json`
- Create: `src/game/rules.js`
- Create: `tests/rules.test.js`

- [ ] Write failing tests for auto-fire timing, combo timeout, kill rewards, power pickup, and boss spawn timing.
- [ ] Run `npm test` and confirm tests fail because implementation is missing.
- [ ] Implement the minimal rule helpers in `src/game/rules.js`.
- [ ] Run `npm test` and confirm tests pass.

### Task 2: Playable Canvas Game

**Files:**
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/main.js`
- Create: `src/game/game.js`
- Create: `src/game/render.js`

- [ ] Build the game loop, input, entities, collision, scoring, powerups, bomb, pause, restart, and boss.
- [ ] Render procedural ships, bullets, particles, parallax stars, health, combo, power, and overlays.
- [ ] Keep the first screen as the playable game surface.

### Task 3: Verification

**Files:**
- Existing files from Tasks 1-2.

- [ ] Run `npm test`.
- [ ] Start a local static server.
- [ ] Open the game in a browser automation context and verify the canvas is nonblank.
- [ ] Check that no required runtime errors appear in the browser console.
