import { useEffect } from "react";
import { THEMES } from "@/game/themes";
import type { HallOfFameEntry, ThemeName } from "@/game/types";
import { sound } from "@/game/sound";

interface Props {
  entries: HallOfFameEntry[];
  themeName: ThemeName;
  highlightIdx?: number;
  onBack: () => void;
}

export function HallOfFame({ entries, themeName, highlightIdx, onBack }: Props) {
  const theme = THEMES[themeName];
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === "q") { sound.menuSelect(); onBack(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onBack]);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
      <div className="w-full max-w-3xl p-10 rounded-xl" style={{ border: `1px solid ${theme.divider}`, background: "#00000055", boxShadow: `0 0 60px ${theme.p2}22` }}>
        <div className="text-center mb-6">
          <div className="text-[11px] tracking-[0.4em]" style={{ color: theme.accent }}>champions</div>
          <h2 className="text-3xl font-bold tracking-widest mt-2" style={{ color: theme.ball }}>HALL OF FAME</h2>
        </div>
        {entries.length === 0 ? (
          <div className="text-center py-16 opacity-60">
            <div className="text-xl mb-2">No records yet.</div>
            <div className="text-sm">Win a match to claim your place.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="text-[11px] tracking-widest opacity-60">
                <tr className="border-b" style={{ borderColor: theme.divider }}>
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">NAME</th>
                  <th className="text-left py-2 px-2">SCORE</th>
                  <th className="text-left py-2 px-2">MODE</th>
                  <th className="text-left py-2 px-2">RALLY</th>
                  <th className="text-left py-2 px-2">TIME</th>
                  <th className="text-left py-2 px-2">DATE</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const isNew = i === highlightIdx;
                  return (
                    <tr key={i} className="border-b transition-all" style={{
                      borderColor: theme.divider + "55",
                      background: isNew ? theme.p1 + "1a" : "transparent",
                      color: isNew ? theme.p1 : "#e6e6f0",
                    }}>
                      <td className="py-2 px-2 font-bold">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-2 px-2 font-bold">{e.name}{isNew && <span className="ml-2 animate-pulse-soft" style={{ color: theme.p1 }}>★ NEW</span>}</td>
                      <td className="py-2 px-2">{e.winScore} - {e.opponentScore}</td>
                      <td className="py-2 px-2 opacity-80">{e.mode}{e.difficulty ? `·${e.difficulty[0]}` : ""}</td>
                      <td className="py-2 px-2 opacity-80">{e.longestRally}</td>
                      <td className="py-2 px-2 opacity-80">{Math.floor(e.matchDurationSeconds / 60)}:{String(e.matchDurationSeconds % 60).padStart(2, "0")}</td>
                      <td className="py-2 px-2 opacity-60 text-xs">{e.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-center mt-8">
          <button className="px-5 py-2 rounded font-bold tracking-widest" style={{ border: `1px solid ${theme.p1}`, color: theme.p1 }}
            onClick={onBack}>BACK [ESC]</button>
        </div>
      </div>
    </div>
  );
}
