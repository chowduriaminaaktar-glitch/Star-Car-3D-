import { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface LoadingScreenProps {
  engineReady: boolean;
  onComplete: () => void;
}

export function LoadingScreen({ engineReady, onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(12);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    let rafId = 0;
    const startTime = performance.now();
    const minDurationMs = 1150;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const targetCap = engineReady ? 100 : 88;
      const ratio = Math.min(1, elapsed / minDurationMs);
      // Smooth ease-out curve so progress climbs naturally then completes once engine is ready
      const eased = 1 - Math.pow(1 - ratio, 2.4);
      const nextVal = Math.min(targetCap, Math.round(12 + eased * 88));
      setProgress((prev) => (nextVal > prev ? nextVal : prev));

      if (engineReady && elapsed >= minDurationMs) {
        setProgress(100);
        setFadingOut(true);
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [engineReady]);

  useEffect(() => {
    if (!fadingOut) return;
    const timer = window.setTimeout(() => {
      onComplete();
    }, 340);
    return () => window.clearTimeout(timer);
  }, [fadingOut, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-slate-950 select-none transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        paddingLeft: 'max(env(safe-area-inset-left), 16px)',
        paddingRight: 'max(env(safe-area-inset-right), 16px)',
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      {/* Animated Midnight Racing Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 38%, rgba(14, 50, 120, 0.55) 0%, rgba(4, 10, 30, 0.92) 55%, #020617 100%)',
        }}
      />

      {/* Perspective Animated Highway Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[-20%] bottom-[-25%] h-[68%] sc-loading-grid opacity-55 pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 38%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 38%, black 100%)',
        }}
      />

      {/* Subtle Horizontal Light Streaks */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="sc-loading-streak absolute top-[24%] left-0 w-44 h-[2px] rounded-full bg-gradient-to-r from-transparent via-sky-400/70 to-transparent"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="sc-loading-streak absolute top-[62%] left-0 w-56 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400/55 to-transparent"
          style={{ animationDelay: '0.8s' }}
        />
        <div
          className="sc-loading-streak absolute top-[76%] left-0 w-36 h-[2px] rounded-full bg-gradient-to-r from-transparent via-blue-400/65 to-transparent"
          style={{ animationDelay: '1.5s' }}
        />
      </div>

      {/* Centered Logo & Progress Bar */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-4">
        <BrandLogo size="loading" glow animateIn priority />

        <div className="w-full max-w-xs sm:max-w-sm mt-5 sm:mt-7">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-display font-bold tracking-[0.18em] text-sky-200 mb-2">
            <span>LOADING STAR CAR 3D...</span>
            <span className="font-mono-tabular text-amber-300">{progress}%</span>
          </div>

          <div className="relative h-3 w-full rounded-full bg-slate-900/95 border border-sky-400/30 p-0.5 overflow-hidden shadow-[0_0_20px_rgba(56,189,248,0.22)]">
            <div
              className="h-full rounded-full transition-[width] duration-150 ease-out"
              style={{
                width: `${progress}%`,
                background:
                  'linear-gradient(90deg, #0284c7 0%, #38bdf8 55%, #facc15 100%)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.75)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
