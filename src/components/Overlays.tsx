import { Home, Layers, Play, RotateCcw, Settings, Trophy } from 'lucide-react';
import { HudSnapshot, LEVEL_CATALOG, LevelId } from '../game/types';
import { audioEngine } from '../game/audio';
import { BrandLogo } from './BrandLogo';

interface PauseOverlayProps {
  levelId: LevelId;
  onResume: () => void;
  onRestart: () => void;
  onChangeLevel: () => void;
  onOpenSettings: () => void;
  onHome: () => void;
}

export function PauseOverlay({
  levelId,
  onResume,
  onRestart,
  onChangeLevel,
  onOpenSettings,
  onHome,
}: PauseOverlayProps) {
  const levelSpec = LEVEL_CATALOG.find((l) => l.id === levelId) ?? LEVEL_CATALOG[0];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/78 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl text-center max-h-[92dvh] overflow-y-auto sc-scroll">
        <BrandLogo size="modal" glow className="mx-auto mb-1.5" />
        <div className="text-[11px] font-display font-bold tracking-widest text-amber-400 uppercase">
          {levelSpec.code} · {levelSpec.title}
        </div>
        <h2 className="font-display text-3xl font-bold text-white tracking-wider mt-0.5">PAUSED</h2>
        <p className="text-xs text-slate-400 mt-1">Take a breather before getting back on track</p>

        <div className="flex flex-col gap-2 mt-5">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onResume();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base tracking-wide cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onRestart();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-sm font-semibold cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Level</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onChangeLevel();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-sky-300 text-sm font-semibold cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Change Level</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onOpenSettings();
              }}
              className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-sm font-semibold cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onHome();
              }}
              className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-sm font-semibold cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  levelId: LevelId;
  finalHud: HudSnapshot;
  bestScore: number;
  isNewBest: boolean;
  onRestart: () => void;
  onChangeLevel: () => void;
  onHome: () => void;
}

export function GameOverModal({
  levelId,
  finalHud,
  bestScore,
  isNewBest,
  onRestart,
  onChangeLevel,
  onHome,
}: GameOverModalProps) {
  const levelSpec =
    LEVEL_CATALOG.find((l) => l.id === (finalHud.levelId ?? levelId)) ?? LEVEL_CATALOG[0];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/82 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto sc-scroll">
        <div className="text-center">
          <BrandLogo size="modal" className="mx-auto mb-2" />
          <div className="inline-block text-[11px] font-display font-bold tracking-widest uppercase text-sky-400 bg-slate-950/90 border border-white/10 rounded-lg px-3 py-1 mb-2">
            {levelSpec.code} · {levelSpec.title}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-red-400 tracking-wider">
            GAME OVER
          </h2>
          {isNewBest ? (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Trophy className="w-4 h-4" />
              <span>New Level Record</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-400 font-mono-tabular">
              Level Best: {bestScore.toLocaleString()}
            </div>
          )}
        </div>

        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-950/90 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400">Final Score</div>
            <div className="font-mono-tabular font-bold text-lg sm:text-xl text-white mt-0.5">
              {finalHud.score.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-950/90 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400">Distance</div>
            <div className="font-mono-tabular font-bold text-lg sm:text-xl text-sky-400 mt-0.5">
              {finalHud.distanceMeters.toLocaleString()} m
            </div>
          </div>
          <div className="bg-slate-950/90 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400">Coins</div>
            <div className="font-mono-tabular font-bold text-lg sm:text-xl text-amber-400 mt-0.5">
              +{finalHud.coinsThisRun}
            </div>
          </div>
        </div>

        {/* Action Buttons: Restart, Change Level, Home */}
        <div className="flex flex-col gap-2.5 mt-5">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onRestart();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base tracking-wide cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onChangeLevel();
              }}
              className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-display font-bold text-xs sm:text-sm tracking-wide cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>CHANGE LEVEL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onHome();
              }}
              className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-display font-bold text-xs sm:text-sm tracking-wide cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>HOME</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
