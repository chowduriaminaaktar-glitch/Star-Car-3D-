import { ArrowLeft, Check, Coins, Paintbrush, ShoppingBag } from 'lucide-react';
import { CAR_CATALOG, CarSpec } from '../game/types';
import { ViewportInfo } from '../game/viewport';
import { BrandLogo } from './BrandLogo';
import { CoinBadge } from './CoinBadge';
import { audioEngine } from '../game/audio';

interface GarageStoreModalProps {
  mode: 'STORE' | 'GARAGE';
  coins: number;
  ownedCarIds: string[];
  selectedCarId: string;
  previewCarId: string;
  viewport: ViewportInfo;
  onPreviewCar: (carId: string) => void;
  onBuyCar: (car: CarSpec) => void;
  onSelectCar: (carId: string) => void;
  onOpenCustomize: () => void;
  onSwitchMode: (mode: 'STORE' | 'GARAGE') => void;
  onBack: () => void;
}

export function GarageStoreModal({
  mode,
  coins,
  ownedCarIds,
  selectedCarId,
  previewCarId,
  viewport,
  onPreviewCar,
  onBuyCar,
  onSelectCar,
  onOpenCustomize,
  onSwitchMode,
  onBack,
}: GarageStoreModalProps) {
  const compactLand = viewport.isCompactLandscape;
  const visibleCars =
    mode === 'GARAGE'
      ? CAR_CATALOG.filter((c) => ownedCarIds.includes(c.id))
      : CAR_CATALOG;

  const activeCar =
    visibleCars.find((c) => c.id === previewCarId) ??
    CAR_CATALOG.find((c) => c.id === previewCarId) ??
    CAR_CATALOG[0];

  const isOwned = ownedCarIds.includes(activeCar.id);
  const isSelected = selectedCarId === activeCar.id;
  const canAfford = coins >= activeCar.price;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-between ${
        compactLand ? 'p-2.5' : 'p-4 sm:p-6'
      }`}
      style={{
        paddingLeft: 'max(env(safe-area-inset-left), 12px)',
        paddingRight: 'max(env(safe-area-inset-right), 12px)',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}
    >
      {/* Top Bar: Back + Mode Tabs + Coins */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onBack();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/15 text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <CoinBadge coins={coins} compact />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-white/12">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onSwitchMode('STORE');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'STORE' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Car Store
          </button>
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onSwitchMode('GARAGE');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'GARAGE' ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            My Garage ({ownedCarIds.length})
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:block text-xs text-slate-200 bg-slate-950/85 border border-white/10 rounded-lg px-3 py-2">
            Drag anywhere on car to rotate 3D preview
          </div>
          <BrandLogo size="header" />
        </div>
      </div>

      {/* Bottom Dock: Active Car Info + Action + Carousel */}
      <div
        className={`pointer-events-auto mx-auto w-full max-w-4xl bg-slate-950/92 border border-white/15 rounded-2xl shadow-2xl flex flex-col sc-scroll overflow-y-auto ${
          compactLand ? 'p-2.5 gap-2 max-h-[54dvh]' : 'p-4 gap-3.5 max-h-[58dvh]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          {/* Car Name & Specs */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h2
                className={`font-display font-bold text-white tracking-wide ${
                  compactLand ? 'text-lg' : 'text-xl sm:text-2xl'
                }`}
              >
                {activeCar.name}
              </h2>
              <span className="text-xs font-medium text-sky-400">
                {activeCar.classLabel} · {activeCar.topSpeedKmh} km/h
              </span>
            </div>
            {!compactLand && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1 line-clamp-1">
                {activeCar.description}
              </p>
            )}

            {/* Compact 4-Stat Bars */}
            <div className={`grid grid-cols-4 gap-2.5 ${compactLand ? 'mt-1.5' : 'mt-3'}`}>
              {[
                { label: 'Speed', val: Math.round((activeCar.topSpeedKmh / 380) * 100), color: 'bg-amber-400' },
                { label: 'Accel', val: activeCar.acceleration, color: 'bg-emerald-400' },
                { label: 'Handling', val: activeCar.handling, color: 'bg-sky-400' },
                { label: 'Nitro', val: activeCar.nitroPower, color: 'bg-indigo-400' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-300 mb-0.5">
                    <span>{stat.label}</span>
                    <span className="font-mono-tabular">{stat.val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${stat.color}`} style={{ width: `${stat.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Purchase / Select / Customize Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isOwned ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    onOpenCustomize();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Paintbrush className="w-4 h-4 text-emerald-400" />
                  <span>Customize</span>
                </button>
                <button
                  type="button"
                  disabled={isSelected}
                  onClick={() => {
                    audioEngine.playClick();
                    onSelectCar(activeCar.id);
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-display font-bold text-sm tracking-wide transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 cursor-default'
                      : 'bg-sky-400 hover:bg-sky-300 text-slate-950 cursor-pointer'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSelected ? 'SELECTED' : 'SELECT CAR'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => onBuyCar(activeCar)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-display font-bold text-sm tracking-wide transition-colors whitespace-nowrap ${
                  canAfford
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 border border-white/10 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{canAfford ? `BUY · ${activeCar.price}` : `NEED ${activeCar.price}`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Car Selector Strip */}
        <div className="flex items-center gap-2 overflow-x-auto sc-scroll pt-1 pb-0.5">
          {visibleCars.map((car) => {
            const owned = ownedCarIds.includes(car.id);
            const selected = selectedCarId === car.id;
            const active = activeCar.id === car.id;
            return (
              <button
                key={car.id}
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onPreviewCar(car.id);
                }}
                className={`flex flex-col items-start min-w-[138px] px-3 py-2 rounded-xl border text-left transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-800 border-amber-400'
                    : 'bg-slate-900/90 border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="font-display font-bold text-xs text-white truncate">
                    {car.name}
                  </span>
                  {selected ? (
                    <span className="text-[10px] font-semibold text-emerald-400">Active</span>
                  ) : owned ? (
                    <span className="text-[10px] font-medium text-sky-400">Owned</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-mono-tabular text-slate-300">
                  {!owned ? (
                    <>
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300">{car.price}</span>
                    </>
                  ) : (
                    <span>{car.topSpeedKmh} km/h</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
