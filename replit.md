# Ultimate Pong

A feature-rich, arcade-styled Pong game built as a React + Vite web app inside the pnpm monorepo.

## Artifacts
- `artifacts/ultimate-pong` — React+Vite web app (main game)
- `artifacts/api-server`, `artifacts/mockup-sandbox` — scaffolded but unused by this game

## Features
- 3 game modes: 1P vs AI (4 difficulty levels with prediction engine), 2P local, Tournament best-of-3
- 7 power-ups: SPEED_BOOST, ENLARGE, SHRINK_OPP, MULTI_BALL, GHOST, FREEZE, REVERSE
- Particle FX, screen shake, paddle squish on hit, animated trails on the ball
- 3 themes: SPACE (stars + nebulae), DARK (minimal), NEON (vivid + scanlines)
- Procedural Web Audio sound engine — no audio assets, all tones synthesized
- Animated main menu (typewriter title, hover glow), settings, hall of fame
- Pause overlay with live stats; round summary; victory screen with fireworks
- Settings + hall of fame persisted in `localStorage`
- AI features: lookahead/prediction (HARD/PERFECT), reaction-time delay, error noise, opponent-bias compensation, lead-based difficulty modulation

## Architecture
- Game logic + rendering live in a single `GameEngine` class on an HTML5 Canvas (`src/game/engine.ts`).
- React owns screen state (MENU / MODE_SETUP / NAME_ENTRY / GAME / PAUSE / ROUND_SUMMARY / WIN / SETTINGS / HALL_OF_FAME) and overlays.
- Engine exposes lifecycle (`start/stop/pause/resume/togglePause`), input forwarding, and event callbacks (`onScore/onRoundEnd/onMatchEnd/onPause`).
- No backend — fully frontend, no API calls, no database.

## Controls
- Player 1: W / S
- Player 2 (or AI): ↑ / ↓
- P or Space: pause
- M: mute/unmute
- Esc: pause from in-game; back from menus

## Files of interest
- `src/App.tsx` — top-level orchestrator, all screen routing
- `src/game/engine.ts` — physics, AI, particles, rendering, scoring, tournament logic
- `src/game/sound.ts` — Web Audio sound engine
- `src/game/storage.ts` — localStorage helpers (settings + hall of fame)
- `src/game/themes.ts` — theme palettes + power-up colors/labels/glyphs
- `src/components/*` — menu/settings/HoF/name-entry/difficulty/pause/win screens
