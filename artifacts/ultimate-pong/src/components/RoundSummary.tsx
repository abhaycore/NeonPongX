import { useEffect, useState } from "react";
import { THEMES } from "@/game/themes";
import type { ThemeName } from "@/game/types";
import { sound } from "@/game/sound";

interface Props {
  themeName: ThemeName;
  roundNumber: number;
  winnerName: string;
  winnerSide: "L" | "R";
  p1Score: number; p2Score: number;
  longestRally: number;
  roundsWon: { L: number; R: number };
  onContinue: () => void;
}

export function RoundSummary({ themeName, roundNumber, winnerName, winnerSide, p1Score, p2Score, longestRally, roundsWon, onContinue }: Props) {
  const theme = THEMES[themeName];
  const winColor = winnerSide === "L" ? theme.p1 : theme.p2;
  const [count, setCount] = useState(5);
  useEffect(() => {
    sound.victory();
  }, []);
  useEffect(() => {
    if (count <= 0) { onContinue(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onContinue]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { sound.menuSelect(); onContinue(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onContinue]);
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg + "ee" }}>
      <div className="rounded-2xl p-12 w-[560px] text-center" style={{ border: `1px solid ${winColor}66`, boxShadow: `0 0 100px ${winColor}55` }}>
        <div className="text-[11px] tracking-[0.4em] opacity-60">round {roundNumber} winner</div>
        <h1 className="text-5xl font-bold tracking-widest mt-3" style={{ color: winColor, textShadow: `0 0 24px ${winColor}` }}>{winnerName}</h1>
        <div className="mt-6 text-3xl font-mono">
          <span style={{ color: theme.p1 }}>{p1Score}</span>
          <span className="opacity-40 mx-3">:</span>
          <span style={{ color: theme.p2 }}>{p2Score}</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Pill label="LONGEST RALLY" value={String(longestRally)} color={theme.accent} />
          <Pill label="SERIES" value={`${roundsWon.L} - ${roundsWon.R}`} color={theme.accent} />
        </div>
        <div className="mt-8 text-xs tracking-[0.3em] opacity-60">NEXT ROUND IN {count}…  press ENTER to skip</div>
      </div>
    </div>
  );
}
function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md py-3 px-4" style={{ border: `1px solid ${color}33` }}>
      <div className="text-[10px] tracking-[0.3em] opacity-60">{label}</div>
      <div className="text-xl font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}
