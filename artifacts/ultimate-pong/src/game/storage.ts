import type { GameSettings, HallOfFameEntry } from "./types";

const SETTINGS_KEY = "ultimate-pong:settings";
const HOF_KEY = "ultimate-pong:hall-of-fame";

export const DEFAULT_SETTINGS: GameSettings = {
  winScore: 11,
  difficulty: "MEDIUM",
  ballSpeed: "NORMAL",
  powerUpsEnabled: true,
  soundEnabled: true,
  theme: "SPACE",
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: GameSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function loadHallOfFame(): HallOfFameEntry[] {
  try {
    const raw = localStorage.getItem(HOF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HallOfFameEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHallOfFame(entries: HallOfFameEntry[]) {
  try { localStorage.setItem(HOF_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

export function addHallOfFameEntry(entry: HallOfFameEntry): { entries: HallOfFameEntry[]; isNewRecord: boolean } {
  const all = loadHallOfFame();
  all.push(entry);
  // sort by win margin (winScore - opponentScore) desc, then by shorter duration
  all.sort((a, b) => {
    const marginA = a.winScore - a.opponentScore;
    const marginB = b.winScore - b.opponentScore;
    if (marginB !== marginA) return marginB - marginA;
    return a.matchDurationSeconds - b.matchDurationSeconds;
  });
  const top = all.slice(0, 10);
  saveHallOfFame(top);
  const isNewRecord = top.indexOf(entry) === 0;
  return { entries: top, isNewRecord };
}

export function clearHallOfFame() {
  try { localStorage.removeItem(HOF_KEY); } catch { /* ignore */ }
}
