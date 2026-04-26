import { useEffect, useState } from "react";
import { THEMES } from "@/game/themes";
import type { GameSettings, ThemeName } from "@/game/types";
import { sound } from "@/game/sound";

interface Props {
  settings: GameSettings;
  onSave: (s: GameSettings) => void;
  onCancel: () => void;
}

type Row = {
  key: keyof GameSettings; label: string; options: { label: string; value: GameSettings[keyof GameSettings] }[];
};

const ROWS: Row[] = [
  { key: "winScore", label: "Win Score", options: [
    { label: "7", value: 7 }, { label: "11", value: 11 }, { label: "15", value: 15 }, { label: "21", value: 21 },
  ] },
  { key: "difficulty", label: "AI Difficulty", options: [
    { label: "EASY", value: "EASY" }, { label: "MED", value: "MEDIUM" }, { label: "HARD", value: "HARD" }, { label: "∞", value: "PERFECT" },
  ] },
  { key: "ballSpeed", label: "Ball Speed", options: [
    { label: "SLOW", value: "SLOW" }, { label: "NORMAL", value: "NORMAL" }, { label: "FAST", value: "FAST" },
  ] },
  { key: "powerUpsEnabled", label: "Power-Ups", options: [
    { label: "ON", value: true }, { label: "OFF", value: false },
  ] },
  { key: "soundEnabled", label: "Sound", options: [
    { label: "ON", value: true }, { label: "OFF", value: false },
  ] },
  { key: "theme", label: "Background", options: [
    { label: "SPACE", value: "SPACE" }, { label: "DARK", value: "DARK" }, { label: "NEON", value: "NEON" },
  ] },
];

export function SettingsScreen({ settings, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<GameSettings>(settings);
  const [row, setRow] = useState(0);
  const theme = THEMES[draft.theme as ThemeName];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { sound.menuMove(); onCancel(); return; }
      if (e.key === "Enter") { sound.menuSelect(); onSave(draft); return; }
      if (e.key === "ArrowDown") { sound.menuMove(); setRow((r) => (r + 1) % ROWS.length); }
      else if (e.key === "ArrowUp") { sound.menuMove(); setRow((r) => (r - 1 + ROWS.length) % ROWS.length); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const r = ROWS[row];
        const opts = r.options;
        const cur = opts.findIndex((o) => o.value === (draft[r.key] as unknown));
        const next = e.key === "ArrowRight" ? (cur + 1) % opts.length : (cur - 1 + opts.length) % opts.length;
        sound.menuMove();
        setDraft({ ...draft, [r.key]: opts[next].value } as GameSettings);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, draft, onCancel, onSave]);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
      <div className="w-full max-w-2xl mx-auto p-10 rounded-xl" style={{
        border: `1px solid ${theme.divider}`, background: "#00000055",
        boxShadow: `0 0 60px ${theme.p1}22`,
      }}>
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.4em]" style={{ color: theme.accent }}>configure</div>
          <h2 className="text-3xl font-bold tracking-widest mt-2" style={{ color: theme.ball }}>SETTINGS</h2>
        </div>
        <div className="space-y-3">
          {ROWS.map((r, i) => {
            const active = i === row;
            const color = i % 2 === 0 ? theme.p1 : theme.p2;
            return (
              <div key={r.key} className="flex items-center gap-4 px-4 py-3 rounded-md transition-all" style={{
                background: active ? color + "0d" : "transparent",
                border: `1px solid ${active ? color : "#ffffff10"}`,
              }}>
                <div className="text-sm tracking-widest min-w-[180px]" style={{ color: active ? color : "#cbd5e1" }}>
                  {r.label.toUpperCase()}
                </div>
                <div className="flex flex-1 gap-2 justify-end">
                  {r.options.map((o) => {
                    const sel = (draft[r.key] as unknown) === o.value;
                    return (
                      <button key={String(o.value)} onClick={() => { sound.menuMove(); setDraft({ ...draft, [r.key]: o.value } as GameSettings); }}
                        className="px-4 py-1.5 rounded text-xs font-bold tracking-widest transition-all"
                        style={{
                          background: sel ? color + "33" : "#ffffff05",
                          color: sel ? color : "#94a3b8",
                          border: `1px solid ${sel ? color : "#ffffff10"}`,
                        }}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex justify-between items-center text-[11px] tracking-[0.3em]" style={{ color: theme.accent }}>
          <span>↑↓  ROW    ←→  CHANGE</span>
          <div className="flex gap-4">
            <button className="px-4 py-2 rounded font-bold" style={{ border: `1px solid ${theme.p1}`, color: theme.p1 }}
              onClick={() => onSave(draft)}>SAVE [ENTER]</button>
            <button className="px-4 py-2 rounded font-bold" style={{ border: `1px solid #ffffff22`, color: "#cbd5e1" }}
              onClick={onCancel}>CANCEL [ESC]</button>
          </div>
        </div>
      </div>
    </div>
  );
}
