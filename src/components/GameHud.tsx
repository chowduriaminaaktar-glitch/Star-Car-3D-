import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
} from 'lucide-react';
import {
  ControlButtonSize,
  GameSettings,
  HudLayoutPosition,
  HudSnapshot,
  LEVEL_CATALOG,
} from '../game/types';
import { ViewportInfo } from '../game/viewport';
import { CoinBadge } from './CoinBadge';

interface GameHudProps {
  hud: HudSnapshot;
  settings: GameSettings;
  viewport: ViewportInfo;
  onPause: () => void;
  onToggleFullscreen: () => void;
  onSteerLeft: () => void;
  onSteerRight: () => void;
  onThrottleChange: (active: boolean) => void;
  onBrakeChange: (active: boolean) => void;
  onNitroTap: () => void;
  onClearAllInputs: () => void;
}

interface TapActionButtonProps {
  label: string;
  onTap: () => void;
  className?: string;
  children: (pressed: boolean) => React.ReactNode;
}

/**
 * Single-tap button for discrete 1-lane steering & tap-to-activate Nitro.
 * Fires immediately on pointerdown, suppresses trailing click events so
 * touch + click never double-fire, never repeats when held, and tracks its
 * own pointerId cleanly for simultaneous multi-thumb play.
 */
function TapActionButton({
  label,
  onTap,
  className = '',
  children,
}: TapActionButtonProps) {
  const [pressed, setPressed] = useState(false);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const activePointerIdRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);
  const suppressResetTimerRef = useRef<number | null>(null);

  const clearSuppressTimer = () => {
    if (suppressResetTimerRef.current !== null) {
      window.clearTimeout(suppressResetTimerRef.current);
      suppressResetTimerRef.current = null;
    }
  };

  const scheduleSuppressReset = () => {
    clearSuppressTimer();
    suppressResetTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = false;
      suppressResetTimerRef.current = null;
    }, 320);
  };

  useEffect(() => {
    const resetVisual = () => {
      activePointerIdRef.current = null;
      setPressed(false);
    };
    const onVis = () => {
      if (document.hidden) resetVisual();
    };
    window.addEventListener('blur', resetVisual);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', resetVisual);
      document.removeEventListener('visibilitychange', onVis);
      clearSuppressTimer();
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        clearSuppressTimer();
        suppressNextClickRef.current = true;
        activePointerIdRef.current = e.pointerId;
        setPressed(true);
        onTapRef.current();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        if (activePointerIdRef.current === null || activePointerIdRef.current === e.pointerId) {
          activePointerIdRef.current = null;
          setPressed(false);
          scheduleSuppressReset();
        }
      }}
      onPointerCancel={(e) => {
        if (activePointerIdRef.current === null || activePointerIdRef.current === e.pointerId) {
          activePointerIdRef.current = null;
          setPressed(false);
          scheduleSuppressReset();
        }
      }}
      onLostPointerCapture={(e) => {
        if (activePointerIdRef.current === null || activePointerIdRef.current === e.pointerId) {
          activePointerIdRef.current = null;
          setPressed(false);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && activePointerIdRef.current === e.pointerId) {
          activePointerIdRef.current = null;
          setPressed(false);
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (suppressNextClickRef.current) {
          suppressNextClickRef.current = false;
          clearSuppressTimer();
          return;
        }
        onTapRef.current();
      }}
      className={`select-none touch-none outline-none cursor-pointer transition-transform duration-75 ${
        pressed ? 'scale-92 brightness-115' : 'scale-100 hover:brightness-105'
      } ${className}`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      {children(pressed)}
    </button>
  );
}

interface HoldControlProps {
  label: string;
  onHoldChange: (active: boolean) => void;
  className?: string;
  children: (pressed: boolean) => React.ReactNode;
}

/**
 * Multitouch hold pedal button (Accelerator & Brake).
 * Uses stable callback ref + Pointer Events + setPointerCapture keyed by each
 * button's own pointerId so 40Hz HUD updates never tear down or release held
 * pedals, while still guaranteeing clean release on up/cancel/lostcapture/blur.
 */
function HoldControlButton({
  label,
  onHoldChange,
  className = '',
  children,
}: HoldControlProps) {
  const [pressed, setPressed] = useState(false);
  const onHoldChangeRef = useRef(onHoldChange);
  onHoldChangeRef.current = onHoldChange;
  const activeRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  const release = useCallback((pointerId?: number) => {
    if (
      pointerId !== undefined &&
      activePointerIdRef.current !== null &&
      activePointerIdRef.current !== pointerId
    ) {
      return;
    }
    activePointerIdRef.current = null;
    if (!activeRef.current) return;
    activeRef.current = false;
    setPressed(false);
    onHoldChangeRef.current(false);
  }, []);

  const engage = useCallback((pointerId: number) => {
    activePointerIdRef.current = pointerId;
    if (activeRef.current) return;
    activeRef.current = true;
    setPressed(true);
    onHoldChangeRef.current(true);
  }, []);

  useEffect(() => {
    const handleGlobalBlur = () => release();
    const handleVisibilityChange = () => {
      if (document.hidden) release();
    };
    const handleGlobalPointerEnd = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && activePointerIdRef.current === e.pointerId) {
        release(e.pointerId);
      }
    };
    window.addEventListener('blur', handleGlobalBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', handleGlobalPointerEnd);
    return () => {
      window.removeEventListener('blur', handleGlobalBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
      if (activeRef.current) {
        activeRef.current = false;
        activePointerIdRef.current = null;
        onHoldChangeRef.current(false);
      }
    };
  }, [release]);

  return (
    <button
      type="button"
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore on synthetic events
        }
        engage(e.pointerId);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        release(e.pointerId);
      }}
      onPointerCancel={(e) => {
        e.preventDefault();
        release(e.pointerId);
      }}
      onLostPointerCapture={(e) => {
        release(e.pointerId);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') {
          const hasCap =
            typeof e.currentTarget.hasPointerCapture === 'function' &&
            e.currentTarget.hasPointerCapture(e.pointerId);
          if (!hasCap) {
            release(e.pointerId);
          }
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`select-none touch-none outline-none cursor-pointer transition-transform duration-75 ${
        pressed ? 'scale-92 brightness-115' : 'scale-100 hover:brightness-105'
      } ${className}`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      {children(pressed)}
    </button>
  );
}

/**
 * Large circular glossy blue steering button with crisp white arrow.
 */
function SteeringCircleSvg({ direction, pressed }: { direction: 'left' | 'right'; pressed: boolean }) {
  const discGradId = `steerDiscGrad_${direction}`;
  const ringGradId = `steerRingGrad_${direction}`;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.55)]">
      <defs>
        <radialGradient id={discGradId} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={pressed ? '#60a5fa' : '#3b82f6'} stopOpacity="0.72" />
          <stop offset="65%" stopColor="#1d4ed8" stopOpacity="0.68" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.82" />
        </radialGradient>
        <linearGradient id={ringGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Translucent glossy blue circular body */}
      <circle cx="50" cy="50" r="44" fill={`url(#${discGradId})`} />

      {/* Crisp white outer ring + glowing blue bevel */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff" strokeWidth="2.6" />
      <circle cx="50" cy="50" r="41" fill="none" stroke={`url(#${ringGradId})`} strokeWidth="6" opacity="0.92" />

      {/* Top gloss reflection */}
      <path
        d="M 23 28 A 35 35 0 0 1 77 28"
        fill="none"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Crisp solid white directional arrow */}
      <g transform={direction === 'right' ? 'translate(100,0) scale(-1,1)' : undefined}>
        <path
          d="M 61 28 L 31 50 L 61 72 L 53 50 Z"
          fill="#ffffff"
          stroke="#1e3a8a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function AcceleratorPedalSvg({ pressed }: { pressed: boolean }) {
  return (
    <svg viewBox="0 0 88 122" className="w-full h-full drop-shadow-[0_5px_14px_rgba(0,0,0,0.58)]">
      <defs>
        <linearGradient id="accelPedalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pressed ? '#a7f3d0' : '#6ee7b7'} stopOpacity="0.92" />
          <stop offset="45%" stopColor="#10b981" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <path
        d="M 11 5 L 77 5 Q 83 5 82 12 L 73 110 Q 72 117 65 117 L 23 117 Q 16 117 15 110 L 6 12 Q 5 5 11 5 Z"
        fill="url(#accelPedalGrad)"
        stroke="#ffffff"
        strokeWidth="3.8"
        strokeLinejoin="round"
      />

      <path d="M 12 9 L 76 9 L 71 42 L 13 26 Z" fill="rgba(255,255,255,0.2)" />

      {/* Corner rivets */}
      <circle cx="16" cy="14" r="2.8" fill="#ffffff" opacity="0.9" />
      <circle cx="72" cy="14" r="2.8" fill="#ffffff" opacity="0.9" />
      <circle cx="24" cy="107" r="2.8" fill="#ffffff" opacity="0.9" />
      <circle cx="64" cy="107" r="2.8" fill="#ffffff" opacity="0.9" />

      {/* Grip ribs */}
      {[28, 42, 56, 70, 84].map((y, idx) => {
        const inset = 16 + idx * 1.4;
        return (
          <line
            key={y}
            x1={inset}
            y1={y}
            x2={88 - inset}
            y2={y}
            stroke="rgba(255,255,255,0.78)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        );
      })}

      <text
        x="44"
        y="100"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10"
        fontWeight="800"
        letterSpacing="1"
      >
        GAS
      </text>
    </svg>
  );
}

function BrakePedalSvg({ pressed }: { pressed: boolean }) {
  return (
    <svg viewBox="0 0 88 84" className="w-full h-full drop-shadow-[0_5px_14px_rgba(0,0,0,0.58)]">
      <defs>
        <linearGradient id="brakePedalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pressed ? '#fca5a5' : '#f87171'} stopOpacity="0.92" />
          <stop offset="50%" stopColor="#dc2626" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#991b1b" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <path
        d="M 11 5 L 77 5 Q 83 5 83 12 L 80 55 Q 80 62 74 68 L 62 77 Q 58 80 52 80 L 36 80 Q 30 80 26 77 L 14 68 Q 8 62 8 55 L 5 12 Q 5 5 11 5 Z"
        fill="url(#brakePedalGrad)"
        stroke="#ffffff"
        strokeWidth="3.8"
        strokeLinejoin="round"
      />

      <path d="M 11 9 L 77 9 L 77 25 L 10 17 Z" fill="rgba(255,255,255,0.18)" />

      {[21, 33, 45].map((y) => (
        <line
          key={y}
          x1="18"
          y1={y}
          x2="70"
          y2={y}
          stroke="rgba(255,255,255,0.78)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ))}

      <text
        x="44"
        y="65"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10"
        fontWeight="800"
        letterSpacing="0.8"
      >
        BRAKE
      </text>
    </svg>
  );
}

/**
 * Separate Blue/Purple tap-to-activate NITRO button with live circular charge ring.
 */
function NitroTapButtonSvg({
  energy,
  active,
  cooldown,
  pressed,
}: {
  energy: number;
  active: boolean;
  cooldown: boolean;
  pressed: boolean;
}) {
  const pct = Math.max(0, Math.min(100, energy));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  const ready = pct >= 15 && !cooldown;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_14px_rgba(79,70,229,0.55)]">
      <defs>
        <radialGradient id="nitroBtnBg" cx="50%" cy="35%" r="65%">
          <stop
            offset="0%"
            stopColor={active ? '#38bdf8' : pressed ? '#818cf8' : '#6366f1'}
            stopOpacity={ready || active ? '0.9' : '0.55'}
          />
          <stop
            offset="65%"
            stopColor={active ? '#2563eb' : '#4338ca'}
            stopOpacity={ready || active ? '0.88' : '0.55'}
          />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      {/* Outer translucent blue-purple circle */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="url(#nitroBtnBg)"
        stroke={active ? '#7dd3fc' : '#ffffff'}
        strokeWidth={active ? '3.4' : '2.4'}
      />

      {/* Energy charge progress ring */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="rgba(15, 23, 42, 0.55)"
        strokeWidth="5.5"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={active ? '#e0f2fe' : cooldown ? '#f59e0b' : '#38bdf8'}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 50 50)"
      />

      {/* Nitro bottle / flame emblem */}
      <path
        d="M 52 21 C 52 21 63 32 63 42 C 63 49.5 57.2 55 50 55 C 42.8 55 37 49.5 37 42 C 37 36.2 41 31 44 28 C 44 33 47 35 47 35 C 47 35 46 27 52 21 Z"
        fill="#ffffff"
        opacity={ready || active ? 0.96 : 0.6}
      />
      <text
        x="50"
        y="71"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="12.5"
        fontWeight="900"
        letterSpacing="1"
      >
        {active ? 'BOOST' : cooldown ? 'COOL' : 'NITRO'}
      </text>
    </svg>
  );
}

/**
 * Live 250-degree digital speedometer dial with dark translucent housing,
 * blue glowing bezel, calibrated tick marks, progress arc, and outer needle.
 */
const SPEEDO_CX = 92;
const SPEEDO_CY = 82;
const SPEEDO_RADIUS = 64;
const SPEEDO_START_DEG = 145;
const SPEEDO_SWEEP_DEG = 250;
const SPEEDO_ARC_LEN = (SPEEDO_SWEEP_DEG / 360) * 2 * Math.PI * SPEEDO_RADIUS;
const SPEEDO_TICK_COUNT = 24;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

const SPEEDO_START_PT = polarToCartesian(SPEEDO_CX, SPEEDO_CY, SPEEDO_RADIUS, SPEEDO_START_DEG);
const SPEEDO_END_PT = polarToCartesian(
  SPEEDO_CX,
  SPEEDO_CY,
  SPEEDO_RADIUS,
  SPEEDO_START_DEG + SPEEDO_SWEEP_DEG
);
const SPEEDO_ARC_PATH = `M ${SPEEDO_START_PT.x.toFixed(2)} ${SPEEDO_START_PT.y.toFixed(
  2
)} A ${SPEEDO_RADIUS} ${SPEEDO_RADIUS} 0 1 1 ${SPEEDO_END_PT.x.toFixed(
  2
)} ${SPEEDO_END_PT.y.toFixed(2)}`;

function DigitalSpeedometer({
  speedKmh,
  topSpeedKmh,
  nitroActive,
  compact,
}: {
  speedKmh: number;
  topSpeedKmh: number;
  nitroActive: boolean;
  compact: boolean;
}) {
  const gaugeMaxKmh = Math.max(320, Math.ceil((topSpeedKmh * 1.32) / 40) * 40);
  const ratio = Math.max(0, Math.min(1, speedKmh / gaugeMaxKmh));
  const dashOffset = SPEEDO_ARC_LEN * (1 - ratio);
  const needleRotationDeg = -125 + ratio * SPEEDO_SWEEP_DEG;
  const activeTickIndex = Math.round(ratio * SPEEDO_TICK_COUNT);

  return (
    <div
      className={`pointer-events-none relative flex items-center justify-center select-none ${
        compact ? 'w-36 h-26' : 'w-44 h-32 sm:w-50 sm:h-35'
      }`}
    >
      <svg
        viewBox="0 0 184 134"
        className="w-full h-full overflow-visible drop-shadow-[0_6px_18px_rgba(37,99,235,0.35)]"
      >
        <defs>
          <radialGradient id="speedoHousingBg" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor={nitroActive ? '#0c2348' : '#08142b'} stopOpacity="0.92" />
            <stop offset="78%" stopColor="#040b18" stopOpacity="0.86" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.78" />
          </radialGradient>
          <linearGradient id="speedoArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="85%" stopColor={nitroActive ? '#e0f2fe' : '#60a5fa'} />
            <stop offset="100%" stopColor={nitroActive ? '#7dd3fc' : '#f43f5e'} />
          </linearGradient>
          <filter id="speedoBlueGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={SPEEDO_CX}
          cy={SPEEDO_CY}
          r="76"
          fill="url(#speedoHousingBg)"
          stroke={nitroActive ? 'rgba(125, 211, 252, 0.72)' : 'rgba(56, 189, 248, 0.42)'}
          strokeWidth="1.8"
        />
        <circle
          cx={SPEEDO_CX}
          cy={SPEEDO_CY}
          r="71"
          fill="none"
          stroke="rgba(37, 99, 235, 0.25)"
          strokeWidth="1"
        />

        <path
          d={SPEEDO_ARC_PATH}
          fill="none"
          stroke="rgba(30, 58, 138, 0.42)"
          strokeWidth="9"
          strokeLinecap="round"
        />

        <path
          d={SPEEDO_ARC_PATH}
          fill="none"
          stroke="url(#speedoArcGrad)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeDasharray={SPEEDO_ARC_LEN}
          strokeDashoffset={dashOffset}
          filter="url(#speedoBlueGlow)"
          style={{ transition: 'stroke-dashoffset 60ms linear' }}
        />

        {Array.from({ length: SPEEDO_TICK_COUNT + 1 }).map((_, idx) => {
          const deg = SPEEDO_START_DEG + (idx / SPEEDO_TICK_COUNT) * SPEEDO_SWEEP_DEG;
          const isMajor = idx % 4 === 0;
          const lit = idx <= activeTickIndex && speedKmh > 0;
          const isRedzone = idx >= SPEEDO_TICK_COUNT - 3;
          const outer = polarToCartesian(SPEEDO_CX, SPEEDO_CY, 56, deg);
          const inner = polarToCartesian(SPEEDO_CX, SPEEDO_CY, isMajor ? 48 : 51.5, deg);
          const stroke = lit
            ? isRedzone && !nitroActive
              ? '#fb7185'
              : '#7dd3fc'
            : isRedzone
              ? 'rgba(244, 63, 94, 0.35)'
              : 'rgba(148, 163, 184, 0.35)';
          return (
            <line
              key={idx}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={stroke}
              strokeWidth={isMajor ? 2.2 : 1.3}
              strokeLinecap="round"
            />
          );
        })}

        <g
          style={{
            transform: `rotate(${needleRotationDeg}deg)`,
            transformOrigin: `${SPEEDO_CX}px ${SPEEDO_CY}px`,
            transition: 'transform 60ms linear',
          }}
          filter="url(#speedoBlueGlow)"
        >
          <polygon
            points={`${SPEEDO_CX - 3},${SPEEDO_CY - 45} ${SPEEDO_CX},${SPEEDO_CY - 69} ${
              SPEEDO_CX + 3
            },${SPEEDO_CY - 45}`}
            fill={nitroActive ? '#e0f2fe' : '#38bdf8'}
          />
          <circle cx={SPEEDO_CX} cy={SPEEDO_CY - 64} r="2.4" fill="#ffffff" />
        </g>

        <rect
          x="56"
          y="108"
          width="72"
          height="16"
          rx="8"
          fill={nitroActive ? 'rgba(14, 165, 233, 0.28)' : 'rgba(15, 23, 42, 0.86)'}
          stroke={nitroActive ? 'rgba(125, 211, 252, 0.8)' : 'rgba(56, 189, 248, 0.35)'}
          strokeWidth="1"
        />
        <text
          x={SPEEDO_CX}
          y="119"
          textAnchor="middle"
          fill={nitroActive ? '#7dd3fc' : speedKmh === 0 ? '#94a3b8' : '#60a5fa'}
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="1.3"
        >
          {nitroActive ? 'NITRO' : speedKmh === 0 ? 'STOPPED' : 'KM/H'}
        </text>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pb-1">
        <div
          className={`font-display font-mono-tabular font-extrabold tracking-tight leading-none ${
            nitroActive
              ? 'text-sky-200 drop-shadow-[0_0_12px_rgba(56,189,248,0.95)]'
              : 'text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.75)]'
          } ${compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'}`}
        >
          {speedKmh}
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-sky-400/90 mt-0.5">
          km/h
        </span>
      </div>
    </div>
  );
}

function getControlDimensions(size: ControlButtonSize, compactLand: boolean) {
  if (size === 'SMALL') {
    return {
      steer: compactLand ? 'w-14 h-14' : 'w-16 h-16 sm:w-18 sm:h-18',
      brake: compactLand ? 'w-14 h-14' : 'w-16 h-15 sm:w-18 sm:h-17',
      accel: compactLand ? 'w-15 h-19' : 'w-17 h-22 sm:w-19 sm:h-24',
      nitro: compactLand ? 'w-13 h-13' : 'w-14 h-14 sm:w-16 sm:h-16',
    };
  }
  if (size === 'LARGE') {
    return {
      steer: compactLand ? 'w-20 h-20' : 'w-22 h-22 sm:w-26 sm:h-26',
      brake: compactLand ? 'w-19 h-18' : 'w-21 h-20 sm:w-23 sm:h-22',
      accel: compactLand ? 'w-20 h-25' : 'w-22 h-28 sm:w-25 sm:h-31',
      nitro: compactLand ? 'w-17 h-17' : 'w-19 h-19 sm:w-21 sm:h-21',
    };
  }
  // MEDIUM (ergonomic default)
  return {
    steer: compactLand ? 'w-17 h-17 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-23 sm:h-23',
    brake: compactLand ? 'w-16 h-16 sm:w-18 sm:h-17' : 'w-18 h-17 sm:w-20 sm:h-19',
    accel: compactLand ? 'w-17 h-22 sm:w-19 sm:h-24' : 'w-19 h-24 sm:w-22 sm:h-27',
    nitro: compactLand ? 'w-15 h-15 sm:w-16 sm:h-16' : 'w-16 h-16 sm:w-18 sm:h-18',
  };
}

function getSafeAreaPadding(pos: HudLayoutPosition) {
  if (pos === 'EDGE') {
    return {
      sidePx: 10,
      bottomPx: 8,
    };
  }
  if (pos === 'COMFORT') {
    return {
      sidePx: 26,
      bottomPx: 20,
    };
  }
  // BALANCED
  return {
    sidePx: 16,
    bottomPx: 12,
  };
}

export function GameHud({
  hud,
  settings,
  viewport,
  onPause,
  onToggleFullscreen,
  onSteerLeft,
  onSteerRight,
  onThrottleChange,
  onBrakeChange,
  onNitroTap,
  onClearAllInputs,
}: GameHudProps) {
  const [controlsHidden, setControlsHidden] = useState(false);
  const compactLand = viewport.isCompactLandscape;
  const dims = getControlDimensions(settings.controlSize, compactLand);
  const safePad = getSafeAreaPadding(settings.controlPosition);
  const activeLevelSpec = LEVEL_CATALOG.find((l) => l.id === hud.levelId) ?? LEVEL_CATALOG[0];

  const toggleControlsVisibility = () => {
    setControlsHidden((prev) => {
      const next = !prev;
      if (next) {
        onClearAllInputs();
      }
      return next;
    });
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between overflow-hidden select-none touch-none"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        paddingLeft: `max(env(safe-area-inset-left), ${safePad.sidePx}px)`,
        paddingRight: `max(env(safe-area-inset-right), ${safePad.sidePx}px)`,
        paddingTop: 'max(env(safe-area-inset-top), 10px)',
        paddingBottom: `max(env(safe-area-inset-bottom), ${safePad.bottomPx}px)`,
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Subtle Weather & Nitro Screen Effects */}
      {hud.activeWeather === 'RAINY' && (
        <div className="rain-windshield pointer-events-none fixed inset-0 z-0 opacity-75" />
      )}
      {hud.nitroActive && (
        <div className="nitro-speedlines pointer-events-none fixed inset-0 z-0" />
      )}

      {/* Top HUD Bar: Coin Counter, Score & Distance, Nitro Meter, Fullscreen & Pause */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        {/* Top-Left: Persistent Coin Counter + Run Coins */}
        <div className="flex flex-col gap-1 shrink-0">
          <CoinBadge coins={hud.totalCoins} compact />
          {!compactLand && (
            <div className="text-[11px] font-mono-tabular text-amber-300 bg-slate-950/88 border border-white/10 rounded-lg px-2.5 py-0.5 w-fit">
              +{hud.coinsThisRun} run
            </div>
          )}
        </div>

        {/* Top-Center: Score, Distance & Nitro Energy Bar */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`flex items-center bg-slate-950/88 border border-white/12 rounded-2xl shadow-xl ${
              compactLand ? 'gap-3.5 px-4 py-1.5' : 'gap-5 sm:gap-7 px-5 sm:px-7 py-2'
            }`}
          >
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-none">
                Score
              </div>
              <div
                className={`font-mono-tabular font-bold text-white leading-tight mt-0.5 ${
                  compactLand ? 'text-sm sm:text-lg' : 'text-base sm:text-2xl'
                }`}
              >
                {hud.score.toLocaleString()}
              </div>
            </div>
            <div className="h-6 w-px bg-white/15" />
            <div className="text-center">
              <div className="text-[10px] sm:text-xs text-slate-400 font-medium leading-none">
                Distance
              </div>
              <div
                className={`font-mono-tabular font-bold text-sky-400 leading-tight mt-0.5 ${
                  compactLand ? 'text-sm sm:text-lg' : 'text-base sm:text-2xl'
                }`}
              >
                {hud.distanceMeters.toLocaleString()} m
              </div>
            </div>
          </div>

          {/* Slim Nitro Energy Meter Bar */}
          <div
            className={`flex items-center gap-2 bg-slate-950/85 border border-white/10 rounded-xl px-3 py-1 shadow ${
              compactLand ? 'w-44' : 'w-52 sm:w-64'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 shrink-0 ${hud.nitroActive ? 'text-sky-300' : 'text-sky-400'}`} />
            <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  hud.nitroActive
                    ? 'bg-sky-300'
                    : hud.nitroCooldown
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                }`}
                style={{ width: `${hud.nitroEnergy}%` }}
              />
            </div>
            <span className="font-mono-tabular text-[11px] font-semibold text-slate-200 w-9 text-right">
              {hud.nitroCooldown ? 'COOL' : `${hud.nitroEnergy}%`}
            </span>
          </div>

          <div className="text-[10px] font-display font-bold tracking-widest uppercase text-slate-200/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {activeLevelSpec.code} · {activeLevelSpec.title}
          </div>
        </div>

        {/* Top-Right: Weather label + Fullscreen + Pause */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="hidden xl:inline-block text-xs font-medium text-slate-200 bg-slate-950/88 border border-white/10 rounded-lg px-3 py-2">
            {hud.isNight ? 'Night' : 'Day'} ·{' '}
            {hud.activeWeather.charAt(0) + hud.activeWeather.slice(1).toLowerCase()}
          </span>

          {viewport.fullscreenSupported && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={viewport.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Landscape'}
              className={`${
                compactLand ? 'w-9 h-9' : 'w-10 h-10 sm:w-11 sm:h-11'
              } rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/15 flex items-center justify-center text-sky-400 transition-colors cursor-pointer shadow-lg`}
            >
              {viewport.isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClearAllInputs();
              onPause();
            }}
            aria-label="Pause Game"
            className={`${
              compactLand ? 'w-9 h-9' : 'w-10 h-10 sm:w-11 sm:h-11'
            } rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer shadow-lg`}
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Two-Handed Ergonomic Bottom Controls Layer + Center Speedometer */}
      <div className="relative z-10 flex items-end justify-between gap-2 min-h-[120px]">
        {/* LEFT THUMB CONTROL AREA (Bottom-Left): Hide Toggle + Left/Right One-Tap Lane Buttons */}
        <div className="pointer-events-auto flex flex-col items-start gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleControlsVisibility}
            aria-label={controlsHidden ? 'Show Controls' : 'Hide Controls'}
            title={controlsHidden ? 'Show Controls' : 'Hide Controls'}
            className="w-8 h-7 rounded-lg bg-slate-950/55 hover:bg-slate-950/85 border border-white/15 flex items-center justify-center text-white/90 transition-colors cursor-pointer"
          >
            {controlsHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {!controlsHidden && (
            <div
              className={`flex items-center ${compactLand ? 'gap-3' : 'gap-4 sm:gap-5'}`}
              style={{ opacity: settings.controlOpacity }}
            >
              <TapActionButton
                label="Switch Lane Left"
                onTap={onSteerLeft}
                className={dims.steer}
              >
                {(pressed) => <SteeringCircleSvg direction="left" pressed={pressed} />}
              </TapActionButton>

              <TapActionButton
                label="Switch Lane Right"
                onTap={onSteerRight}
                className={dims.steer}
              >
                {(pressed) => <SteeringCircleSvg direction="right" pressed={pressed} />}
              </TapActionButton>
            </div>
          )}
        </div>

        {/* CENTER SPEEDOMETER (Bottom-Center in Landscape, clear of both thumb areas) */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center justify-end">
          <DigitalSpeedometer
            speedKmh={hud.speedKmh}
            topSpeedKmh={hud.topSpeedKmh}
            nitroActive={hud.nitroActive}
            compact={compactLand}
          />
        </div>

        {/* RIGHT THUMB CONTROL AREA (Bottom-Right): Separate Nitro Tap above Brake & Accelerator */}
        {!controlsHidden && (
          <div
            className="pointer-events-auto ml-auto flex flex-col items-end gap-2 shrink-0"
            style={{ opacity: settings.controlOpacity }}
          >
            {/* Upper-Right Thumb Arc: Blue/Purple Tap-to-Activate Nitro */}
            <div className="pr-1">
              <TapActionButton
                label="Nitro Boost"
                onTap={onNitroTap}
                className={dims.nitro}
              >
                {(pressed) => (
                  <NitroTapButtonSvg
                    energy={hud.nitroEnergy}
                    active={hud.nitroActive}
                    cooldown={hud.nitroCooldown}
                    pressed={pressed}
                  />
                )}
              </TapActionButton>
            </div>

            {/* Lower-Right Thumb Ergonomic Pair: Red Brake (inner) + Green Accelerator (outer) */}
            <div className={`flex items-end ${compactLand ? 'gap-3' : 'gap-3.5 sm:gap-4'}`}>
              <HoldControlButton
                label="Brake"
                onHoldChange={onBrakeChange}
                className={dims.brake}
              >
                {(pressed) => <BrakePedalSvg pressed={pressed} />}
              </HoldControlButton>

              <HoldControlButton
                label="Accelerator"
                onHoldChange={onThrottleChange}
                className={dims.accel}
              >
                {(pressed) => <AcceleratorPedalSvg pressed={pressed} />}
              </HoldControlButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
