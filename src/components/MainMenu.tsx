import {
  Car,
  CloudFog,
  CloudRain,
  CloudSnow,
  Maximize2,
  Minimize2,
  Moon,
  Paintbrush,
  Play,
  Settings,
  ShoppingBag,
  Shuffle,
  Sun,
  Trophy,
} from 'lucide-react';
import { CarSpec, GameSettings, WeatherMode } from '../game/types';
import { ViewportInfo } from '../game/viewport';
import { CoinBadge } from './CoinBadge';
import { audioEngine } from '../game/audio';

interface MainMenuProps {
  coins: number;
  bestScore: number;
  bestDistance: number;
  selectedCar: CarSpec;
  settings: GameSettings;
  viewport: ViewportInfo;
  onStartGame: () => void;
  onOpenStore: () => void;
  onOpenGarage: () => void;
  onOpenCustomize: () => void;
  onOpenSettings: () => void;
  onToggleTimeOfDay: () => void;
  onSelectWeather: (mode: WeatherMode) => void;
  onToggleFullscreen: () => void;
}

const WEATHER_BTNS: { mode: WeatherMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'SUNNY', label: 'Sunny', Icon: Sun },
  { mode: 'RAINY', label: 'Rainy', Icon: CloudRain },
  { mode: 'FOGGY', label: 'Foggy', Icon: CloudFog },
  { mode: 'SNOWY', label: 'Snowy', Icon: CloudSnow },
  { mode: 'RANDOM', label: 'Random', Icon: Shuffle },
];

export function MainMenu({
  coins,
  bestScore,
  bestDistance,
  selectedCar,
  settings,
  viewport,
  onStartGame,
  onOpenStore,
  onOpenGarage,
  onOpenCustomize,
  onOpenSettings,
  onToggleTimeOfDay,
  onSelectWeather,
  onToggleFullscreen,
}: MainMenuProps) {
  const isPortrait = viewport.orientation === 'portrait';
  const compactLand = viewport.isCompactLandscape;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-between ${
        compactLand ? 'p-2.5 sm:p-4' : 'p-4 sm:p-6'
      }`}
      style={{
        paddingLeft: 'max(env(safe-area-inset-left), 12px)',
        paddingRight: 'max(env(safe-area-inset-right), 12px)',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}
    >
      {/* Top Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          {/* Top-Left: Coins + Best Score */}
          <div className="pointer-events-auto flex flex-col gap-1.5 shrink-0">
            <CoinBadge coins={coins} compact={compactLand || isPortrait} />
            {bestScore > 0 && (
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-200 bg-slate-950/88 border border-white/10 rounded-lg px-2.5 py-1 w-fit">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono-tabular whitespace-nowrap">
                  {bestScore.toLocaleString()} pts · {bestDistance.toLocaleString()} m
                </span>
              </div>
            )}
          </div>

          {/* Center Title in Landscape */}
          {!isPortrait && (
            <div className="text-center select-none min-w-0">
              <h1
                className={`font-display font-bold italic tracking-wider text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)] leading-none ${
                  compactLand ? 'text-2xl sm:text-3xl' : 'text-4xl md:text-5xl lg:text-6xl'
                }`}
              >
                STAR CAR <span className="text-amber-400">3D</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-200 tracking-wide drop-shadow truncate">
                {selectedCar.name} · {selectedCar.classLabel}
              </p>
            </div>
          )}

          {/* Top-Right Controls: Fullscreen, Day/Night, Settings */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {viewport.fullscreenSupported && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onToggleFullscreen();
                }}
                aria-label={viewport.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                title={viewport.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Landscape'}
                className="inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-900 border border-white/15 text-slate-200 transition-colors shrink-0 cursor-pointer"
              >
                {viewport.isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-sky-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-sky-400" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onToggleTimeOfDay();
              }}
              aria-label="Toggle Day or Night"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-900 border border-white/15 text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {settings.timeOfDay === 'NIGHT' ? (
                <>
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span className="hidden md:inline">Night</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Day</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onOpenSettings();
              }}
              aria-label="Settings"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-900 border border-white/15 text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span className="hidden md:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* Dedicated Title Row in Portrait so it never crowds Coins/Buttons */}
        {isPortrait && (
          <div className="text-center select-none mt-2">
            <h1 className="font-display text-4xl sm:text-5xl font-bold italic tracking-wider text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)] leading-none">
              STAR CAR <span className="text-amber-400">3D</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-200 tracking-wide drop-shadow">
              {selectedCar.name} · {selectedCar.classLabel}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Dock: Weather Strip + Navigation Actions */}
      <div
        className={`pointer-events-auto mx-auto w-full flex flex-col ${
          compactLand ? 'max-w-3xl gap-1.5' : 'max-w-3xl gap-2.5'
        }`}
      >
        {/* Pre-Race Weather Strip */}
        <div className="mx-auto flex flex-wrap items-center justify-center gap-1 bg-slate-950/88 border border-white/12 rounded-xl p-1 shadow-xl">
          {WEATHER_BTNS.map(({ mode, label, Icon }) => {
            const active = settings.weatherMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onSelectWeather(mode);
                }}
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Navigation Dock */}
        <div
          className={`bg-slate-950/92 border border-white/15 rounded-2xl shadow-2xl flex ${
            isPortrait ? 'flex-col p-3 gap-2.5' : compactLand ? 'flex-row items-center p-2 gap-2' : 'flex-row items-center p-3.5 gap-3'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              audioEngine.unlock();
              audioEngine.playClick();
              onStartGame();
            }}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-display font-bold tracking-wide transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-lg ${
              compactLand ? 'px-4 py-2.5 text-base' : 'px-6 py-3.5 text-lg'
            }`}
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>START GAME</span>
          </button>

          <div className={`grid grid-cols-3 gap-2 ${isPortrait ? 'w-full' : 'flex items-center shrink-0'}`}>
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onOpenStore();
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-white/10 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compactLand ? 'px-3 py-2.5' : 'px-3.5 py-3'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Store</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onOpenGarage();
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-white/10 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compactLand ? 'px-3 py-2.5' : 'px-3.5 py-3'
              }`}
            >
              <Car className="w-4 h-4 text-sky-400" />
              <span>Garage</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onOpenCustomize();
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-white/10 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compactLand ? 'px-3 py-2.5' : 'px-3.5 py-3'
              }`}
            >
              <Paintbrush className="w-4 h-4 text-emerald-400" />
              <span>Customize</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
