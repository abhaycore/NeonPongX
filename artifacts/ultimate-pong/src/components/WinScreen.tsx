import { useEffect, useRef } from "react";
import { THEMES } from "@/game/themes";
import type { ThemeName } from "@/game/types";
import type { MatchOutcome } from "@/game/engine";
import { sound } from "@/game/sound";

interface Props {
  themeName: ThemeName;
  outcome: MatchOutcome;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onChangeMode: () => void;
  onMenu: () => void;
}

export function WinScreen({ themeName, outcome, isNewRecord, onPlayAgain, onChangeMode, onMenu }: Props) {
  const theme = THEMES[themeName];
  const winColor = outcome.winnerSide === "L" ? theme.p1 : theme.p2;
  const cv = useRef<HTMLCanvasElement>(null);
  const fireworks = useRef<{ x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; phase: "up" | "burst"; }[]>([]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter") { sound.menuSelect(); onPlayAgain(); }
      else if (e.key.toLowerCase() === "m") { sound.menuMove(); onChangeMode(); }
      else if (e.key.toLowerCase() === "q" || e.key === "Escape") { sound.menuMove(); onMenu(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onChangeMode, onMenu, onPlayAgain]);

  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(c);
    let raf = 0;
    let lastSpawn = 0;
    const palette = theme.particles;
    const launch = () => {
      const w = c.clientWidth, h = c.clientHeight;
      fireworks.current.push({
        x: Math.random() * w * 0.8 + w * 0.1,
        y: h, vx: (Math.random() - 0.5) * 1.4, vy: -Math.random() * 4 - 7,
        life: 80, max: 80, color: palette[Math.floor(Math.random() * palette.length)],
        size: 3, phase: "up",
      });
    };
    const burst = (x: number, y: number, color: string) => {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const sp = 2 + Math.random() * 4;
        fireworks.current.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 70, max: 70, color, size: 2 + Math.random() * 2, phase: "burst",
        });
      }
    };
    const draw = () => {
      const w = c.clientWidth, h = c.clientHeight;
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, w, h);
      const now = performance.now();
      if (now - lastSpawn > 350) { launch(); lastSpawn = now; }
      for (const p of fireworks.current) {
        if (p.phase === "up") {
          p.x += p.vx; p.y += p.vy; p.vy += 0.12;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          if (p.vy > -1) { burst(p.x, p.y, p.color); p.life = 0; }
        } else {
          p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.99;
          p.life--;
          const a = Math.max(0, p.life / p.max);
          ctx.fillStyle = p.color + Math.floor(a * 255).toString(16).padStart(2, "0");
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
        }
      }
      fireworks.current = fireworks.current.filter((p) => p.life > 0);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [theme]);

  const minutes = Math.floor(outcome.durationSeconds / 60);
  const seconds = outcome.durationSeconds % 60;

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
      <canvas ref={cv} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 text-center max-w-xl px-8">
        <div className="text-[11px] tracking-[0.4em] opacity-60">match complete</div>
        <h1 className="font-bold tracking-tight mt-2 animate-hue-cycle" style={{
          fontSize: "clamp(60px, 10vw, 120px)",
          color: winColor,
          textShadow: `0 0 24px ${winColor}, 0 0 64px ${winColor}aa`,
        }}>
          {outcome.winnerName}
        </h1>
        <div className="text-2xl tracking-widest opacity-90">WINS THE MATCH</div>
        <div className="mt-6 text-4xl font-mono font-bold">
          <span style={{ color: theme.p1 }}>{outcome.p1Score}</span>
          <span className="mx-3 opacity-50">:</span>
          <span style={{ color: theme.p2 }}>{outcome.p2Score}</span>
        </div>
        {isNewRecord && (
          <div className="mt-4 inline-block px-4 py-1.5 rounded-full text-xs tracking-widest font-bold animate-pulse-soft" style={{
            border: `1px solid ${theme.p1}`, color: theme.p1, background: theme.p1 + "1a",
          }}>★ NEW HALL OF FAME RECORD</div>
        )}
        <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
          <Stat label="LONGEST RALLY" value={String(outcome.longestRally)} color={theme.accent} />
          <Stat label="DURATION" value={`${minutes}:${String(seconds).padStart(2, "0")}`} color={theme.accent} />
          <Stat label="MODE" value={outcome.difficulty ? `${outcome.mode}·${outcome.difficulty}` : outcome.mode} color={theme.accent} />
        </div>
        <div className="mt-10 flex flex-wrap gap-3 justify-center text-xs tracking-widest font-bold">
          <button onClick={onPlayAgain} className="px-5 py-2.5 rounded" style={{ border: `1px solid ${theme.p1}`, color: theme.p1, boxShadow: `0 0 18px ${theme.p1}55` }}>[ENTER] PLAY AGAIN</button>
          <button onClick={onChangeMode} className="px-5 py-2.5 rounded" style={{ border: `1px solid ${theme.p2}`, color: theme.p2 }}>[M] CHANGE MODE</button>
          <button onClick={onMenu} className="px-5 py-2.5 rounded" style={{ border: `1px solid #ffffff22`, color: "#cbd5e1" }}>[Q] MAIN MENU</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md py-3 px-3" style={{ border: `1px solid ${color}33`, background: "#00000044" }}>
      <div className="text-[10px] tracking-[0.3em] opacity-60">{label}</div>
      <div className="text-lg font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}
