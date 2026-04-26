export type ThemeName = "SPACE" | "DARK" | "NEON";

export interface Theme {
  name: ThemeName;
  bg: string;
  p1: string;
  p2: string;
  ball: string;
  accent: string;
  divider: string;
  particles: string[];
  scanlines: boolean;
  showStars: boolean;
  showNebula: boolean;
  glowLayers: number;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "PERFECT";
export type GameMode = "SINGLE" | "LOCAL" | "TOURNAMENT";
export type BallSpeedSetting = "SLOW" | "NORMAL" | "FAST";

export type PowerUpType =
  | "SPEED_BOOST"
  | "ENLARGE"
  | "SHRINK_OPP"
  | "MULTI_BALL"
  | "GHOST"
  | "FREEZE"
  | "REVERSE";

export interface GameSettings {
  winScore: number;
  difficulty: Difficulty;
  ballSpeed: BallSpeedSetting;
  powerUpsEnabled: boolean;
  soundEnabled: boolean;
  theme: ThemeName;
}

export interface HallOfFameEntry {
  name: string;
  winScore: number;
  opponentScore: number;
  date: string;
  mode: GameMode;
  difficulty?: Difficulty;
  longestRally: number;
  matchDurationSeconds: number;
}

export interface MatchStats {
  rally: number;
  longestRally: number;
  ballSpeed: number;
  p1Hits: number;
  p2Hits: number;
  p1Powerups: number;
  p2Powerups: number;
  startedAt: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number;
  startedAt: number;
}

export type Screen =
  | "MENU"
  | "MODE_SETUP"
  | "NAME_ENTRY"
  | "GAME"
  | "PAUSE"
  | "ROUND_SUMMARY"
  | "WIN"
  | "SETTINGS"
  | "HALL_OF_FAME";
