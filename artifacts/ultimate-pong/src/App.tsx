import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MainMenu } from "@/components/MainMenu";
import { SettingsScreen } from "@/components/SettingsScreen";
import { HallOfFame } from "@/components/HallOfFame";
import { NameEntry } from "@/components/NameEntry";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { PauseOverlay } from "@/components/PauseOverlay";
import { RoundSummary } from "@/components/RoundSummary";
import { WinScreen } from "@/components/WinScreen";
import { GameEngine, type MatchOutcome, type RoundOutcome, CONFIG } from "@/game/engine";
import { THEMES } from "@/game/themes";
import { sound } from "@/game/sound";
import { addHallOfFameEntry, DEFAULT_SETTINGS, loadHallOfFame, loadSettings, saveSettings } from "@/game/storage";
import type { Difficulty, GameMode, GameSettings, HallOfFameEntry, MatchStats, Screen } from "@/game/types";

export default function App() {
  const [screen, setScreen] = useState<Screen>("MENU");
  const [settings, setSettings] = useState<GameSettings>(() => ({ ...DEFAULT_SETTINGS, ...loadSettings() }));
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
  const [pendingNames, setPendingNames] = useState<{ p1: string; p2: string } | null>(null);
  const [hofEntries, setHofEntries] = useState<HallOfFameEntry[]>(() => loadHallOfFame());
  const [hofHighlight, setHofHighlight] = useState<number | undefined>(undefined);
  const [matchOutcome, setMatchOutcome] = useState<MatchOutcome | null>(null);
  const [roundOutcome, setRoundOutcome] = useState<RoundOutcome | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [pauseStats, setPauseStats] = useState<MatchStats | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const theme = THEMES[settings.theme];

  // Persist settings
  useEffect(() => { saveSettings(settings); }, [settings]);

  // Resume audio on first interaction
  useEffect(() => {
    const onAct = () => sound.resume();
    window.addEventListener("pointerdown", onAct, { once: true });
    window.addEventListener("keydown", onAct, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, []);

  // ESC handling for game pause
  useEffect(() => {
    if (screen !== "GAME" && screen !== "PAUSE") return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const en = engineRef.current;
        if (!en) return;
        if (!en.isPaused()) en.pause();
        setPauseStats({ ...en.getStats() });
        setScreen("PAUSE");
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [screen]);

  const startGame = useCallback((mode: GameMode, p1: string, p2: string) => {
    setMatchOutcome(null);
    setRoundOutcome(null);
    setIsNewRecord(false);
    setScreen("GAME");
    // engine will be created by the effect below once canvas mounts
    requestAnimationFrame(() => {
      const cv = canvasRef.current;
      if (!cv) return;
      // dispose old
      engineRef.current?.stop();
      const engine = new GameEngine(cv, settings, mode, p1, p2, {
        onScore: () => { /* no-op */ },
        onRoundEnd: (out) => {
          setRoundOutcome(out);
          setScreen("ROUND_SUMMARY");
        },
        onMatchEnd: (out) => {
          setMatchOutcome(out);
          // record HoF only for winner names (skip if AI won)
          const winnerName = out.winnerName;
          const winnerIsAI = (mode === "SINGLE") && out.winnerSide === "R";
          if (!winnerIsAI) {
            const entry: HallOfFameEntry = {
              name: winnerName,
              winScore: out.winnerSide === "L" ? out.p1Score : out.p2Score,
              opponentScore: out.winnerSide === "L" ? out.p2Score : out.p1Score,
              date: new Date().toISOString().slice(0, 10),
              mode: out.mode,
              difficulty: out.difficulty,
              longestRally: out.longestRally,
              matchDurationSeconds: out.durationSeconds,
            };
            const { entries, isNewRecord: nr } = addHallOfFameEntry(entry);
            setHofEntries(entries);
            const idx = entries.indexOf(entry);
            setHofHighlight(idx >= 0 ? idx : undefined);
            setIsNewRecord(nr);
          }
          setScreen("WIN");
        },
        onPause: () => { /* engine handles its own paused flag */ },
      });
      engine.start();
      engineRef.current = engine;
    });
  }, [settings]);

  // Keyboard for game
  useEffect(() => {
    if (screen !== "GAME") return;
    const onDown = (e: KeyboardEvent) => engineRef.current?.handleKeyDown(e);
    const onUp = (e: KeyboardEvent) => engineRef.current?.handleKeyUp(e);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [screen]);

  // Cleanup engine on unmount
  useEffect(() => () => engineRef.current?.stop(), []);

  // Menu navigation handler
  const onMenuSelect = useCallback((action: "SINGLE" | "LOCAL" | "TOURNAMENT" | "SETTINGS" | "HALL_OF_FAME") => {
    if (action === "SETTINGS") { setScreen("SETTINGS"); return; }
    if (action === "HALL_OF_FAME") { setHofHighlight(undefined); setScreen("HALL_OF_FAME"); return; }
    setPendingMode(action);
    if (action === "SINGLE") {
      setScreen("MODE_SETUP");
    } else {
      setScreen("NAME_ENTRY");
    }
  }, []);

  const onDifficultyConfirm = useCallback((d: Difficulty) => {
    setPendingDifficulty(d);
    setSettings((s) => ({ ...s, difficulty: d }));
    setScreen("NAME_ENTRY");
  }, []);

  const onNamesConfirm = useCallback((p1: string, p2: string) => {
    setPendingNames({ p1, p2 });
    if (!pendingMode) return;
    startGame(pendingMode, p1, p2);
  }, [pendingMode, startGame]);

  const onResume = useCallback(() => {
    engineRef.current?.resume();
    setScreen("GAME");
  }, []);

  const onMute = useCallback(() => {
    const en = sound.toggle();
    setSettings((s) => ({ ...s, soundEnabled: en }));
  }, []);

  const onQuitToMenu = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setScreen("MENU");
  }, []);

  const onContinueRound = useCallback(() => {
    setRoundOutcome(null);
    engineRef.current?.resetForNewRound();
    setScreen("GAME");
  }, []);

  const onPlayAgain = useCallback(() => {
    if (!pendingMode || !pendingNames) return;
    setMatchOutcome(null);
    startGame(pendingMode, pendingNames.p1, pendingNames.p2);
  }, [pendingMode, pendingNames, startGame]);

  const onChangeMode = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setScreen("MENU");
  }, []);

  const aspect = useMemo(() => CONFIG.WIDTH / CONFIG.HEIGHT, []);
  const [p1Name, p2Name] = useMemo(() => {
    return pendingNames ? [pendingNames.p1, pendingNames.p2] : ["PLAYER 1", "PLAYER 2"];
  }, [pendingNames]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: theme.bg }}>
      {/* Game canvas (always mounted while GAME/PAUSE/ROUND_SUMMARY) */}
      {(screen === "GAME" || screen === "PAUSE" || screen === "ROUND_SUMMARY") && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-full" style={{ aspectRatio: `${aspect}`, maxHeight: "100%", margin: "0 auto" }}>
            <CanvasMount canvasRef={canvasRef} />
          </div>
        </div>
      )}

      {screen === "MENU" && <MainMenu themeName={settings.theme} onSelect={onMenuSelect} />}
      {screen === "SETTINGS" && (
        <SettingsScreen
          settings={settings}
          onSave={(s) => { setSettings(s); setScreen("MENU"); }}
          onCancel={() => setScreen("MENU")}
        />
      )}
      {screen === "HALL_OF_FAME" && (
        <HallOfFame entries={hofEntries} themeName={settings.theme} highlightIdx={hofHighlight}
          onBack={() => setScreen("MENU")} />
      )}
      {screen === "MODE_SETUP" && pendingMode === "SINGLE" && (
        <DifficultyPicker
          themeName={settings.theme}
          initial={pendingDifficulty ?? settings.difficulty}
          onConfirm={onDifficultyConfirm}
          onCancel={() => setScreen("MENU")}
        />
      )}
      {screen === "NAME_ENTRY" && pendingMode && (
        <NameEntry
          themeName={settings.theme}
          mode={pendingMode}
          onConfirm={onNamesConfirm}
          onCancel={() => setScreen("MENU")}
        />
      )}
      {screen === "PAUSE" && (
        <PauseOverlay
          themeName={settings.theme}
          stats={pauseStats ?? engineRef.current?.getStats() ?? { rally: 0, longestRally: 0, ballSpeed: 0, p1Hits: 0, p2Hits: 0, p1Powerups: 0, p2Powerups: 0, startedAt: 0 }}
          p1Name={engineRef.current?.getPlayerNames()[0] ?? p1Name}
          p2Name={engineRef.current?.getPlayerNames()[1] ?? p2Name}
          onResume={onResume}
          onMute={onMute}
          isMuted={!settings.soundEnabled}
          onQuit={onQuitToMenu}
        />
      )}
      {screen === "ROUND_SUMMARY" && roundOutcome && (
        <RoundSummary
          themeName={settings.theme}
          roundNumber={(engineRef.current?.getRoundsWon().L ?? 0) + (engineRef.current?.getRoundsWon().R ?? 0)}
          winnerName={roundOutcome.winnerName}
          winnerSide={roundOutcome.winnerSide}
          p1Score={roundOutcome.p1Score}
          p2Score={roundOutcome.p2Score}
          longestRally={roundOutcome.longestRally}
          roundsWon={engineRef.current?.getRoundsWon() ?? { L: 0, R: 0 }}
          onContinue={onContinueRound}
        />
      )}
      {screen === "WIN" && matchOutcome && (
        <WinScreen
          themeName={settings.theme}
          outcome={matchOutcome}
          isNewRecord={isNewRecord}
          onPlayAgain={onPlayAgain}
          onChangeMode={onChangeMode}
          onMenu={() => setScreen("MENU")}
        />
      )}
    </div>
  );
}

function CanvasMount({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        borderRadius: 12,
        boxShadow: "0 0 80px rgba(120,120,255,0.18), inset 0 0 40px rgba(0,0,0,0.6)",
      }}
    />
  );
}
