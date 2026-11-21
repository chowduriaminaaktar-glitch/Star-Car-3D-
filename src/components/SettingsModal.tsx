import { ArrowLeft, Moon, Music, RotateCcw, Sun, Volume2, VolumeX } from 'lucide-react';
import {
  ControlButtonSize,
  DEFAULT_CONTROL_SETTINGS,
  GameSettings,
  GraphicsQuality,
  HudLayoutPosition,
  WeatherMode,
} from '../game/types';
import { audioEngine } from '../game/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

const GRAPHICS_OPTIONS: GraphicsQuality[] = ['LOW', 'MEDIUM', 'HIGH'];
const WEATHER_OPTIONS: { id: WeatherMode; label: string }[] = [
  { id: 'SUNNY', label: 'Sunny' },
  { id: 'RAINY', label: 'Rainy' },
  { id: 'FOGGY', label: 'Foggy' },
  { id: 'SNOWY', label: 'Snowy' },
  { id: 'RANDOM', label: 'Random' },
];
const BUTTON_SIZES: { id: ControlButtonSize; label: string }[] = [
  { id: 'SMALL', label: 'Small' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'LARGE', label: 'Large' },
];
const HUD_POSITIONS: { id: HudLayoutPosition; label: string }[] = [
  { id: 'EDGE', label: 'Edge' },
  { id: 'BALANCED', label: 'Balanced' },
  { id: 'COMFORT', label: 'Inward' },
];

export function SettingsModal({ settings, onChange, onClose }: SettingsModalProps) {
  const handleResetControls = () => {
    audioEngine.playClick();
    onChange({
      ...settings,
      ...DEFAULT_CONTROL_SETTINGS,
      sensitivity: 1.0,
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto sc-scroll">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
            SETTINGS
          </h2>
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>

        <div className="flex flex-col gap-5 mt-4">
          {/* Audio Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !settings.soundEnabled;
                onChange({ ...settings, soundEnabled: next });
                if (next) audioEngine.playClick();
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                  : 'bg-slate-800 border-white/10 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Sound
              </span>
              <span>{settings.soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onChange({ ...settings, musicEnabled: !settings.musicEnabled });
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                settings.musicEnabled
                  ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                  : 'bg-slate-800 border-white/10 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Music
              </span>
              <span>{settings.musicEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Two-Handed Landscape Controls Customization */}
          <div className="rounded-xl bg-slate-950/75 border border-white/10 p-3.5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Touch Controls Layout
              </span>
              <button
                type="button"
                onClick={handleResetControls}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Controls Layout</span>
              </button>
            </div>

            {/* Button Size */}
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1.5">Button Size</div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
                {BUTTON_SIZES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playClick();
                      onChange({ ...settings, controlSize: item.id });
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      settings.controlSize === item.id
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* HUD Position / Safe-Area Margin */}
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1.5">HUD Thumb Reach</div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
                {HUD_POSITIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playClick();
                      onChange({ ...settings, controlPosition: item.id });
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      settings.controlPosition === item.id
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Control Opacity */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
                <span>Control Opacity</span>
                <span className="font-mono-tabular text-sky-400">
                  {Math.round(settings.controlOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.45}
                max={1.0}
                step={0.05}
                value={settings.controlOpacity}
                onChange={(e) =>
                  onChange({ ...settings, controlOpacity: parseFloat(e.target.value) })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Lane Switch Speed / Sensitivity */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
                <span>Steering Speed</span>
                <span className="font-mono-tabular text-sky-400">
                  {settings.sensitivity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.1}
                value={settings.sensitivity}
                onChange={(e) =>
                  onChange({ ...settings, sensitivity: parseFloat(e.target.value) })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Day / Night Mode */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">Time of Day</div>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onChange({ ...settings, timeOfDay: 'DAY' });
                }}
                className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  settings.timeOfDay === 'DAY'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Daylight</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onChange({ ...settings, timeOfDay: 'NIGHT' });
                }}
                className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  settings.timeOfDay === 'NIGHT'
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Night Mode</span>
              </button>
            </div>
          </div>

          {/* Weather Selection */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">Weather Condition</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {WEATHER_OPTIONS.map((w) => {
                const active = settings.weatherMode === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playClick();
                      onChange({ ...settings, weatherMode: w.id });
                    }}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-400 border-sky-300 text-slate-950'
                        : 'bg-slate-800 border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Graphics Quality */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span>Graphics Quality</span>
              <span className="text-slate-300">Mobile optimization</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-950 border border-white/10">
              {GRAPHICS_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    onChange({ ...settings, graphics: g });
                  }}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    settings.graphics === g
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {g === 'LOW' ? 'Low' : g === 'MEDIUM' ? 'Medium' : 'High'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
