import { POWERUP_COLORS, POWERUP_GLYPHS, POWERUP_LABELS, THEMES } from "./themes";
import type {
  ActivePowerUp,
  Difficulty,
  GameMode,
  GameSettings,
  MatchStats,
  PowerUpType,
  Theme,
} from "./types";
import { sound } from "./sound";

// ============================================================
// CONFIG
// ============================================================
export const CONFIG = {
  WIDTH: 1100,
  HEIGHT: 660,
  PADDLE_W: 14,
  PADDLE_H: 90,
  PADDLE_SPEED: 7.4,
  PADDLE_ACCEL: 1.6,
  PADDLE_DECAY: 0.82,
  BALL_SIZE: 11,
  BALL_START_SPEED: 6.2,
  BALL_MAX_SPEED: 16,
  BALL_SPEED_INC: 0.32,
  TRAIL_LEN: 14,
  POWERUP_SPAWN: 8000, // ms
  POWERUP_DURATION: 7000,
  POWERUP_LIFE_ON_FIELD: 6000,
  WIN_SCORE_DEFAULT: 11,
  MUST_WIN_BY: 2,
  STAR_COUNT: 110,
  NEBULA_COUNT: 5,
  PARTICLE_LIFE: 60,
  MUTLI_BALL_COUNT: 2,
  GHOST_DURATION: 3000,
  FREEZE_DURATION: 3000,
  // Background animation speed multiplier
  BG_SPEED: 1.25,
};

const AI_PROFILE: Record<Difficulty, { speed: number; reactionMs: number; error: number }> = {
  EASY: { speed: 4.0, reactionMs: 350, error: 60 },
  MEDIUM: { speed: 5.6, reactionMs: 180, error: 25 },
  HARD: { speed: 7.4, reactionMs: 60, error: 8 },
  PERFECT: { speed: 9.0, reactionMs: 0, error: 0 },
};

const BALL_SPEED_MULT: Record<string, number> = { SLOW: 0.78, NORMAL: 1, FAST: 1.25 };

const POWERUP_TYPES: PowerUpType[] = [
  "SPEED_BOOST",
  "ENLARGE",
  "SHRINK_OPP",
  "MULTI_BALL",
  "GHOST",
  "FREEZE",
  "REVERSE",
];

interface Star {
  x: number; y: number; size: number; phase: number; speed: number;
  vx: number; vy: number;
}
interface ShootingStar {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
}
interface Nebula { x: number; y: number; r: number; color: string; vx: number; vy: number; }
interface Nebula { x: number; y: number; r: number; color: string; vx: number; vy: number; }

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number;
  cs: [number, number, number]; ce: [number, number, number];
  gravity: number;
}

interface PaddleState {
  side: "L" | "R";
  x: number; y: number; vy: number;
  w: number; h: number; targetH: number;
  color: string; score: number;
  speedMult: number; controlsReversed: boolean; frozen: boolean;
  hitFlash: number; squish: number; glowTimer: number;
  active: ActivePowerUp | null;
  isAI: boolean; difficulty: Difficulty;
  aiTarget: number; aiTargetSetAt: number; aiNextDecision: number;
  powerupsCollected: number; hits: number;
  recentHitPos: number[];
  upKey: string; downKey: string;
  name: string;
}

interface BallState {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; trail: { x: number; y: number }[];
  spin: number;
  isExtra: boolean; ghostUntil: number; ghostFor: "L" | "R" | null;
  alive: boolean;
}

interface FieldPowerUp {
  x: number; y: number; type: PowerUpType; spawnedAt: number;
  baseY: number; phase: number;
}

export interface RoundOutcome {
  winnerSide: "L" | "R"; winnerName: string;
  p1Score: number; p2Score: number; longestRally: number;
}

export interface MatchOutcome {
  winnerSide: "L" | "R"; winnerName: string; loserName: string;
  p1Score: number; p2Score: number; longestRally: number;
  durationSeconds: number; mode: GameMode; difficulty?: Difficulty;
  rounds?: { winnerSide: "L" | "R" }[];
}

export interface EngineCallbacks {
  onScore?: (side: "L" | "R", p1: number, p2: number) => void;
  onRoundEnd?: (outcome: RoundOutcome) => void;
  onMatchEnd?: (outcome: MatchOutcome) => void;
  onPause?: () => void;
}

// Helpers
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const hexToRgb = (hex: string): [number, number, number] => {
  const s = hex.replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const n = parseInt(v, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};
const lerpRgb = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr: number;
  private W = CONFIG.WIDTH;
  private H = CONFIG.HEIGHT;

  // game state
  private theme: Theme;
  private settings: GameSettings;
  private mode: GameMode;
  private callbacks: EngineCallbacks;

  private p1!: PaddleState;
  private p2!: PaddleState;
  private balls: BallState[] = [];
  private fieldPowerups: FieldPowerUp[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private shootingStars: ShootingStar[] = [];
  private nebulae: Nebula[] = [];
  // pointer state for interactive background
  private mouseX = -9999;
  private mouseY = -9999;
  private mouseLastMove = 0;
  private _onPointerMove: ((e: PointerEvent) => void) | null = null;

  // timing
  private rafId = 0;
  private running = false;
  private paused = false;
  private lastFrameTime = 0;
  private accumulatedFrames = 0;
  private accumulatedTime = 0;
  private fps = 60;
  private frameCounter = 0;
  private slowMo = 0; // frames remaining

  private nextPowerUpAt = 0;
  private screenShake = 0;
  private flashColor: string | null = null;
  private flashStrength = 0;

  // banners
  private centerBanner: { text: string; sub?: string; color: string; until: number } | null = null;
  private collectBanner: { side: "L" | "R"; text: string; color: string; until: number } | null = null;

  // round/tournament
  private roundsWon: { L: number; R: number } = { L: 0, R: 0 };
  private roundHistory: { winnerSide: "L" | "R" }[] = [];
  private matchStarted = 0;

  stats: MatchStats = {
    rally: 0, longestRally: 0, ballSpeed: 0,
    p1Hits: 0, p2Hits: 0, p1Powerups: 0, p2Powerups: 0,
    startedAt: 0,
  };

  // input
  private keys: Set<string> = new Set();

  constructor(
    canvas: HTMLCanvasElement,
    settings: GameSettings,
    mode: GameMode,
    p1Name: string,
    p2Name: string,
    callbacks: EngineCallbacks = {},
  ) {
    this.canvas = canvas;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    this.ctx = ctx;
    this.settings = settings;
    this.mode = mode;
    this.theme = THEMES[settings.theme];
    this.callbacks = callbacks;
    sound.setEnabled(settings.soundEnabled);

    this.resize();
    this.initBackground();
    // pointer tracking for interactive star behavior
    this._onPointerMove = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width; const scaleY = this.H / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
      this.mouseLastMove = performance.now();
    };
    window.addEventListener("pointermove", this._onPointerMove);
    this.initPaddles(p1Name, p2Name);
    this.resetBall(true);
    this.matchStarted = performance.now();
    this.stats.startedAt = this.matchStarted;
    this.nextPowerUpAt = performance.now() + CONFIG.POWERUP_SPAWN;
  }

  setSettings(s: GameSettings) {
    this.settings = s;
    this.theme = THEMES[s.theme];
    sound.setEnabled(s.soundEnabled);
  }

  setTheme(t: Theme) { this.theme = t; }

  // ---------- INPUT ----------
  handleKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === " " || k === "p") this.togglePause();
    if (k === "m") {
      const en = sound.toggle();
      this.settings = { ...this.settings, soundEnabled: en };
    }
  }
  handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) this.callbacks.onPause?.();
  }
  pause() { if (!this.paused) { this.paused = true; this.callbacks.onPause?.(); } }
  resume() { this.paused = false; }

  // ---------- INIT ----------
  private resize() {
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private initBackground() {
    this.stars = [];
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
      this.stars.push({
        x: rand(0, this.W),
        y: rand(0, this.H),
        size: rand(0.5, 2.4),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.6, 2.2),
        vx: rand(-0.2, 0.2),
        vy: rand(-0.2, 0.2),
      });
    }
    this.nebulae = [];
    for (let i = 0; i < CONFIG.NEBULA_COUNT; i++) {
      this.nebulae.push({
        x: rand(0, this.W),
        y: rand(0, this.H),
        r: rand(140, 260),
        color: ["#3a1a5c", "#1a3a5c", "#5c1a3a", "#1a5c3a", "#5c3a1a"][i % 5],
        vx: rand(-0.05, 0.05),
        vy: rand(-0.05, 0.05),
      });
    }
  }

  private initPaddles(p1Name: string, p2Name: string) {
    const margin = 32;
    const isAI = this.mode === "SINGLE";
    this.p1 = this.makePaddle("L", margin, p1Name || "PLAYER 1", false, "w", "s");
    this.p2 = this.makePaddle("R", this.W - margin - CONFIG.PADDLE_W, p2Name || (isAI ? "AI" : "PLAYER 2"), isAI, "arrowup", "arrowdown");
    if (isAI) this.p2.difficulty = this.settings.difficulty;
  }

  private makePaddle(side: "L" | "R", x: number, name: string, isAI: boolean, upKey: string, downKey: string): PaddleState {
    return {
      side, x, y: this.H / 2 - CONFIG.PADDLE_H / 2, vy: 0,
      w: CONFIG.PADDLE_W, h: CONFIG.PADDLE_H, targetH: CONFIG.PADDLE_H,
      color: side === "L" ? this.theme.p1 : this.theme.p2, score: 0,
      speedMult: 1, controlsReversed: false, frozen: false,
      hitFlash: 0, squish: 0, glowTimer: 0,
      active: null, isAI, difficulty: this.settings.difficulty,
      aiTarget: this.H / 2, aiTargetSetAt: 0, aiNextDecision: 0,
      powerupsCollected: 0, hits: 0, recentHitPos: [],
      upKey, downKey, name,
    };
  }

  // ---------- LIFECYCLE ----------
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastFrameTime = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.tick(t);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    if (this._onPointerMove) {
      window.removeEventListener("pointermove", this._onPointerMove);
      this._onPointerMove = null;
    }
  }

  // ---------- TICK ----------
  private tick(now: number) {
    const dtMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.accumulatedTime += dtMs;
    this.accumulatedFrames++;
    if (this.accumulatedTime >= 500) {
      this.fps = (this.accumulatedFrames * 1000) / this.accumulatedTime;
      this.accumulatedTime = 0;
      this.accumulatedFrames = 0;
    }
    this.frameCounter++;

    if (!this.paused) {
      const dt = clamp(dtMs / (1000 / 60), 0.4, 2.2); // frame multiplier
      this.update(dt, now);
    }
    this.render();
  }

  // ---------- UPDATE ----------
  private update(dt: number, now: number) {
    const slow = this.slowMo > 0 ? 0.2 : 1;
    if (this.slowMo > 0) this.slowMo--;

    this.updateBackground(dt);
    this.updateInput(dt);
    this.updatePaddles(dt * slow);
    this.updateBalls(dt * slow, now);
    this.updateParticles(dt);
    this.updatePowerups(dt, now);
    this.updateActivePowerups(now);
    this.updateScreenFx(dt);
  }

  private updateBackground(dt: number) {
    if (Math.random() < 0.003 * dt && this.theme.showStars) {
      this.shootingStars.push({
        x: rand(0, this.W * 0.5),
        y: rand(0, this.H * 0.4),
        vx: rand(6, 12) * CONFIG.BG_SPEED,
        vy: rand(2, 5) * CONFIG.BG_SPEED,
        life: 0, max: 50,
      });
    }
    for (const ss of this.shootingStars) {
      ss.x += ss.vx * dt; ss.y += ss.vy * dt; ss.life += dt;
    }
    this.shootingStars = this.shootingStars.filter((s) => s.life < s.max && s.x < this.W + 50);

    for (const n of this.nebulae) {
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -n.r) n.x = this.W + n.r;
      if (n.x > this.W + n.r) n.x = -n.r;
      if (n.y < -n.r) n.y = this.H + n.r;
      if (n.y > this.H + n.r) n.y = -n.r;
    }

    // Move stars with simple physics
    const now = performance.now();
    for (const s of this.stars) {
      s.x += s.vx * dt * 30; s.y += s.vy * dt * 30; // scale movement for visible effect
      // wrap around
      if (s.x < -8) s.x = this.W + 8;
      if (s.x > this.W + 8) s.x = -8;
      if (s.y < -8) s.y = this.H + 8;
      if (s.y > this.H + 8) s.y = -8;
    }

    // Interactive behavior: when the pointer recently moved, affect nearby stars
    const recent = now - this.mouseLastMove < 2500;
    if (recent) {
      const mx = this.mouseX, my = this.mouseY;
      const attractRadius = 120; // radius around mouse where stars interact
      // gather nearby stars
      const nearby: Star[] = [];
      for (const s of this.stars) {
        const dx = s.x - mx, dy = s.y - my;
        if (dx * dx + dy * dy < attractRadius * attractRadius) nearby.push(s);
      }
      if (nearby.length > 0) {
        // center of mass
        let cx = 0, cy = 0;
        for (const s of nearby) { cx += s.x; cy += s.y; }
        cx /= nearby.length; cy /= nearby.length;
        // apply attraction to center and slight repulsion from cursor and pairwise separation
        for (let i = 0; i < nearby.length; i++) {
          const a = nearby[i];
          // attraction towards group center (makes them clump)
          let dx = cx - a.x, dy = cy - a.y; let d = Math.hypot(dx, dy) || 1;
          a.vx += (dx / d) * 0.02 * dt;
          a.vy += (dy / d) * 0.02 * dt;
          // repel from mouse to simulate collision with cursor if too close
          const mdx = a.x - mx, mdy = a.y - my; const md = Math.hypot(mdx, mdy) || 1;
          if (md < 28) {
            const f = (28 - md) / 28;
            a.vx += (mdx / md) * (0.9 * f + 0.1);
            a.vy += (mdy / md) * (0.9 * f + 0.1);
          }
          // mild damping
          a.vx *= 0.98; a.vy *= 0.98;
          // pairwise separation to avoid overlap
          for (let j = i + 1; j < nearby.length; j++) {
            const b = nearby[j];
            const ddx = a.x - b.x, ddy = a.y - b.y; const dist = Math.hypot(ddx, ddy) || 1;
            const minD = (a.size + b.size) * 6; // separation threshold scaled for visibility
            if (dist < minD && dist > 0) {
              const sep = (minD - dist) / minD * 0.5;
              const nx = ddx / dist, ny = ddy / dist;
              a.vx += nx * sep * 0.6; a.vy += ny * sep * 0.6;
              b.vx -= nx * sep * 0.6; b.vy -= ny * sep * 0.6;
            }
          }
        }
      }
    }
  }

  private updateInput(dt: number) {
    // Player 1 controls
    this.applyHumanInput(this.p1, dt);
    if (!this.p2.isAI) this.applyHumanInput(this.p2, dt);
  }

  private applyHumanInput(p: PaddleState, dt: number) {
    if (p.frozen) { p.vy *= 0.6; return; }
    const up = p.controlsReversed ? p.downKey : p.upKey;
    const down = p.controlsReversed ? p.upKey : p.downKey;
    let any = false;
    if (this.keys.has(up)) { p.vy -= CONFIG.PADDLE_ACCEL * dt * p.speedMult; any = true; }
    if (this.keys.has(down)) { p.vy += CONFIG.PADDLE_ACCEL * dt * p.speedMult; any = true; }
    if (!any) p.vy *= Math.pow(CONFIG.PADDLE_DECAY, dt);
    const max = CONFIG.PADDLE_SPEED * p.speedMult;
    p.vy = clamp(p.vy, -max, max);
  }

  private updatePaddles(dt: number) {
    for (const p of [this.p1, this.p2]) {
      if (p.isAI && !p.frozen) this.runAI(p);
      p.y += p.vy * dt;
      // animate height changes
      if (Math.abs(p.h - p.targetH) > 0.5) p.h += (p.targetH - p.h) * 0.18 * dt;
      else p.h = p.targetH;
      const margin = 10;
      p.y = clamp(p.y, margin, this.H - p.h - margin);
      if (p.hitFlash > 0) p.hitFlash -= dt;
      if (p.glowTimer > 0) p.glowTimer -= dt;
      if (p.squish !== 0) p.squish *= 0.85;
    }
  }

  private runAI(p: PaddleState) {
    const profile = AI_PROFILE[p.difficulty];
    const now = performance.now();
    // Find primary ball (lowest index, alive, not extra)
    const ball = this.balls.find((b) => !b.isExtra && b.alive) ?? this.balls[0];
    if (!ball) return;

    const movingTowardAI = (p.side === "R" && ball.vx > 0) || (p.side === "L" && ball.vx < 0);

    if (now >= p.aiNextDecision) {
      // adaptive scoring lead error tweak
      const lead = p.score - (p.side === "R" ? this.p1.score : this.p2.score);
      let errorMod = 1;
      if (lead >= 4) errorMod = 1.5;       // ease off when winning
      else if (lead <= -4) errorMod = 0.6;  // sharper when losing

      let target = ball.y;
      if ((p.difficulty === "HARD" || p.difficulty === "PERFECT") && movingTowardAI) {
        target = this.predictBallY(ball, p.x);
      }
      // Adaptive: if opponent has a hit-position bias, compensate slightly
      if (p.difficulty !== "EASY") {
        const opp = p.side === "R" ? this.p1 : this.p2;
        if (opp.recentHitPos.length >= 5) {
          const avg = opp.recentHitPos.reduce((a, b) => a + b, 0) / opp.recentHitPos.length;
          target += avg * 18 * (p.difficulty === "PERFECT" ? 1 : 0.5);
        }
      }
      target += rand(-profile.error, profile.error) * errorMod;
      p.aiTarget = clamp(target, 0, this.H);
      p.aiNextDecision = now + profile.reactionMs;
    }

    const center = p.y + p.h / 2;
    const diff = p.aiTarget - center;
    const dz = 4;
    const speed = profile.speed * (movingTowardAI ? 1 : 0.55);
    if (diff > dz) p.vy = clamp(p.vy + 1.2, -speed, speed);
    else if (diff < -dz) p.vy = clamp(p.vy - 1.2, -speed, speed);
    else p.vy *= 0.7;
  }

  private predictBallY(ball: BallState, targetX: number): number {
    let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
    const margin = CONFIG.BALL_SIZE;
    let safety = 0;
    while (safety++ < 600) {
      x += vx; y += vy;
      if (y < margin) { y = margin; vy = -vy; }
      else if (y > this.H - margin) { y = this.H - margin; vy = -vy; }
      if ((vx > 0 && x >= targetX) || (vx < 0 && x <= targetX)) break;
    }
    return y;
  }

  // ---------- BALLS ----------
  private resetBall(initial = false) {
    const speedMult = BALL_SPEED_MULT[this.settings.ballSpeed] ?? 1;
    const baseSpeed = CONFIG.BALL_START_SPEED * speedMult;
    const angle = rand(-Math.PI / 6, Math.PI / 6);
    const dir = initial ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
    this.balls = [{
      x: this.W / 2,
      y: this.H / 2,
      vx: Math.cos(angle) * baseSpeed * dir,
      vy: Math.sin(angle) * baseSpeed,
      size: CONFIG.BALL_SIZE,
      color: this.theme.ball,
      trail: [],
      spin: 0,
      isExtra: false,
      ghostUntil: 0, ghostFor: null,
      alive: true,
    }];
    this.stats.rally = 0;
  }

  private updateBalls(dt: number, now: number) {
    const removeAfter: BallState[] = [];
    for (const b of this.balls) {
      if (!b.alive) continue;
      // record trail
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > CONFIG.TRAIL_LEN) b.trail.shift();

      // apply spin (gentle vertical influence)
      b.vy += b.spin * 0.04 * dt;
      b.spin *= Math.pow(0.95, dt);

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // wall collisions
      const m = b.size;
      if (b.y < m) { b.y = m; b.vy = -b.vy; this.spawnSparks(b.x, b.y, "#ffffff", 8); sound.wallHit(); }
      else if (b.y > this.H - m) { b.y = this.H - m; b.vy = -b.vy; this.spawnSparks(b.x, b.y, "#ffffff", 8); sound.wallHit(); }
      // tiny anti-loop noise
      if (Math.random() < 0.005) b.vy += rand(-0.3, 0.3);

      // paddle collisions
      this.checkPaddleHit(b, this.p1, now);
      this.checkPaddleHit(b, this.p2, now);

      // powerup collisions
      this.checkPowerupCollision(b);

      // scoring
      if (b.x < -m * 2) {
        if (!b.isExtra) this.scorePoint("R");
        b.alive = false; removeAfter.push(b);
      } else if (b.x > this.W + m * 2) {
        if (!b.isExtra) this.scorePoint("L");
        b.alive = false; removeAfter.push(b);
      }
    }
    // remove dead extras
    for (const b of removeAfter) {
      const idx = this.balls.indexOf(b);
      if (idx >= 0) this.balls.splice(idx, 1);
    }
    // ensure at least one ball exists between rounds (handled in scorePoint)
    // update primary ball speed stat
    const primary = this.balls.find((b) => !b.isExtra) ?? this.balls[0];
    if (primary) this.stats.ballSpeed = Math.hypot(primary.vx, primary.vy);
  }

  private checkPaddleHit(b: BallState, p: PaddleState, _now: number) {
    if (b.ghostUntil > performance.now() && b.ghostFor && p.side !== b.ghostFor) return;
    const left = p.x, right = p.x + p.w;
    const top = p.y, bot = p.y + p.h;
    if (b.x + b.size < left || b.x - b.size > right) return;
    if (b.y + b.size < top || b.y - b.size > bot) return;
    // sided check: only bounce when moving toward this paddle
    if (p.side === "L" && b.vx > 0) return;
    if (p.side === "R" && b.vx < 0) return;

    // compute hit position
    const hitPos = clamp(((b.y - (p.y + p.h / 2)) / (p.h / 2)), -1, 1);
    const angle = hitPos * (Math.PI / 3); // up to ±60deg
    const speed = Math.min(Math.hypot(b.vx, b.vy) + CONFIG.BALL_SPEED_INC, CONFIG.BALL_MAX_SPEED);
    const dir = p.side === "L" ? 1 : -1;
    b.vx = Math.cos(angle) * speed * dir;
    b.vy = Math.sin(angle) * speed;
    // place ball just outside paddle to prevent stick
    b.x = p.side === "L" ? right + b.size + 0.5 : left - b.size - 0.5;

    // spin from paddle motion
    b.spin = clamp(b.spin + p.vy * 0.5, -8, 8);

    // bookkeeping
    p.hits++;
    if (!b.isExtra) this.stats.rally++;
    if (this.stats.rally > this.stats.longestRally) this.stats.longestRally = this.stats.rally;
    if (p === this.p1) this.stats.p1Hits++;
    else this.stats.p2Hits++;
    p.recentHitPos.push(hitPos);
    if (p.recentHitPos.length > 10) p.recentHitPos.shift();
    p.hitFlash = 4; p.squish = p.side === "L" ? 8 : -8; p.glowTimer = 22;

    this.spawnSparks(b.x, b.y, p.color, 12);
    sound.paddleHit();

    // match-point alert
    if (this.isMatchPoint() && this.frameCounter % 90 === 0) sound.matchPoint();
  }

  private scorePoint(scoredSide: "L" | "R") {
    const scorer = scoredSide === "L" ? this.p1 : this.p2;
    scorer.score++;
    sound.score();
    this.flashColor = scorer.color; this.flashStrength = 1;
    this.screenShake = 10;
    this.spawnBurst(scoredSide === "L" ? this.W * 0.25 : this.W * 0.75, this.H / 2, scorer.color, 30);
    this.callbacks.onScore?.(scoredSide, this.p1.score, this.p2.score);

    // remove all extra balls
    this.balls = this.balls.filter((b) => !b.isExtra && b.alive);
    // check win
    if (this.checkRoundOver()) return;
    // reset
    this.resetBall();
  }

  private isMatchPoint(): boolean {
    const w = this.settings.winScore;
    const a = this.p1.score, b = this.p2.score;
    if (a >= w - 1 && a - b >= CONFIG.MUST_WIN_BY - 1 && a + 1 >= w) return true;
    if (b >= w - 1 && b - a >= CONFIG.MUST_WIN_BY - 1 && b + 1 >= w) return true;
    return false;
  }

  private checkRoundOver(): boolean {
    const w = this.settings.winScore;
    const a = this.p1.score, b = this.p2.score;
    let winner: "L" | "R" | null = null;
    if (a >= w && a - b >= CONFIG.MUST_WIN_BY) winner = "L";
    else if (b >= w && b - a >= CONFIG.MUST_WIN_BY) winner = "R";
    if (!winner) return false;

    // dramatic moment
    this.slowMo = 28;
    const winPaddle = winner === "L" ? this.p1 : this.p2;
    winPaddle.glowTimer = 60;

    if (this.mode === "TOURNAMENT") {
      this.roundsWon[winner]++;
      this.roundHistory.push({ winnerSide: winner });
      const outcome: RoundOutcome = {
        winnerSide: winner, winnerName: winPaddle.name,
        p1Score: this.p1.score, p2Score: this.p2.score,
        longestRally: this.stats.longestRally,
      };
      // tournament end?
      if (this.roundsWon.L >= 2 || this.roundsWon.R >= 2) {
        const matchWinner = this.roundsWon.L >= 2 ? "L" : "R";
        const win = matchWinner === "L" ? this.p1 : this.p2;
        const lose = matchWinner === "L" ? this.p2 : this.p1;
        const m: MatchOutcome = {
          winnerSide: matchWinner, winnerName: win.name, loserName: lose.name,
          p1Score: this.p1.score, p2Score: this.p2.score,
          longestRally: this.stats.longestRally,
          durationSeconds: Math.round((performance.now() - this.matchStarted) / 1000),
          mode: this.mode, difficulty: this.p2.isAI ? this.settings.difficulty : undefined,
          rounds: [...this.roundHistory],
        };
        sound.victory();
        this.callbacks.onMatchEnd?.(m);
      } else {
        this.callbacks.onRoundEnd?.(outcome);
      }
    } else {
      const win = winner === "L" ? this.p1 : this.p2;
      const lose = winner === "L" ? this.p2 : this.p1;
      const m: MatchOutcome = {
        winnerSide: winner, winnerName: win.name, loserName: lose.name,
        p1Score: this.p1.score, p2Score: this.p2.score,
        longestRally: this.stats.longestRally,
        durationSeconds: Math.round((performance.now() - this.matchStarted) / 1000),
        mode: this.mode, difficulty: this.p2.isAI ? this.settings.difficulty : undefined,
      };
      sound.victory();
      this.callbacks.onMatchEnd?.(m);
    }
    this.pause();
    return true;
  }

  resetForNewRound() {
    this.p1.score = 0; this.p2.score = 0;
    this.p1.active = null; this.p2.active = null;
    this.p1.targetH = CONFIG.PADDLE_H; this.p2.targetH = CONFIG.PADDLE_H;
    this.p1.frozen = false; this.p2.frozen = false;
    this.p1.controlsReversed = false; this.p2.controlsReversed = false;
    this.p1.speedMult = 1; this.p2.speedMult = 1;
    this.fieldPowerups = [];
    this.stats = { rally: 0, longestRally: 0, ballSpeed: 0, p1Hits: 0, p2Hits: 0, p1Powerups: 0, p2Powerups: 0, startedAt: performance.now() };
    this.resetBall(true);
    this.resume();
  }

  // ---------- POWERUPS ----------
  private updatePowerups(_dt: number, now: number) {
    if (!this.settings.powerUpsEnabled) return;
    if (this.balls.some((b) => b.isExtra)) return;
    if (now < this.nextPowerUpAt) return;
    if (this.fieldPowerups.length >= 1) return;
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const baseY = rand(this.H * 0.2, this.H * 0.8);
    this.fieldPowerups.push({
      x: rand(this.W * 0.4, this.W * 0.6),
      y: baseY, baseY,
      type, spawnedAt: now,
      phase: rand(0, Math.PI * 2),
    });
    sound.powerUpSpawn();
    this.nextPowerUpAt = now + CONFIG.POWERUP_SPAWN + rand(-2000, 2000);
  }

  private updateActivePowerups(now: number) {
    for (const p of [this.p1, this.p2]) {
      if (p.active && now > p.active.expiresAt) {
        this.deactivatePowerup(p);
      }
    }
    // floating
    for (const fp of this.fieldPowerups) {
      const t = (now - fp.spawnedAt) / 1000;
      fp.y = fp.baseY + Math.sin(t * 2 + fp.phase) * 14;
    }
    // expire
    this.fieldPowerups = this.fieldPowerups.filter((fp) => now - fp.spawnedAt < CONFIG.POWERUP_LIFE_ON_FIELD);
  }

  private checkPowerupCollision(b: BallState) {
    if (!this.settings.powerUpsEnabled) return;
    for (let i = this.fieldPowerups.length - 1; i >= 0; i--) {
      const fp = this.fieldPowerups[i];
      const dx = b.x - fp.x, dy = b.y - fp.y;
      if (dx * dx + dy * dy < (b.size + 18) ** 2) {
        // nearest player to ball
        const distL = Math.abs(b.x - this.p1.x);
        const distR = Math.abs(b.x - (this.p2.x + this.p2.w));
        const collector = distL < distR ? this.p1 : this.p2;
        // ghost stack rule
        const opp = collector === this.p1 ? this.p2 : this.p1;
        if (fp.type === "GHOST" && opp.active?.type === "GHOST") return;
        this.activatePowerup(collector, fp.type);
        this.spawnBurst(fp.x, fp.y, POWERUP_COLORS[fp.type], 20);
        this.fieldPowerups.splice(i, 1);
        sound.powerUpCollect();
        if (collector === this.p1) this.stats.p1Powerups++;
        else this.stats.p2Powerups++;
        collector.powerupsCollected++;
        this.collectBanner = {
          side: collector.side, text: POWERUP_LABELS[fp.type],
          color: POWERUP_COLORS[fp.type],
          until: performance.now() + 1600,
        };
      }
    }
  }

  private activatePowerup(p: PaddleState, type: PowerUpType) {
    if (p.active) this.deactivatePowerup(p);
    const opp = p === this.p1 ? this.p2 : this.p1;
    const now = performance.now();
    const dur =
      type === "GHOST" ? CONFIG.GHOST_DURATION :
      type === "FREEZE" ? CONFIG.FREEZE_DURATION :
      type === "MULTI_BALL" ? 5000 :
      CONFIG.POWERUP_DURATION;
    p.active = { type, startedAt: now, expiresAt: now + dur };
    switch (type) {
      case "SPEED_BOOST": p.speedMult = 2; break;
      case "ENLARGE": p.targetH = CONFIG.PADDLE_H * 1.55; break;
      case "SHRINK_OPP": opp.targetH = CONFIG.PADDLE_H * 0.5; break;
      case "MULTI_BALL": this.spawnExtraBalls(); break;
      case "GHOST": {
        const primary = this.balls.find((b) => !b.isExtra) ?? this.balls[0];
        if (primary) { primary.ghostUntil = now + CONFIG.GHOST_DURATION; primary.ghostFor = p.side; }
        break;
      }
      case "FREEZE": opp.frozen = true; opp.vy = 0; break;
      case "REVERSE": opp.controlsReversed = true; break;
    }
  }

  private deactivatePowerup(p: PaddleState) {
    const opp = p === this.p1 ? this.p2 : this.p1;
    if (!p.active) return;
    switch (p.active.type) {
      case "SPEED_BOOST": p.speedMult = 1; break;
      case "ENLARGE": p.targetH = CONFIG.PADDLE_H; break;
      case "SHRINK_OPP": opp.targetH = CONFIG.PADDLE_H; break;
      case "GHOST": for (const b of this.balls) { b.ghostUntil = 0; b.ghostFor = null; } break;
      case "FREEZE": opp.frozen = false; break;
      case "REVERSE": opp.controlsReversed = false; break;
    }
    p.active = null;
  }

  private spawnExtraBalls() {
    const primary = this.balls.find((b) => !b.isExtra) ?? this.balls[0];
    if (!primary) return;
    const colors = ["#fb923c", "#22c55e"];
    for (let i = 0; i < CONFIG.MUTLI_BALL_COUNT; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = Math.hypot(primary.vx, primary.vy);
      this.balls.push({
        x: primary.x, y: primary.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: CONFIG.BALL_SIZE, color: colors[i] ?? "#ffd166",
        trail: [], spin: 0, isExtra: true, ghostUntil: 0, ghostFor: null, alive: true,
      });
    }
    // remove extras when expired
    setTimeout(() => {
      this.balls = this.balls.filter((b) => !b.isExtra);
    }, 5000);
  }

  // ---------- PARTICLES ----------
  private spawnSparks(x: number, y: number, color: string, count: number) {
    const c = hexToRgb(color);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: rand(-3.5, 3.5) * CONFIG.BG_SPEED, vy: rand(-3.5, 3.5) * CONFIG.BG_SPEED,
        life: CONFIG.PARTICLE_LIFE, max: CONFIG.PARTICLE_LIFE,
        size: rand(2, 4),
        cs: c, ce: [c[0] * 0.2, c[1] * 0.2, c[2] * 0.2],
        gravity: 0.04,
      });
    }
  }
  private spawnBurst(x: number, y: number, color: string, count: number) {
    const c = hexToRgb(color);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2, 6);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp * CONFIG.BG_SPEED, vy: Math.sin(a) * sp * CONFIG.BG_SPEED,
        life: 70, max: 70, size: rand(2, 5),
        cs: c, ce: [255, 255, 255], gravity: 0.05,
      });
    }
  }

  spawnFirework(x: number, y: number) {
    const palette = this.theme.particles;
    const color = palette[Math.floor(Math.random() * palette.length)];
    const c = hexToRgb(color);
    for (let i = 0; i < 35; i++) {
      const a = (i / 35) * Math.PI * 2 + rand(-0.1, 0.1);
      const sp = rand(2.5, 5.5);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp * CONFIG.BG_SPEED, vy: Math.sin(a) * sp * CONFIG.BG_SPEED,
        life: 90, max: 90, size: rand(2, 4),
        cs: c, ce: [10, 10, 30], gravity: 0.06,
      });
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.99;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private updateScreenFx(dt: number) {
    if (this.screenShake > 0) this.screenShake -= dt;
    if (this.flashStrength > 0) this.flashStrength -= 0.06 * dt;
  }

  // ---------- RENDER ----------
  private render() {
    const ctx = this.ctx;
    ctx.save();
    // shake
    if (this.screenShake > 0) {
      ctx.translate(rand(-6, 6), rand(-6, 6));
    }
    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, this.W, this.H);

    this.renderBackground();
    this.renderDivider();
    this.renderCourtGlow();
    this.renderPowerups();
    this.renderParticles();
    this.renderPaddles();
    this.renderBalls();
    this.renderUI();
    this.renderFlash();
    if (this.theme.scanlines) this.renderScanlines();
    ctx.restore();
  }

  private renderBackground() {
    const ctx = this.ctx;
    if (this.theme.showNebula) {
      for (const n of this.nebulae) {
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grd.addColorStop(0, n.color + "55");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (this.theme.showStars) {
      const t = this.frameCounter / 60;
      for (const s of this.stars) {
        const b = 0.4 + 0.6 * Math.abs(Math.sin(t * s.speed + s.phase));
        ctx.fillStyle = `rgba(255,255,255,${b})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      }
      for (const ss of this.shootingStars) {
        const a = 1 - ss.life / ss.max;
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(255,255,255,${a * (1 - i / 6)})`;
          ctx.beginPath();
          ctx.arc(ss.x - ss.vx * i * 0.6, ss.y - ss.vy * i * 0.6, 1.5 - i * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderDivider() {
    const ctx = this.ctx;
    const x = this.W / 2;
    const dashes = 28;
    const gap = this.H / dashes;
    const t = this.frameCounter / 60;
    for (let i = 0; i < dashes; i++) {
      const y = i * gap + 4;
      const a = 0.25 + 0.35 * Math.sin(t * 2 + i * 0.4);
      ctx.fillStyle = this.theme.divider + Math.floor(a * 255).toString(16).padStart(2, "0");
      ctx.fillRect(x - 1.5, y, 3, gap * 0.55);
    }
  }

  private renderCourtGlow() {
    const ctx = this.ctx;
    const intP1 = this.p1.score >= this.p2.score ? 0.18 : 0.08;
    const intP2 = this.p2.score >= this.p1.score ? 0.18 : 0.08;
    const g1 = ctx.createLinearGradient(0, 0, this.W * 0.4, 0);
    g1.addColorStop(0, this.theme.p1 + Math.floor(intP1 * 255).toString(16).padStart(2, "0"));
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, this.W * 0.4, this.H);
    const g2 = ctx.createLinearGradient(this.W, 0, this.W * 0.6, 0);
    g2.addColorStop(0, this.theme.p2 + Math.floor(intP2 * 255).toString(16).padStart(2, "0"));
    g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2; ctx.fillRect(this.W * 0.6, 0, this.W * 0.4, this.H);
  }

  private renderPaddles() {
    const ctx = this.ctx;
    for (const p of [this.p1, this.p2]) {
      const baseColor = p.color;
      const layers = this.theme.glowLayers + (p.glowTimer > 0 ? 3 : 0);
      // glow
      for (let i = layers; i >= 1; i--) {
        const a = (0.06 + (p.glowTimer > 0 ? 0.04 : 0)) * (1 - i / (layers + 1));
        ctx.fillStyle = baseColor + Math.floor(a * 255).toString(16).padStart(2, "0");
        const pad = i * 4;
        const sq = p.squish * (i / layers);
        const w = p.w + pad * 2 - Math.abs(sq);
        const h = p.h + pad * 2 + Math.abs(sq);
        const x = p.x - pad + Math.min(0, sq);
        const y = p.y - pad - Math.abs(sq) / 2;
        this.roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
      }
      // body
      ctx.fillStyle = p.hitFlash > 0 ? "#ffffff" : baseColor;
      const sq = p.squish;
      this.roundRect(ctx, p.x + Math.min(0, sq), p.y, p.w + Math.abs(sq), p.h, 6);
      ctx.fill();
      // freeze indicator
      if (p.frozen) {
        ctx.fillStyle = "#3b82f6cc";
        this.roundRect(ctx, p.x - 2, p.y - 2, p.w + 4, p.h + 4, 6);
        ctx.fill();
      }
      // reverse indicator
      if (p.controlsReversed) {
        ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2;
        this.roundRect(ctx, p.x - 3, p.y - 3, p.w + 6, p.h + 6, 7); ctx.stroke();
      }
    }
  }

  private renderBalls() {
    const ctx = this.ctx;
    for (const b of this.balls) {
      // trail
      for (let i = 0; i < b.trail.length; i++) {
        const t = i / b.trail.length;
        const a = t * 0.6;
        const r = b.size * (0.3 + t * 0.7);
        ctx.fillStyle = b.color + Math.floor(a * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(b.trail[i].x, b.trail[i].y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // glow
      for (let i = 4; i >= 1; i--) {
        const a = 0.12 * (1 - i / 5);
        ctx.fillStyle = b.color + Math.floor(a * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size + i * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // body
      const ghost = b.ghostUntil > performance.now();
      if (ghost) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderPowerups() {
    const ctx = this.ctx;
    const now = performance.now();
    for (const fp of this.fieldPowerups) {
      const color = POWERUP_COLORS[fp.type];
      const lifeLeft = 1 - (now - fp.spawnedAt) / CONFIG.POWERUP_LIFE_ON_FIELD;
      // glow halo
      for (let i = 5; i >= 1; i--) {
        const a = 0.08 * (1 - i / 6);
        ctx.fillStyle = color + Math.floor(a * 255).toString(16).padStart(2, "0");
        ctx.beginPath(); ctx.arc(fp.x, fp.y, 22 + i * 4, 0, Math.PI * 2); ctx.fill();
      }
      // body
      const pulse = 1 + Math.sin(now / 200) * 0.06;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(fp.x, fp.y, 18 * pulse, 0, Math.PI * 2); ctx.fill();
      // glyph
      ctx.fillStyle = "#0a0a1a";
      ctx.font = "bold 20px " + (this.theme.name === "NEON" ? "monospace" : "system-ui");
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const angle = (now / 600) * (Math.PI / 2);
      ctx.save();
      ctx.translate(fp.x, fp.y); ctx.rotate(angle * 0.2);
      ctx.fillText(POWERUP_GLYPHS[fp.type], 0, 1);
      ctx.restore();
      // countdown ring
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, 26, -Math.PI / 2, -Math.PI / 2 + lifeLeft * Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const t = 1 - p.life / p.max;
      const c = lerpRgb(p.cs, p.ce, t);
      const a = (1 - t) * 0.95;
      const r = Math.max(0.5, p.size * (1 - t * 0.7));
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderUI() {
    const ctx = this.ctx;
    // scoreboard
    ctx.font = "bold 84px 'JetBrains Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = this.theme.p1 + "cc";
    ctx.fillText(String(this.p1.score), this.W * 0.32, 36);
    ctx.fillStyle = this.theme.p2 + "cc";
    ctx.fillText(String(this.p2.score), this.W * 0.68, 36);

    ctx.font = "bold 13px system-ui";
    ctx.fillStyle = this.theme.p1;
    ctx.fillText(this.p1.name.toUpperCase(), this.W * 0.32, 16);
    ctx.fillStyle = this.theme.p2;
    ctx.fillText(this.p2.name.toUpperCase(), this.W * 0.68, 16);

    // win progress bars
    this.renderProgressBar(this.W * 0.18, 132, 180, 8, this.p1.score / this.settings.winScore, this.theme.p1);
    this.renderProgressBar(this.W * 0.82 - 180, 132, 180, 8, this.p2.score / this.settings.winScore, this.theme.p2);

    // tournament rounds
    if (this.mode === "TOURNAMENT") {
      ctx.fillStyle = "#ffffff99";
      ctx.font = "12px system-ui";
      const round = Math.min(this.roundsWon.L + this.roundsWon.R + 1, 3);
      ctx.fillText(`ROUND ${round} / 3`, this.W / 2, 36);
      ctx.fillText(`${this.roundsWon.L} - ${this.roundsWon.R}`, this.W / 2, 56);
    }

    // active powerups bars
    for (const p of [this.p1, this.p2]) {
      if (p.active) {
        const t = (p.active.expiresAt - performance.now()) / (p.active.expiresAt - p.active.startedAt);
        const w = 160;
        const x = p.side === "L" ? this.W * 0.18 : this.W * 0.82 - w;
        ctx.fillStyle = "#ffffff22";
        this.roundRect(ctx, x, 154, w, 6, 3); ctx.fill();
        ctx.fillStyle = POWERUP_COLORS[p.active.type];
        this.roundRect(ctx, x, 154, w * Math.max(0, t), 6, 3); ctx.fill();
        ctx.fillStyle = POWERUP_COLORS[p.active.type];
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = p.side === "L" ? "left" : "right";
        ctx.fillText(POWERUP_LABELS[p.active.type], p.side === "L" ? x : x + w, 168);
        ctx.textAlign = "center";
      }
    }

    // collect banner
    if (this.collectBanner && performance.now() < this.collectBanner.until) {
      ctx.fillStyle = this.collectBanner.color;
      ctx.font = "bold 20px system-ui";
      ctx.fillText(
        this.collectBanner.text,
        this.collectBanner.side === "L" ? this.W * 0.25 : this.W * 0.75,
        200,
      );
    }

    // match point / deuce
    if (this.p1.score >= this.settings.winScore - 1 && this.p2.score >= this.settings.winScore - 1 && this.p1.score === this.p2.score) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 24px system-ui";
      const pulse = 0.6 + Math.abs(Math.sin(this.frameCounter / 12)) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillText("DEUCE", this.W / 2, 200);
      ctx.globalAlpha = 1;
    } else if (this.isMatchPoint()) {
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 24px system-ui";
      const pulse = 0.6 + Math.abs(Math.sin(this.frameCounter / 12)) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.fillText("MATCH POINT", this.W / 2, 200);
      ctx.globalAlpha = 1;
    }

    // FPS
    ctx.fillStyle = "#ffffff55";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(this.fps)} FPS`, 14, this.H - 22);
    ctx.textAlign = "right";
    ctx.fillText(`RALLY ${this.stats.rally}  •  LONGEST ${this.stats.longestRally}`, this.W - 14, this.H - 22);
    ctx.textAlign = "center";

    // mute icon
    if (!this.settings.soundEnabled) {
      ctx.fillStyle = "#ffffff88";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("MUTED [M]", 14, 16);
      ctx.textAlign = "center";
    }

    // pause overlay (handled by react too, but indicate)
    if (this.paused && this.running) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 56px system-ui";
      ctx.fillText("PAUSED", this.W / 2, this.H / 2 - 30);
      ctx.font = "16px system-ui";
      ctx.fillStyle = "#ffffffaa";
      ctx.fillText("[P / SPACE] RESUME    [M] MUTE    [ESC] MENU", this.W / 2, this.H / 2 + 30);
    }
  }

  private renderProgressBar(x: number, y: number, w: number, h: number, t: number, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = "#ffffff14";
    this.roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = color;
    this.roundRect(ctx, x, y, w * clamp(t, 0, 1), h, h / 2); ctx.fill();
  }

  private renderFlash() {
    if (this.flashStrength <= 0 || !this.flashColor) return;
    const ctx = this.ctx;
    const a = clamp(this.flashStrength, 0, 1);
    ctx.fillStyle = this.flashColor + Math.floor(a * 90).toString(16).padStart(2, "0");
    ctx.fillRect(0, 0, this.W, this.H);
  }

  private renderScanlines() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < this.H; y += 4) {
      ctx.fillRect(0, y, this.W, 1);
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  // Public utility
  getStats() { return this.stats; }
  getFps() { return this.fps; }
  isPaused() { return this.paused; }
  getMode() { return this.mode; }
  getRoundsWon() { return this.roundsWon; }
  getPlayerNames(): [string, string] { return [this.p1.name, this.p2.name]; }
  getActivePowerup(side: "L" | "R") { return side === "L" ? this.p1.active : this.p2.active; }
}
