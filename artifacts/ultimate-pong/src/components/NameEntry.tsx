import { useEffect, useRef, useState } from "react";
import { THEMES } from "@/game/themes";
import type { GameMode, ThemeName } from "@/game/types";
import { sound } from "@/game/sound";

interface Props {
  themeName: ThemeName;
  mode: GameMode;
  onConfirm: (p1: string, p2: string) => void;
  onCancel: () => void;
}

export function NameEntry({ themeName, mode, onConfirm, onCancel }: Props) {
  const theme = THEMES[themeName];
  const isAI = mode === "SINGLE";
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [active, setActive] = useState<0 | 1>(0);
  const r1 = useRef<HTMLInputElement>(null);
  const r2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => r1.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { sound.menuMove(); onCancel(); }
      if (e.key === "Tab" && !isAI) {
        e.preventDefault();
        setActive((a) => (a === 0 ? 1 : 0));
        setTimeout(() => (active === 0 ? r2.current : r1.current)?.focus(), 0);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [active, isAI, onCancel]);

  const submit = () => {
    sound.menuSelect();
    onConfirm(p1.trim() || "PLAYER 1", isAI ? "AI" : (p2.trim() || "PLAYER 2"));
  };

  const ready = isAI ? p1.trim().length > 0 : (p1.trim().length > 0 && p2.trim().length > 0);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
      <div className="w-full max-w-3xl mx-auto p-10 rounded-xl" style={{
        border: `1px solid ${theme.divider}`, background: "#00000055",
        boxShadow: `0 0 80px ${theme.p1}22, 0 0 80px ${theme.p2}22`,
      }}>
        <div className="text-center mb-10">
          <div className="text-[11px] tracking-[0.4em]" style={{ color: theme.accent }}>{mode === "TOURNAMENT" ? "tournament setup" : (isAI ? "single player" : "local 2 player")}</div>
          <h2 className="text-3xl font-bold tracking-widest mt-2" style={{ color: theme.ball }}>WHO'S PLAYING?</h2>
        </div>
        <div className={`grid ${isAI ? "grid-cols-1" : "grid-cols-2"} gap-8`}>
          <PlayerField
            label="PLAYER 1" color={theme.p1}
            value={p1} onChange={setP1} active={active === 0}
            onFocus={() => setActive(0)} inputRef={r1}
            onEnter={isAI ? submit : () => { setActive(1); setTimeout(() => r2.current?.focus(), 0); }}
          />
          {!isAI && (
            <PlayerField
              label="PLAYER 2" color={theme.p2}
              value={p2} onChange={setP2} active={active === 1}
              onFocus={() => setActive(1)} inputRef={r2}
              onEnter={submit}
            />
          )}
        </div>
        <div className="mt-10 flex items-center justify-between text-[11px] tracking-[0.3em]" style={{ color: theme.accent }}>
          <span>{isAI ? "ENTER TO BEGIN" : "TAB to switch  ·  ENTER to begin"}</span>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded font-bold tracking-widest" style={{ border: `1px solid #ffffff22`, color: "#cbd5e1" }}>CANCEL</button>
            <button disabled={!ready} onClick={submit} className="px-5 py-2 rounded font-bold tracking-widest" style={{
              border: `1px solid ${ready ? theme.p1 : "#ffffff22"}`,
              color: ready ? theme.p1 : "#64748b",
              boxShadow: ready ? `0 0 18px ${theme.p1}55` : "none",
            }}>{ready ? "READY!" : "ENTER NAMES"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerField({ label, color, value, onChange, active, onFocus, inputRef, onEnter }: {
  label: string; color: string; value: string; onChange: (v: string) => void;
  active: boolean; onFocus: () => void; inputRef: React.RefObject<HTMLInputElement | null>;
  onEnter: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs tracking-[0.4em]" style={{ color }}>{label}</div>
      <div
        onClick={onFocus}
        className="rounded-md px-4 py-3 transition-all"
        style={{
          background: active ? color + "10" : "#00000040",
          border: `1px solid ${active ? color : "#ffffff14"}`,
          boxShadow: active ? `0 0 24px ${color}55, inset 0 0 12px ${color}22` : "none",
        }}
      >
        <input
          ref={inputRef}
          value={value}
          maxLength={12}
          onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9 _-]/g, "").toUpperCase())}
          onFocus={onFocus}
          onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
          placeholder={label}
          className="w-full bg-transparent border-none outline-none text-2xl font-bold tracking-widest font-mono"
          style={{ color }}
        />
      </div>
      <div className="text-[10px] tracking-[0.3em] opacity-50">max 12 chars · A-Z 0-9</div>
    </div>
  );
}
