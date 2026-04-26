import { useEffect, useState } from "react";
import { THEMES } from "@/game/themes";
import type { Difficulty, ThemeName } from "@/game/types";
import { sound } from "@/game/sound";

interface Props {
  themeName: ThemeName;
  initial: Difficulty;
  onConfirm: (d: Difficulty) => void;
  onCancel: () => void;
}

const OPTS: { key: Difficulty; label: string; desc: string; speed: number }[] = [
  { key: "EASY", label: "EASY", desc: "lazy returns, slow reactions", speed: 3 },
  { key: "MEDIUM", label: "MEDIUM", desc: "balanced, mostly fair", speed: 5 },
  { key: "HARD", label: "HARD", desc: "predicts your shots", speed: 7 },
  { key: "PERFECT", label: "PERFECT", desc: "good luck", speed: 9 },
];

export function DifficultyPicker({ themeName, initial, onConfirm, onCancel }: Props) {
  const theme = THEMES[themeName];
  const [sel, setSel] = useState<number>(Math.max(0, OPTS.findIndex((o) => o.key === initial)));

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { sound.menuMove(); onCancel(); }
      if (e.key === "ArrowUp" || e.key === "w") { sound.menuMove(); setSel((s) => (s - 1 + OPTS.length) % OPTS.length); }
      if (e.key === "ArrowDown" || e.key === "s") { sound.menuMove(); setSel((s) => (s + 1) % OPTS.length); }
      if (e.key === "Enter") { sound.menuSelect(); onConfirm(OPTS[sel].key); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [sel, onCancel, onConfirm]);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
      <div className="w-full max-w-xl mx-auto p-10 rounded-xl" style={{
        border: `1px solid ${theme.divider}`, background: "#00000055",
        boxShadow: `0 0 80px ${theme.p2}22`,
      }}>
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.4em]" style={{ color: theme.accent }}>opponent</div>
          <h2 className="text-3xl font-bold tracking-widest mt-2" style={{ color: theme.ball }}>SELECT DIFFICULTY</h2>
        </div>
        <div className="space-y-2">
          {OPTS.map((o, i) => {
            const active = i === sel;
            const color = i === 0 ? "#22c55e" : i === 1 ? theme.p1 : i === 2 ? "#fb923c" : "#ef4444";
            return (
              <button key={o.key} onClick={() => { setSel(i); sound.menuSelect(); onConfirm(o.key); }}
                onMouseEnter={() => setSel(i)}
                className="w-full flex items-center gap-4 px-5 py-3 rounded-md transition-all text-left"
                style={{
                  background: active ? color + "1a" : "transparent",
                  border: `1px solid ${active ? color : "#ffffff14"}`,
                  boxShadow: active ? `0 0 18px ${color}55` : "none",
                }}>
                <div className="text-xl font-bold tracking-widest" style={{ color: active ? color : "#cbd5e1" }}>{o.label}</div>
                <div className="text-xs opacity-60 flex-1">{o.desc}</div>
                <div className="flex gap-1 items-center">
                  {Array.from({ length: 9 }).map((_, k) => (
                    <span key={k} className="block w-1.5 h-3 rounded" style={{ background: k < o.speed ? color : "#ffffff14" }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-between text-[11px] tracking-[0.3em]" style={{ color: theme.accent }}>
          <span>↑↓ to navigate · ENTER to begin</span>
          <button onClick={onCancel} className="px-4 py-2 rounded font-bold" style={{ border: `1px solid #ffffff22`, color: "#cbd5e1" }}>BACK</button>
        </div>
      </div>
    </div>
  );
}
