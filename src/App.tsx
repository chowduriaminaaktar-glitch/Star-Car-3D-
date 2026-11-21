import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAR_CATALOG,
  CarCustomization,
  CarSpec,
  GameSettings,
  GameState,
  HudSnapshot,
  LevelId,
  SaveData,
  WeatherMode,
  getDefaultCustomization,
  loadSaveData,
  persistSaveData,
} from './game/types';
import { StarCarEngine } from './game/engine';
import { audioEngine } from './game/audio';
import {
  toggleAppFullscreen,
  tryLockLandscape,
  useViewportOrientation,
} from './game/viewport';
import {
  notifyAndroidGameReady,
  notifyAndroidGameplayMode,
  requestAndroidExit,
} from './game/androidBridge';
import { MainMenu } from './components/MainMenu';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { GameHud } from './components/GameHud';
import { GarageStoreModal } from './components/GarageStoreModal';
import { CustomizationPanel } from './components/CustomizationPanel';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal, PauseOverlay } from './components/Overlays';

const INITIAL_HUD: HudSnapshot = {
  levelId: 'TRAFFIC',
  speedKmh: 0,
  topSpeedKmh: CAR_CATALOG[0].topSpeedKmh,
  distanceMeters: 0,
  score: 0,
  coinsThisRun: 0,
  totalCoins: 0,
  nitroEnergy: 100,
  nitroActive: false,
  nitroCooldown: false,
  activeWeather: 'SUNNY',
  isNight: false,
  nearMissCount: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<StarCarEngine | null>(null);
  const viewport = useViewportOrientation();

  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const saveRef = useRef<SaveData>(saveData);
  saveRef.current = saveData;

  const [gameState, setGameState] = useState<GameState>('MAIN_MENU');
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const [selectedLevel, setSelectedLevel] = useState<LevelId>('TRAFFIC');
  const [settingsReturnState, setSettingsReturnState] = useState<GameState>('MAIN_MENU');
  const [previewCarId, setPreviewCarId] = useState<string>(() => saveData.selectedCarId);
  const [draftCustom, setDraftCustom] = useState<CarCustomization>(
    () => saveData.customizationsByCar[saveData.selectedCarId] ?? getDefaultCustomization(saveData.selectedCarId)
  );
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    ...INITIAL_HUD,
    totalCoins: saveData.coins,
  }));
  const [finalHud, setFinalHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [isNewBest, setIsNewBest] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  // Mount Three.js engine once
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const initialSave = saveRef.current;
    const initialSpec =
      CAR_CATALOG.find((c) => c.id === initialSave.selectedCarId) ?? CAR_CATALOG[0];
    const initialCustom =
      initialSave.customizationsByCar[initialSpec.id] ?? getDefaultCustomization(initialSpec.id);

    audioEngine.setSettings(initialSave.settings.soundEnabled, initialSave.settings.musicEnabled);

    const engine = new StarCarEngine(
      mountEl,
      initialSpec,
      initialCustom,
      initialSave.settings,
      initialSave.coins,
      {
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
        },
        onCoinCollected: (amount) => {
          updateSave((prev) => ({
            ...prev,
            coins: prev.coins + amount,
          }));
        },
        onGameOver: (endHud) => {
          setFinalHud(endHud);
          setHud(endHud);
          const lvl = endHud.levelId ?? 'TRAFFIC';
          const prevLevelBest = saveRef.current.levelProgress[lvl]?.bestScore ?? 0;
          setIsNewBest(endHud.score > prevLevelBest);
          updateSave((prev) => {
            const existingLvl = prev.levelProgress[lvl] ?? { bestScore: 0, bestDistance: 0 };
            return {
              ...prev,
              bestScore: Math.max(prev.bestScore, endHud.score),
              bestDistance: Math.max(prev.bestDistance, endHud.distanceMeters),
              levelProgress: {
                ...prev.levelProgress,
                [lvl]: {
                  bestScore: Math.max(existingLvl.bestScore, endHud.score),
                  bestDistance: Math.max(existingLvl.bestDistance, endHud.distanceMeters),
                },
              },
            };
          });
          setGameState('GAME_OVER');
        },
        onPauseRequest: () => {
          setGameState((curr) => {
            if (curr === 'PLAYING') return 'PAUSED';
            if (curr === 'PAUSED') return 'PLAYING';
            return curr;
          });
        },
        onContextLost: (lost) => {
          setContextLost(lost);
        },
      }
    );

    engineRef.current = engine;
    notifyAndroidGameReady();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [updateSave]);

  // Sync game state transitions to engine & Android orientation preference
  useEffect(() => {
    engineRef.current?.setGameState(gameState);
    notifyAndroidGameplayMode(gameState === 'PLAYING');
  }, [gameState]);

  // Android back button & background pause events
  useEffect(() => {
    const onAndroidBack = () => {
      const curr = gameStateRef.current;
      if (curr === 'PLAYING') {
        setGameState('PAUSED');
      } else if (curr === 'PAUSED') {
        setGameState('PLAYING');
      } else if (curr === 'SETTINGS') {
        setGameState(settingsReturnState);
      } else if (
        curr === 'LEVEL_SELECT' ||
        curr === 'STORE' ||
        curr === 'GARAGE' ||
        curr === 'CUSTOMIZATION' ||
        curr === 'GAME_OVER'
      ) {
        setGameState('MAIN_MENU');
      } else {
        requestAndroidExit();
      }
    };

    const onAndroidPause = () => {
      if (gameStateRef.current === 'PLAYING') {
        setGameState('PAUSED');
      }
      audioEngine.updateDriving(false, 0, false, 0, false);
    };

    window.addEventListener('starcar:android-back', onAndroidBack);
    window.addEventListener('starcar:app-pause', onAndroidPause);
    return () => {
      window.removeEventListener('starcar:android-back', onAndroidBack);
      window.removeEventListener('starcar:app-pause', onAndroidPause);
    };
  }, [settingsReturnState]);

  // Sync settings & coins to engine and audio
  useEffect(() => {
    audioEngine.setSettings(saveData.settings.soundEnabled, saveData.settings.musicEnabled);
    engineRef.current?.setSettings(saveData.settings);
    engineRef.current?.setTotalCoins(saveData.coins);
  }, [saveData.settings, saveData.coins]);

  // Sync active previewed/selected car and customization to engine
  useEffect(() => {
    const activeCarId =
      gameState === 'STORE' || gameState === 'GARAGE'
        ? previewCarId
        : saveData.selectedCarId;
    const spec = CAR_CATALOG.find((c) => c.id === activeCarId) ?? CAR_CATALOG[0];
    const custom =
      gameState === 'CUSTOMIZATION'
        ? draftCustom
        : saveData.customizationsByCar[spec.id] ?? getDefaultCustomization(spec.id);

    engineRef.current?.setCarAndCustomization(spec, custom);
  }, [gameState, previewCarId, saveData.selectedCarId, saveData.customizationsByCar, draftCustom]);

  const selectedCarSpec =
    CAR_CATALOG.find((c) => c.id === saveData.selectedCarId) ?? CAR_CATALOG[0];

  const handleStartGame = () => {
    audioEngine.unlock();
    setGameState('LEVEL_SELECT');
  };

  const handlePlayLevel = (level: LevelId) => {
    audioEngine.unlock();
    setSelectedLevel(level);
    engineRef.current?.setLevel(level);
    void tryLockLandscape();
    setGameState('PLAYING');
  };

  const handleToggleFullscreen = (preferLandscape: boolean) => {
    void toggleAppFullscreen(preferLandscape);
  };

  const handleOpenStore = () => {
    setPreviewCarId(saveData.selectedCarId);
    setGameState('STORE');
  };

  const handleOpenGarage = () => {
    setPreviewCarId(saveData.selectedCarId);
    setGameState('GARAGE');
  };

  const handleOpenCustomize = (carIdOverride?: string) => {
    const targetId = carIdOverride ?? saveData.selectedCarId;
    const saved = saveData.customizationsByCar[targetId] ?? getDefaultCustomization(targetId);
    setDraftCustom({ ...saved });
    setGameState('CUSTOMIZATION');
  };

  const handleOpenSettings = (returnTo: GameState) => {
    setSettingsReturnState(returnTo);
    setGameState('SETTINGS');
  };

  const handleBuyCar = (car: CarSpec) => {
    if (saveData.ownedCarIds.includes(car.id)) return;
    if (saveData.coins < car.price) return;
    audioEngine.playPurchase();
    updateSave((prev) => {
      if (prev.ownedCarIds.includes(car.id) || prev.coins < car.price) return prev;
      return {
        ...prev,
        coins: prev.coins - car.price,
        ownedCarIds: [...prev.ownedCarIds, car.id],
        selectedCarId: car.id,
      };
    });
    setPreviewCarId(car.id);
  };

  const handleSelectCar = (carId: string) => {
    if (!saveData.ownedCarIds.includes(carId)) return;
    updateSave((prev) => ({
      ...prev,
      selectedCarId: carId,
    }));
  };

  const handleApplyCustomization = (
    nextCustom: CarCustomization,
    totalCost: number,
    newlyUnlocked: string[]
  ) => {
    if (saveData.coins < totalCost) return;
    if (totalCost > 0) {
      audioEngine.playPurchase();
    } else {
      audioEngine.playClick();
    }

    const carId = saveData.selectedCarId;
    updateSave((prev) => {
      const mergedKeys = Array.from(new Set([...prev.unlockedCustomKeys, ...newlyUnlocked]));
      return {
        ...prev,
        coins: Math.max(0, prev.coins - totalCost),
        unlockedCustomKeys: mergedKeys,
        customizationsByCar: {
          ...prev.customizationsByCar,
          [carId]: { ...nextCustom },
        },
      };
    });
    setDraftCustom({ ...nextCustom });
  };

  const handleResetCustomization = () => {
    const carId = saveData.selectedCarId;
    const def = getDefaultCustomization(carId);
    setDraftCustom(def);
    updateSave((prev) => ({
      ...prev,
      customizationsByCar: {
        ...prev.customizationsByCar,
        [carId]: def,
      },
    }));
  };

  const handleUpdateSettings = (next: GameSettings) => {
    updateSave((prev) => ({
      ...prev,
      settings: next,
    }));
  };

  const handleRestart = () => {
    audioEngine.unlock();
    engineRef.current?.setLevel(selectedLevel);
    engineRef.current?.restartRun();
    setGameState('PLAYING');
  };

  const handleChangeLevel = () => {
    setGameState('LEVEL_SELECT');
  };

  const handleHome = () => {
    engineRef.current?.setLevel('TRAFFIC');
    setGameState('MAIN_MENU');
  };

  const activeCustomCarId = saveData.selectedCarId;
  const activeCustomSpec =
    CAR_CATALOG.find((c) => c.id === activeCustomCarId) ?? CAR_CATALOG[0];

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-slate-950">
      {/* Full-Bleed Three.js Canvas Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0 w-full h-full" />

      {/* WebGL Context Lost Graceful Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-white">Graphics Context Paused</h2>
            <p className="text-sm text-slate-300 mt-2">
              The 3D graphics context was suspended by the browser. Reload or tap to restore.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Reload Game
            </button>
          </div>
        </div>
      )}

      {/* MAIN_MENU */}
      {gameState === 'MAIN_MENU' && (
        <MainMenu
          coins={saveData.coins}
          bestScore={saveData.bestScore}
          bestDistance={saveData.bestDistance}
          selectedCar={selectedCarSpec}
          settings={saveData.settings}
          viewport={viewport}
          onStartGame={handleStartGame}
          onOpenStore={handleOpenStore}
          onOpenGarage={handleOpenGarage}
          onOpenCustomize={() => handleOpenCustomize()}
          onOpenSettings={() => handleOpenSettings('MAIN_MENU')}
          onToggleTimeOfDay={() =>
            handleUpdateSettings({
              ...saveData.settings,
              timeOfDay: saveData.settings.timeOfDay === 'DAY' ? 'NIGHT' : 'DAY',
            })
          }
          onSelectWeather={(mode: WeatherMode) =>
            handleUpdateSettings({
              ...saveData.settings,
              weatherMode: mode,
            })
          }
          onToggleFullscreen={() => handleToggleFullscreen(false)}
        />
      )}

      {/* LEVEL_SELECT */}
      {gameState === 'LEVEL_SELECT' && (
        <LevelSelectScreen
          coins={saveData.coins}
          selectedCar={selectedCarSpec}
          levelProgress={saveData.levelProgress}
          viewport={viewport}
          onSelectLevel={handlePlayLevel}
          onHoverLevel={(lvl) => {
            setSelectedLevel(lvl);
            engineRef.current?.setLevel(lvl);
          }}
          onBack={handleHome}
        />
      )}

      {/* PLAYING HUD */}
      {gameState === 'PLAYING' && (
        <GameHud
          hud={hud}
          settings={saveData.settings}
          viewport={viewport}
          onPause={() => {
            audioEngine.playClick();
            engineRef.current?.clearHeldInputs();
            setGameState('PAUSED');
          }}
          onToggleFullscreen={() => {
            audioEngine.playClick();
            handleToggleFullscreen(true);
          }}
          onSteerLeft={() => engineRef.current?.steerLeft()}
          onSteerRight={() => engineRef.current?.steerRight()}
          onThrottleChange={(active) => engineRef.current?.setThrottle(active)}
          onBrakeChange={(active) => engineRef.current?.setBrake(active)}
          onNitroTap={() => engineRef.current?.triggerNitroTap()}
          onClearAllInputs={() => engineRef.current?.clearHeldInputs()}
        />
      )}

      {/* STORE & GARAGE */}
      {(gameState === 'STORE' || gameState === 'GARAGE') && (
        <GarageStoreModal
          mode={gameState}
          coins={saveData.coins}
          ownedCarIds={saveData.ownedCarIds}
          selectedCarId={saveData.selectedCarId}
          previewCarId={previewCarId}
          viewport={viewport}
          onPreviewCar={(id) => setPreviewCarId(id)}
          onBuyCar={handleBuyCar}
          onSelectCar={handleSelectCar}
          onOpenCustomize={() => {
            if (saveData.ownedCarIds.includes(previewCarId)) {
              handleSelectCar(previewCarId);
              handleOpenCustomize(previewCarId);
            }
          }}
          onSwitchMode={(nextMode) => {
            if (nextMode === 'GARAGE' && !saveData.ownedCarIds.includes(previewCarId)) {
              setPreviewCarId(saveData.selectedCarId);
            }
            setGameState(nextMode);
          }}
          onBack={handleHome}
        />
      )}

      {/* CUSTOMIZATION */}
      {gameState === 'CUSTOMIZATION' && (
        <CustomizationPanel
          car={activeCustomSpec}
          coins={saveData.coins}
          savedCustom={
            saveData.customizationsByCar[activeCustomCarId] ??
            getDefaultCustomization(activeCustomCarId)
          }
          draftCustom={draftCustom}
          unlockedKeys={saveData.unlockedCustomKeys}
          viewport={viewport}
          onPreviewDraft={(next) => setDraftCustom(next)}
          onApply={handleApplyCustomization}
          onReset={handleResetCustomization}
          onBack={() => setGameState('MAIN_MENU')}
        />
      )}

      {/* PAUSED */}
      {gameState === 'PAUSED' && (
        <PauseOverlay
          levelId={selectedLevel}
          onResume={() => setGameState('PLAYING')}
          onRestart={handleRestart}
          onChangeLevel={handleChangeLevel}
          onOpenSettings={() => handleOpenSettings('PAUSED')}
          onHome={handleHome}
        />
      )}

      {/* SETTINGS */}
      {gameState === 'SETTINGS' && (
        <SettingsModal
          settings={saveData.settings}
          onChange={handleUpdateSettings}
          onClose={() => setGameState(settingsReturnState)}
        />
      )}

      {/* GAME_OVER */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          levelId={selectedLevel}
          finalHud={finalHud}
          bestScore={saveData.levelProgress[finalHud.levelId ?? selectedLevel]?.bestScore ?? 0}
          isNewBest={isNewBest}
          onRestart={handleRestart}
          onChangeLevel={handleChangeLevel}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
