import type { Theme, ThemeName } from "./types";

export const THEMES: Record<ThemeName, Theme> = {
  SPACE: {
    name: "SPACE",
    bg: "#0a0a1a",
    p1: "#00ffff",
    p2: "#ff4da6",
    ball: "#ffffff",
    accent: "#a78bfa",
    divider: "#3b3b5e",
    particles: ["#00ffff", "#ff4da6", "#ffd166", "#a78bfa", "#22d3ee", "#fff"],
    scanlines: false,
    showStars: true,
    showNebula: true,
    glowLayers: 5,
  },
  DARK: {
    name: "DARK",
    bg: "#0d0d10",
    p1: "#39ff14",
    p2: "#ff6600",
    ball: "#eeeeee",
    accent: "#888888",
    divider: "#222230",
    particles: ["#39ff14", "#ff6600", "#eeeeee", "#888888", "#22d3ee", "#facc15"],
    scanlines: false,
    showStars: false,
    showNebula: false,
    glowLayers: 3,
  },
  NEON: {
    name: "NEON",
    bg: "#000000",
    p1: "#ff00ff",
    p2: "#ffff00",
    ball: "#00ffff",
    accent: "#ff00aa",
    divider: "#ff00ff",
    particles: ["#ff00ff", "#ffff00", "#00ffff", "#ff66ff", "#66ffff", "#ffffff"],
    scanlines: true,
    showStars: false,
    showNebula: false,
    glowLayers: 8,
  },
};

export const POWERUP_COLORS: Record<string, string> = {
  SPEED_BOOST: "#facc15",
  ENLARGE: "#22c55e",
  SHRINK_OPP: "#ef4444",
  MULTI_BALL: "#fb923c",
  GHOST: "#f8fafc",
  FREEZE: "#3b82f6",
  REVERSE: "#a855f7",
};

export const POWERUP_LABELS: Record<string, string> = {
  SPEED_BOOST: "SPEED BOOST",
  ENLARGE: "ENLARGE",
  SHRINK_OPP: "SHRINK OPP",
  MULTI_BALL: "MULTI-BALL",
  GHOST: "GHOST",
  FREEZE: "FREEZE",
  REVERSE: "REVERSE",
};

export const POWERUP_GLYPHS: Record<string, string> = {
  SPEED_BOOST: "»",
  ENLARGE: "+",
  SHRINK_OPP: "−",
  MULTI_BALL: "○",
  GHOST: "◌",
  FREEZE: "❄",
  REVERSE: "↔",
};
