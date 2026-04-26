import { useEffect, useRef, useState } from "react";
import { THEMES } from "@/game/themes";
import type { Theme, ThemeName } from "@/game/types";
import { sound } from "@/game/sound";

interface Props {
  themeName: ThemeName;
  onSelect: (action: "SINGLE" | "LOCAL" | "TOURNAMENT" | "SETTINGS" | "HALL_OF_FAME") => void;
}

const ITEMS = [
  { key: "SINGLE", label: "1 PLAYER", sub: "vs AI" },
  { key: "LOCAL", label: "2 PLAYERS", sub: "local" },
  { key: "TOURNAMENT", label: "TOURNAMENT", sub: "best of 3" },
  { key: "SETTINGS", label: "SETTINGS", sub: "configure" },
  { key: "HALL_OF_FAME", label: "HALL OF FAME", sub: "champions" },
] as const;

export function MainMenu({ themeName, onSelect }: Props) {
  const theme: Theme = THEMES[themeName];
  const [selected, setSelected] = useState(0);
  const [titleProgress, setTitleProgress] = useState(0);
  const fullTitle = "ULTIMATE PONG";
  const bgRef = useRef<HTMLCanvasElement>(null);

  // typewriter
  useEffect(() => {
    if (titleProgress >= fullTitle.length) return;
    const t = setTimeout(() => setTitleProgress((p) => p + 1), 60);
    return () => clearTimeout(t);
  }, [titleProgress]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowDown" || k === "s" || k === "S") { setSelected((s) => (s + 1) % ITEMS.length); sound.menuMove(); }
      else if (k === "ArrowUp" || k === "w" || k === "W") { setSelected((s) => (s - 1 + ITEMS.length) % ITEMS.length); sound.menuMove(); }
      else if (k === "Enter") { sound.menuSelect(); onSelect(ITEMS[selected].key); }
      else if (k === "1") { sound.menuSelect(); onSelect("SINGLE"); }
      else if (k === "2") { sound.menuSelect(); onSelect("LOCAL"); }
      else if (k === "3") { sound.menuSelect(); onSelect("TOURNAMENT"); }
      else if (k === "4") { sound.menuSelect(); onSelect("SETTINGS"); }
      else if (k === "5") { sound.menuSelect(); onSelect("HALL_OF_FAME"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onSelect]);

  // animated background
  useEffect(() => {
    const cv = bgRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * cv.clientWidth,
      y: Math.random() * cv.clientHeight,
      r: Math.random() * 1.6 + 0.3,
      ph: Math.random() * Math.PI * 2,
      sp: Math.random() * 1.5 + 0.4,
    }));
    const nebulae = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * cv.clientWidth,
      y: Math.random() * cv.clientHeight,
      r: Math.random() * 200 + 160,
      color: ["#3a1a5c", "#1a3a5c", "#5c1a3a", "#1a5c3a", "#5c3a1a"][i],
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }));
    let t = 0; let raf = 0;
    const draw = () => {
      t += 0.016;
      const w = cv.clientWidth, h = cv.clientHeight;
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);
      if (theme.showNebula) {
        for (const n of nebulae) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -n.r) n.x = w + n.r; if (n.x > w + n.r) n.x = -n.r;
          if (n.y < -n.r) n.y = h + n.r; if (n.y > h + n.r) n.y = -n.r;
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          g.addColorStop(0, n.color + "55");
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (theme.showStars) {
        for (const s of stars) {
          const b = 0.4 + 0.6 * Math.abs(Math.sin(t * s.sp + s.ph));
          ctx.fillStyle = `rgba(255,255,255,${b})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [theme]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: theme.bg }}>
      <canvas ref={bgRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 w-full max-w-3xl px-8 flex flex-col items-center">
        <div className="font-mono text-[11px] tracking-[0.4em] uppercase mb-4" style={{ color: theme.accent }}>
          presents an arcade experience
        </div>
        <h1
          className="font-bold tracking-tight text-center"
          style={{
            fontSize: "clamp(48px, 9vw, 110px)",
            color: theme.ball,
            letterSpacing: "0.04em",
            textShadow: `0 0 12px ${theme.p1}, 0 0 32px ${theme.p2}`,
          }}
        >
          {fullTitle.slice(0, titleProgress)}
          <span className="opacity-60 animate-pulse-soft">{titleProgress < fullTitle.length ? "_" : ""}</span>
        </h1>
        <div
          className="mt-2 mb-10 text-sm tracking-[0.35em] animate-pulse-soft"
          style={{ color: theme.p1 }}
        >
          ─── ULTIMATE EDITION ───
        </div>

        <div className="w-full max-w-md space-y-2">
          {ITEMS.map((item, i) => {
            const active = i === selected;
            const color = i % 2 === 0 ? theme.p1 : theme.p2;
            return (
              <button
                key={item.key}
                onMouseEnter={() => setSelected(i)}
                onClick={() => { sound.menuSelect(); onSelect(item.key); }}
                className="w-full flex items-center justify-between px-5 py-3 rounded-md transition-all"
                style={{
                  background: active ? color + "1a" : "transparent",
                  border: `1px solid ${active ? color : "#ffffff14"}`,
                  boxShadow: active ? `0 0 24px ${color}55, inset 0 0 20px ${color}22` : "none",
                  color: active ? color : "#cbd5e1",
                  letterSpacing: "0.15em",
                }}
              >
                <span className="font-bold text-sm">
                  <span className="opacity-70 mr-3 font-mono">[{i + 1}]</span>
                  {item.label}
                </span>
                <span className="text-xs opacity-60">{item.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-6 text-[11px] tracking-[0.3em]" style={{ color: theme.accent }}>
          <span>WASD + ARROWS</span>
          <span className="opacity-40">|</span>
          <span>ENTER TO SELECT</span>
          <span className="opacity-40">|</span>
          <span>P TO PAUSE</span>
        </div>
      </div>
    </div>
  );
}
