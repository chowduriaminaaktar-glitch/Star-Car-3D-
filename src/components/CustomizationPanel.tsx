import { useState } from 'react';
import { ArrowLeft, Check, Coins, RotateCcw } from 'lucide-react';
import {
  ACCESSORY_OPTIONS,
  AccessoryStyle,
  CarCustomization,
  CarSpec,
  getCustomItemKey,
  getDefaultCustomization,
  PAINT_COLORS,
  PAINT_FINISHES,
  PaintFinish,
  SPOILER_OPTIONS,
  SpoilerStyle,
  UNDERGLOW_OPTIONS,
  WHEEL_COLORS,
  WHEEL_DESIGNS,
  WheelDesign,
} from '../game/types';
import { ViewportInfo } from '../game/viewport';
import { CoinBadge } from './CoinBadge';
import { audioEngine } from '../game/audio';

type CustomTab = 'paint' | 'wheels' | 'spoiler' | 'aero' | 'underglow';

interface CustomizationPanelProps {
  car: CarSpec;
  coins: number;
  savedCustom: CarCustomization;
  draftCustom: CarCustomization;
  unlockedKeys: string[];
  viewport: ViewportInfo;
  onPreviewDraft: (next: CarCustomization) => void;
  onApply: (next: CarCustomization, totalCost: number, newlyUnlocked: string[]) => void;
  onReset: () => void;
  onBack: () => void;
}

export function CustomizationPanel({
  car,
  coins,
  savedCustom,
  draftCustom,
  unlockedKeys,
  viewport,
  onPreviewDraft,
  onApply,
  onReset,
  onBack,
}: CustomizationPanelProps) {
  const [tab, setTab] = useState<CustomTab>('paint');
  const compactLand = viewport.isCompactLandscape;

  const isUnlocked = (cat: string, id: string, price: number) => {
    if (price === 0) return true;
    return unlockedKeys.includes(getCustomItemKey(cat, id));
  };

  // Compute total cost of all locked items currently selected in draft
  const pendingItems: { key: string; price: number }[] = [];
  const checkItem = (cat: string, id: string, price: number) => {
    if (price > 0 && !isUnlocked(cat, id, price)) {
      pendingItems.push({ key: getCustomItemKey(cat, id), price });
    }
  };

  const paintObj = PAINT_COLORS.find((p) => p.id === draftCustom.bodyColor);
  if (paintObj) checkItem('paintColor', paintObj.id, paintObj.price);

  const finishObj = PAINT_FINISHES.find((f) => f.id === draftCustom.finish);
  if (finishObj) checkItem('finish', finishObj.id, finishObj.price);

  const wheelObj = WHEEL_DESIGNS.find((w) => w.id === draftCustom.wheelDesign);
  if (wheelObj) checkItem('wheelDesign', wheelObj.id, wheelObj.price);

  const wheelColObj = WHEEL_COLORS.find((wc) => wc.id === draftCustom.wheelColor);
  if (wheelColObj) checkItem('wheelColor', wheelColObj.id, wheelColObj.price);

  const spoilerObj = SPOILER_OPTIONS.find((s) => s.id === draftCustom.spoiler);
  if (spoilerObj) checkItem('spoiler', spoilerObj.id, spoilerObj.price);

  const accObj = ACCESSORY_OPTIONS.find((a) => a.id === draftCustom.accessory);
  if (accObj) checkItem('accessory', accObj.id, accObj.price);

  const glowObj = UNDERGLOW_OPTIONS.find((u) => u.id === draftCustom.underglowColor);
  if (glowObj) checkItem('underglow', glowObj.id, glowObj.price);

  const totalCost = pendingItems.reduce((sum, item) => sum + item.price, 0);
  const canAfford = coins >= totalCost;
  const hasChanges = JSON.stringify(draftCustom) !== JSON.stringify(savedCustom);

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
      {/* Top Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onBack();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/15 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <CoinBadge coins={coins} compact />
        </div>

        <div className="text-right bg-slate-950/88 border border-white/12 rounded-xl px-3.5 py-2">
          <div className="font-display font-bold text-sm sm:text-base text-white">
            Customize · {car.name}
          </div>
          <div className="text-[11px] text-slate-400">Drag car to inspect 360°</div>
        </div>
      </div>

      {/* Bottom Customizer Dock */}
      <div
        className={`pointer-events-auto mx-auto w-full max-w-4xl bg-slate-950/92 border border-white/15 rounded-2xl shadow-2xl flex flex-col sc-scroll overflow-y-auto ${
          compactLand ? 'p-2.5 gap-2 max-h-[54dvh]' : 'p-4 gap-3 max-h-[58dvh]'
        }`}
      >
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto sc-scroll pb-1 shrink-0">
          {(
            [
              { id: 'paint', label: 'Paint & Finish' },
              { id: 'wheels', label: 'Wheels' },
              { id: 'spoiler', label: 'Spoilers' },
              { id: 'aero', label: 'Aero & Stripes' },
              { id: 'underglow', label: 'Underglow' },
            ] as { id: CustomTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setTab(t.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === t.id
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Options Content */}
        <div className={`${compactLand ? 'min-h-[84px] gap-2' : 'min-h-[112px] gap-3'} flex flex-col`}>
          {tab === 'paint' && (
            <>
              <div>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">
                  Body Color (Free & Premium)
                </div>
                <div className="flex items-center gap-2 overflow-x-auto sc-scroll pb-1">
                  {PAINT_COLORS.map((c) => {
                    const active = draftCustom.bodyColor === c.id;
                    const unlocked = isUnlocked('paintColor', c.id, c.price);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          audioEngine.playClick();
                          onPreviewDraft({ ...draftCustom, bodyColor: c.id });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                          active
                            ? 'bg-slate-800 border-amber-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: c.swatch }}
                        />
                        <span>{c.label}</span>
                        <span className="font-mono-tabular text-[11px] text-amber-300">
                          {unlocked ? 'Free' : `${c.price}c`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">Paint Finish</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {PAINT_FINISHES.map((f) => {
                    const active = draftCustom.finish === f.id;
                    const unlocked = isUnlocked('finish', f.id, f.price);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          audioEngine.playClick();
                          onPreviewDraft({ ...draftCustom, finish: f.id as PaintFinish });
                        }}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                          active
                            ? 'bg-slate-800 border-amber-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className="font-mono-tabular text-[11px] text-amber-300">
                          {unlocked ? 'Owned' : `${f.price}c`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'wheels' && (
            <>
              <div>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">Rim Design</div>
                <div className="flex items-center gap-2 overflow-x-auto sc-scroll pb-1">
                  {WHEEL_DESIGNS.map((w) => {
                    const active = draftCustom.wheelDesign === w.id;
                    const unlocked = isUnlocked('wheelDesign', w.id, w.price);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          audioEngine.playClick();
                          onPreviewDraft({ ...draftCustom, wheelDesign: w.id as WheelDesign });
                        }}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shrink-0 cursor-pointer ${
                          active
                            ? 'bg-slate-800 border-amber-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <span>{w.label}</span>
                        <span className="font-mono-tabular text-[11px] text-amber-300">
                          {unlocked ? 'Owned' : `${w.price}c`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">Wheel Color</div>
                <div className="flex items-center gap-2 overflow-x-auto sc-scroll pb-1">
                  {WHEEL_COLORS.map((wc) => {
                    const active = draftCustom.wheelColor === wc.id;
                    const unlocked = isUnlocked('wheelColor', wc.id, wc.price);
                    return (
                      <button
                        key={wc.id}
                        type="button"
                        onClick={() => {
                          audioEngine.playClick();
                          onPreviewDraft({ ...draftCustom, wheelColor: wc.id });
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 cursor-pointer ${
                          active
                            ? 'bg-slate-800 border-amber-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: wc.swatch }}
                        />
                        <span>{wc.label}</span>
                        <span className="font-mono-tabular text-[11px] text-amber-300">
                          {unlocked ? 'Free' : `${wc.price}c`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'spoiler' && (
            <div>
              <div className="text-xs text-slate-400 mb-2 font-medium">Rear Wing & Spoiler</div>
              <div className="flex items-center gap-2 flex-wrap">
                {SPOILER_OPTIONS.map((sp) => {
                  const active = draftCustom.spoiler === sp.id;
                  const unlocked = isUnlocked('spoiler', sp.id, sp.price);
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        audioEngine.playClick();
                        onPreviewDraft({ ...draftCustom, spoiler: sp.id as SpoilerStyle });
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer ${
                        active
                          ? 'bg-slate-800 border-amber-400 text-white'
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span>{sp.label}</span>
                      <span className="font-mono-tabular text-xs text-amber-300">
                        {unlocked ? 'Owned' : `${sp.price}c`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'aero' && (
            <div>
              <div className="text-xs text-slate-400 mb-2 font-medium">
                Body Accessories & Racing Stripes
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCESSORY_OPTIONS.map((acc) => {
                  const active = draftCustom.accessory === acc.id;
                  const unlocked = isUnlocked('accessory', acc.id, acc.price);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        audioEngine.playClick();
                        onPreviewDraft({ ...draftCustom, accessory: acc.id as AccessoryStyle });
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer ${
                        active
                          ? 'bg-slate-800 border-amber-400 text-white'
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span>{acc.label}</span>
                      <span className="font-mono-tabular text-xs text-amber-300">
                        {unlocked ? 'Owned' : `${acc.price}c`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'underglow' && (
            <div>
              <div className="text-xs text-slate-400 mb-2 font-medium">Neon Underglow Kit</div>
              <div className="flex items-center gap-2 flex-wrap">
                {UNDERGLOW_OPTIONS.map((glow) => {
                  const active = draftCustom.underglowColor === glow.id;
                  const unlocked = isUnlocked('underglow', glow.id, glow.price);
                  return (
                    <button
                      key={glow.id}
                      type="button"
                      onClick={() => {
                        audioEngine.playClick();
                        onPreviewDraft({ ...draftCustom, underglowColor: glow.id });
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer ${
                        active
                          ? 'bg-slate-800 border-amber-400 text-white'
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/30"
                        style={{ backgroundColor: glow.swatch }}
                      />
                      <span>{glow.label}</span>
                      <span className="font-mono-tabular text-xs text-amber-300">
                        {unlocked ? 'Free' : `${glow.price}c`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar: RESET & APPLY */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              onPreviewDraft(getDefaultCustomization(car.id));
              onReset();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs sm:text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-3">
            {totalCost > 0 && (
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono-tabular font-bold text-amber-300">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{totalCost}</span>
              </div>
            )}

            <button
              type="button"
              disabled={!canAfford || (!hasChanges && totalCost === 0)}
              onClick={() =>
                onApply(
                  draftCustom,
                  totalCost,
                  pendingItems.map((p) => p.key)
                )
              }
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-sm tracking-wide transition-colors cursor-pointer ${
                !canAfford
                  ? 'bg-red-950/60 border border-red-400/30 text-red-300 cursor-not-allowed'
                  : hasChanges || totalCost > 0
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                    : 'bg-slate-800 text-slate-400 cursor-default'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {!canAfford
                  ? 'INSUFFICIENT COINS'
                  : totalCost > 0
                    ? `BUY & APPLY (${totalCost})`
                    : 'APPLY'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
