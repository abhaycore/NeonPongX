import { useEffect, useState } from "react";
import { THEMES } from "@/game/themes";
import type { MatchStats, ThemeName } from "@/game/types";
import { sound } from "@/game/sound";

interface Props {
  themeName: ThemeName;
  stats: MatchStats;
  p1Name: string; p2Name: string;
  onResume: () => void;
  onMute: () => void;
  isMuted: boolean;
  onQuit: () => void;
}

export function PauseOverlay({ themeName, stats, p1Name, p2Name, onResume, onMute, isMuted, onQuit }: Props) {
  const theme = THEMES[themeName];
  const [showStats, setShowStats] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (confirmQuit) {
        if (key === "y") { sound.menuSelect(); onQuit(); }
        else if (key === "n" || key === "escape") { sound.menuMove(); setConfirmQuit(false); }
        return;
      }
      if (key === "r") { sound.menuSelect(); onResume(); }
      else if (key === "s") { sound.menuMove(); setShowStats((s) => !s); }
      else if (key === "m") { sound.menuMove(); onMute(); }
      else if (key === "q") { sound.menuMove(); setConfirmQuit(true); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [confirmQuit, onMute, onQuit, onResume]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" style={{ background: "#00000099" }}>
      <div className="rounded-2xl p-10 w-[420px]" style={{
        border: `1px solid ${theme.divider}`, background: theme.bg + "ee",
        boxShadow: `0 0 80px ${theme.p1}33`,
      }}>
        <div className="text-center mb-6">
          <div className="text-[11px] tracking-[0.4em]" style={{ color: theme.accent }}>halt</div>
          <h2 className="text-3xl font-bold tracking-widest mt-2" style={{ color: theme.ball }}>PAUSED</h2>
        </div>
        {!confirmQuit && !showStats && (
          <div className="space-y-2">
            <Row label="[R]" text="Resume" color={theme.p1} onClick={onResume} />
            <Row label="[S]" text="Stats" color={theme.p2} onClick={() => setShowStats(true)} />
            <Row label="[M]" text={isMuted ? "Unmute" : "Mute"} color={theme.accent} onClick={onMute} />
            <Row label="[Q]" text="Quit to Menu" color="#ef4444" onClick={() => setConfirmQuit(true)} />
          </div>
        )}
        {showStats && (
          <div className="space-y-2 text-sm font-mono">
            <Stat label="Current rally" value={String(stats.rally)} />
            <Stat label="Longest rally" value={String(stats.longestRally)} />
            <Stat label="Ball speed" value={`${stats.ballSpeed.toFixed(1)} px/f`} />
            <Stat label={`${p1Name} hits`} value={String(stats.p1Hits)} />
            <Stat label={`${p2Name} hits`} value={String(stats.p2Hits)} />
            <Stat label={`${p1Name} powerups`} value={String(stats.p1Powerups)} />
            <Stat label={`${p2Name} powerups`} value={String(stats.p2Powerups)} />
            <button onClick={() => setShowStats(false)} className="mt-4 w-full px-4 py-2 rounded font-bold tracking-widest" style={{ border: `1px solid ${theme.p1}`, color: theme.p1 }}>BACK</button>
          </div>
        )}
        {confirmQuit && (
          <div className="text-center space-y-4">
            <div className="text-sm">Quit to menu?</div>
            <div className="text-xs opacity-60">All progress will be lost.</div>
            <div className="flex gap-3 justify-center">
              <button onClick={onQuit} className="px-5 py-2 rounded font-bold" style={{ border: `1px solid #ef4444`, color: "#ef4444" }}>YES [Y]</button>
              <button onClick={() => setConfirmQuit(false)} className="px-5 py-2 rounded font-bold" style={{ border: `1px solid ${theme.p1}`, color: theme.p1 }}>NO [N]</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, text, color, onClick }: { label: string; text: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 px-4 py-3 rounded-md transition-all text-left hover:bg-white/5" style={{ border: `1px solid ${color}33`, color }}>
      <span className="font-mono text-xs opacity-60">{label}</span>
      <span className="font-bold tracking-widest">{text}</span>
    </button>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-white/5 py-1.5"><span className="opacity-60">{label}</span><span className="font-bold">{value}</span></div>;
}
