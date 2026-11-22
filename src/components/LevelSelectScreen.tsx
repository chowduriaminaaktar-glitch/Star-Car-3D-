import { ArrowLeft, Car, Play, ShieldAlert, Trees, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CarSpec,
  LEVEL_CATALOG,
  LevelId,
  LevelProgress,
} from '../game/types';
import { ViewportInfo } from '../game/viewport';
import { audioEngine } from '../game/audio';
import { BrandLogo } from './BrandLogo';
import { CoinBadge } from './CoinBadge';
import trafficArt from '../assets/images/level_traffic_highway_1795234763124.jpg';
import offroadArt from '../assets/images/level_offroad_trail_1795234763854.jpg';
import obstaclesArt from '../assets/images/level_road_obstacles_1795234763492.jpg';

const LEVEL_ARTWORKS: Record<LevelId, string> = {
  TRAFFIC: trafficArt,
  OFFROAD: offroadArt,
  OBSTACLES: obstaclesArt,
};

const LEVEL_FALLBACK_GRADIENTS: Record<LevelId, string> = {
  TRAFFIC: 'from-sky-900 via-slate-900 to-slate-950',
  OFFROAD: 'from-amber-900 via-stone-900 to-slate-950',
  OBSTACLES: 'from-rose-900 via-slate-900 to-slate-950',
};

function LevelBadgeIcon({ levelId }: { levelId: LevelId }) {
  if (levelId === 'OFFROAD') return <Trees className="w-4 h-4 text-amber-400" />;
  if (levelId === 'OBSTACLES') return <ShieldAlert className="w-4 h-4 text-rose-400" />;
  return <Car className="w-4 h-4 text-sky-400" />;
}

interface LevelSelectScreenProps {
  coins: number;
  selectedCar: CarSpec;
  levelProgress: Record<LevelId, LevelProgress>;
  viewport: ViewportInfo;
  onSelectLevel: (level: LevelId) => void;
  onHoverLevel?: (level: LevelId) => void;
  onBack: () => void;
}

export function LevelSelectScreen({
  coins,
  selectedCar,
  levelProgress,
  viewport,
  onSelectLevel,
  onHoverLevel,
  onBack,
}: LevelSelectScreenProps) {
  const compactLand = viewport.isCompactLandscape;

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col bg-slate-950/82 overflow-hidden select-none"
      style={{
        paddingLeft: 'max(env(safe-area-inset-left), 14px)',
        paddingRight: 'max(env(safe-area-inset-right), 14px)',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 14px)',
      }}
    >
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            audioEngine.playClick();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-white/15 text-white text-sm font-semibold transition-colors cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>BACK</span>
        </button>

        <div
          className={`min-w-0 flex items-center justify-center ${
            compactLand ? 'flex-row gap-2.5' : 'flex-col text-center'
          }`}
        >
          <BrandLogo size="header" className="shrink-0" />
          <div className={compactLand ? 'text-left min-w-0' : 'text-center min-w-0'}>
            <h1
              className={`font-display font-extrabold tracking-wider text-white leading-none ${
                compactLand ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'
              }`}
            >
              CHOOSE YOUR <span className="text-amber-400">LEVEL</span>
            </h1>
            <div className="text-[11px] sm:text-xs text-slate-300 mt-1 truncate">
              Active Car: <span className="text-white font-semibold">{selectedCar.name}</span> ·{' '}
              <span className="text-sky-400">{selectedCar.topSpeedKmh} km/h</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <CoinBadge coins={coins} compact={compactLand} />
        </div>
      </div>

      {/* Three Large Level Cards (Landscape 3-Column Layout) */}
      <div className="flex-1 min-h-0 mt-3 sm:mt-5 flex items-stretch">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-3 gap-3 sm:gap-5 h-full max-h-[540px] my-auto">
          {LEVEL_CATALOG.map((level, index) => {
            const stats = levelProgress[level.id] ?? { bestScore: 0, bestDistance: 0 };
            const isOffroad = level.id === 'OFFROAD';
            const isObstacles = level.id === 'OBSTACLES';

            const borderAccent = isOffroad
              ? 'hover:border-amber-400/75 focus-within:border-amber-400/75'
              : isObstacles
                ? 'hover:border-rose-400/75 focus-within:border-rose-400/75'
                : 'hover:border-sky-400/75 focus-within:border-sky-400/75';

            const btnTheme = isOffroad
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/25'
              : isObstacles
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25'
                : 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-sky-500/25';

            const codeTone = isOffroad
              ? 'text-amber-300'
              : isObstacles
                ? 'text-rose-300'
                : 'text-sky-300';

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.06 }}
                onMouseEnter={() => onHoverLevel?.(level.id)}
                className={`group relative rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br ${
                  LEVEL_FALLBACK_GRADIENTS[level.id]
                } ${borderAccent} shadow-2xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 h-full`}
              >
                {/* Unique Background Artwork */}
                <img
                  src={LEVEL_ARTWORKS[level.id]}
                  alt={level.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* High-Contrast Gradient Scrim for Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/72 to-slate-950/28" />

                {/* Top Code & Mode Icon */}
                <div className="relative z-10 flex items-center justify-between px-4 pt-3.5 sm:px-5 sm:pt-4">
                  <div className="inline-flex items-center gap-1.5 bg-slate-950/88 border border-white/12 rounded-lg px-2.5 py-1">
                    <LevelBadgeIcon levelId={level.id} />
                    <span className={`font-display text-xs font-bold tracking-widest ${codeTone}`}>
                      {level.code}
                    </span>
                  </div>

                  {stats.bestScore > 0 && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-amber-300 bg-slate-950/85 border border-white/10 rounded-lg px-2 py-1">
                      <Trophy className="w-3 h-3" />
                      <span>{stats.bestScore.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Title, Description, Stats & PLAY Button */}
                <div className="relative z-10 p-4 sm:p-5 flex flex-col gap-2.5 mt-auto">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      {level.subtitle}
                    </div>
                    <h2
                      className={`font-display font-extrabold text-white tracking-wide leading-tight mt-0.5 ${
                        compactLand ? 'text-xl' : 'text-2xl sm:text-3xl'
                      }`}
                    >
                      {level.title}
                    </h2>
                    <p
                      className={`text-slate-200/95 leading-snug mt-1.5 ${
                        compactLand ? 'text-[11px] line-clamp-2' : 'text-xs sm:text-sm line-clamp-3'
                      }`}
                    >
                      {level.description}
                    </p>
                  </div>

                  {/* Per-Level Best Distance / Score */}
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-300 border-t border-white/10 pt-2">
                    <span>Best Distance: {stats.bestDistance.toLocaleString()} m</span>
                    <span>Best Score: {stats.bestScore.toLocaleString()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playClick();
                      onSelectLevel(level.id);
                    }}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl font-display font-extrabold tracking-wider shadow-lg transition-transform active:scale-96 cursor-pointer ${
                      compactLand ? 'py-2.5 text-sm' : 'py-3 sm:py-3.5 text-base'
                    } ${btnTheme}`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>PLAY</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
