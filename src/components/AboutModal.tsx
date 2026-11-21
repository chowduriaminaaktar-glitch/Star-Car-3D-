import { ArrowLeft, Car, Gamepad2, Layers, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { LEVEL_CATALOG } from '../game/types';
import { audioEngine } from '../game/audio';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/84 p-3 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto sc-scroll">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="text-xs font-display font-bold tracking-widest text-sky-400 uppercase">
            About Game
          </div>
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        <div className="flex flex-col items-center text-center mt-4">
          <BrandLogo size="about" glow />
          <p className="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
            High-speed 3D arcade racing built with Three.js and responsive two-handed landscape
            controls, dynamic weather, night lighting, nitro boost, and full 3D car customization.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
          {LEVEL_CATALOG.map((lvl) => (
            <div
              key={lvl.id}
              className="bg-slate-950/85 border border-white/10 rounded-xl p-3 text-left"
            >
              <div className="inline-flex items-center gap-1 text-[10px] font-display font-bold tracking-widest text-amber-400">
                <Layers className="w-3 h-3" />
                <span>{lvl.code}</span>
              </div>
              <div className="font-display font-bold text-xs sm:text-sm text-white mt-0.5">
                {lvl.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {lvl.subtitle}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="bg-slate-950/75 border border-white/10 rounded-xl p-3 flex items-start gap-2.5">
            <Gamepad2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">Thumb Racing Controls</div>
              <div className="text-slate-400 mt-0.5">
                Tap Left/Right to switch lanes cleanly; hold Gas, Brake, or tap Nitro on the right.
              </div>
            </div>
          </div>

          <div className="bg-slate-950/75 border border-white/10 rounded-xl p-3 flex items-start gap-2.5">
            <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white">Store & 3D Garage</div>
              <div className="text-slate-400 mt-0.5">
                Unlock 8 performance cars and customize paint, wheels, spoilers, and underglow.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>STAR CAR 3D</span>
          </span>
          <span className="font-mono-tabular">Version 1.0.0</span>
        </div>
      </div>
    </div>
  );
}
