export type GameState =
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'STORE'
  | 'GARAGE'
  | 'CUSTOMIZATION'
  | 'SETTINGS';

export type LevelId = 'TRAFFIC' | 'OFFROAD' | 'OBSTACLES';

export interface LevelSpec {
  id: LevelId;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  accentHex: string;
}

export const LEVEL_CATALOG: LevelSpec[] = [
  {
    id: 'TRAFFIC',
    code: 'LEVEL 01',
    title: 'TRAFFIC LEVEL',
    subtitle: 'Endless Three-Lane Highway',
    description:
      'Weave through dynamic highway traffic at full speed across day, night, and changing weather while collecting golden coins.',
    accentHex: '#38bdf8',
  },
  {
    id: 'OFFROAD',
    code: 'LEVEL 02',
    title: 'OFF-ROADING',
    subtitle: 'Mountain Dirt Trail & Mud',
    description:
      'Tackle uneven dirt terrain, forested hills, rocks, and fallen logs with active suspension and off-road mud spray.',
    accentHex: '#f59e0b',
  },
  {
    id: 'OBSTACLES',
    code: 'LEVEL 03',
    title: 'ROAD OBSTACLES',
    subtitle: 'High-Speed Barrier Gauntlet',
    description:
      'Navigate escalating highway patterns of traffic cones, construction barriers, wooden roadblocks, and tire stacks.',
    accentHex: '#f43f5e',
  },
];

export type WeatherCondition = 'SUNNY' | 'RAINY' | 'FOGGY' | 'SNOWY';
export type WeatherMode = WeatherCondition | 'RANDOM';
export type TimeOfDay = 'DAY' | 'NIGHT';
export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export type PaintFinish = 'glossy' | 'metallic' | 'matte';
export type WheelDesign = 'sport5' | 'turbine' | 'mesh' | 'cyberblade' | 'dish';
export type SpoilerStyle = 'none' | 'lip' | 'gt_wing' | 'swan_neck';
export type AccessoryStyle =
  | 'none'
  | 'roof_scoop'
  | 'carbon_splitter'
  | 'racing_stripes'
  | 'full_aero';

export type CarChassisArchetype =
  | 'coupe'
  | 'track'
  | 'midengine'
  | 'hypercar'
  | 'muscle_gt'
  | 'prototype'
  | 'rally_4x4'
  | 'baja_truck';

export interface CarSpec {
  id: string;
  name: string;
  classLabel: string;
  description: string;
  price: number;
  archetype: CarChassisArchetype;
  defaultColor: string;
  accentColor: string;
  topSpeedKmh: number;
  acceleration: number; // 1..100 rating
  handling: number; // 1..100 rating
  nitroPower: number; // 1..100 rating
  length: number;
  width: number;
}

export interface CarCustomization {
  bodyColor: string;
  finish: PaintFinish;
  wheelDesign: WheelDesign;
  wheelColor: string;
  underglowColor: string; // 'none' or hex
  spoiler: SpoilerStyle;
  accessory: AccessoryStyle;
}

export type ControlButtonSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type HudLayoutPosition = 'EDGE' | 'BALANCED' | 'COMFORT';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  graphics: GraphicsQuality;
  sensitivity: number; // 0.5 to 2.0
  timeOfDay: TimeOfDay;
  weatherMode: WeatherMode;
  controlSize: ControlButtonSize;
  controlPosition: HudLayoutPosition;
  controlOpacity: number; // 0.45 to 1.0
}

export interface LevelProgress {
  bestScore: number;
  bestDistance: number;
}

export interface SaveData {
  coins: number;
  bestScore: number;
  bestDistance: number;
  levelProgress: Record<LevelId, LevelProgress>;
  ownedCarIds: string[];
  selectedCarId: string;
  customizationsByCar: Record<string, CarCustomization>;
  unlockedCustomKeys: string[];
  settings: GameSettings;
}

export interface HudSnapshot {
  levelId: LevelId;
  speedKmh: number;
  topSpeedKmh: number;
  distanceMeters: number;
  score: number;
  coinsThisRun: number;
  totalCoins: number;
  nitroEnergy: number; // 0..100
  nitroActive: boolean;
  nitroCooldown: boolean;
  activeWeather: WeatherCondition;
  isNight: boolean;
  nearMissCount: number;
}

export interface CustomOptionItem<T extends string> {
  id: T;
  label: string;
  price: number; // 0 = FREE
  swatch?: string;
}

export const LANE_CENTERS = [-3.6, 0, 3.6] as const;
export const ROAD_WIDTH = 11.6;

export const CAR_CATALOG: CarSpec[] = [
  {
    id: 'apex_gt',
    name: 'Apex GT',
    classLabel: 'Sport Coupe',
    description: 'Balanced twin-turbo street coupe with crisp steering response.',
    price: 0,
    archetype: 'coupe',
    defaultColor: '#ef4444',
    accentColor: '#1e293b',
    topSpeedKmh: 255,
    acceleration: 66,
    handling: 74,
    nitroPower: 68,
    length: 4.35,
    width: 1.92,
  },
  {
    id: 'viper_rs',
    name: 'Viper RS',
    classLabel: 'Track Edition',
    description: 'Stiffened chassis and wide rear fenders tuned for rapid lane cuts.',
    price: 350,
    archetype: 'track',
    defaultColor: '#f59e0b',
    accentColor: '#0f172a',
    topSpeedKmh: 278,
    acceleration: 74,
    handling: 82,
    nitroPower: 75,
    length: 4.42,
    width: 1.98,
  },
  {
    id: 'lumina_v8',
    name: 'Lumina V8',
    classLabel: 'Mid-Engine Supercar',
    description: 'Low-slung Italian-inspired wedge with blistering mid-range pull.',
    price: 750,
    archetype: 'midengine',
    defaultColor: '#06b6d4',
    accentColor: '#0f172a',
    topSpeedKmh: 302,
    acceleration: 82,
    handling: 86,
    nitroPower: 80,
    length: 4.48,
    width: 2.02,
  },
  {
    id: 'titan_track',
    name: 'Titan Track-R',
    classLabel: 'Performance GT',
    description: 'Supercharged V8 grand tourer built for unstoppable highway momentum.',
    price: 1250,
    archetype: 'muscle_gt',
    defaultColor: '#10b981',
    accentColor: '#111827',
    topSpeedKmh: 318,
    acceleration: 86,
    handling: 80,
    nitroPower: 88,
    length: 4.55,
    width: 2.04,
  },
  {
    id: 'hyperion_s',
    name: 'Hyperion S',
    classLabel: 'Aero Hypercar',
    description: 'Active carbon aerodynamics with razor-sharp cornering stability.',
    price: 2000,
    archetype: 'hypercar',
    defaultColor: '#e2e8f0',
    accentColor: '#0284c7',
    topSpeedKmh: 342,
    acceleration: 92,
    handling: 93,
    nitroPower: 91,
    length: 4.52,
    width: 2.04,
  },
  {
    id: 'zenith_proto',
    name: 'Zenith Proto',
    classLabel: 'Le Mans Prototype',
    description: 'Endurance-spec carbon prototype engineered for extreme velocity.',
    price: 3200,
    archetype: 'prototype',
    defaultColor: '#3b82f6',
    accentColor: '#f59e0b',
    topSpeedKmh: 368,
    acceleration: 98,
    handling: 96,
    nitroPower: 98,
    length: 4.64,
    width: 2.05,
  },
  {
    id: 'nomad_rally',
    name: 'Nomad Rally 4x4',
    classLabel: 'All-Terrain Rally',
    description: 'Raised AWD rally machine tuned for muddy trails, gravel grip, and bumps.',
    price: 200,
    archetype: 'rally_4x4',
    defaultColor: '#2563eb',
    accentColor: '#facc15',
    topSpeedKmh: 270,
    acceleration: 80,
    handling: 90,
    nitroPower: 78,
    length: 4.38,
    width: 2.02,
  },
  {
    id: 'terra_raptor',
    name: 'Terra Raptor XT',
    classLabel: 'Off-Road Trophy Truck',
    description: 'Long-travel suspension truck built to conquer rough hills and obstacles.',
    price: 850,
    archetype: 'baja_truck',
    defaultColor: '#ea580c',
    accentColor: '#111827',
    topSpeedKmh: 292,
    acceleration: 85,
    handling: 88,
    nitroPower: 86,
    length: 4.66,
    width: 2.12,
  },
];

export const PAINT_COLORS: CustomOptionItem<string>[] = [
  { id: '#ef4444', label: 'Crimson Red', price: 0, swatch: '#ef4444' },
  { id: '#f59e0b', label: 'Solar Amber', price: 0, swatch: '#f59e0b' },
  { id: '#2563eb', label: 'Cobalt Blue', price: 0, swatch: '#2563eb' },
  { id: '#f8fafc', label: 'Arctic White', price: 0, swatch: '#f8fafc' },
  { id: '#1e293b', label: 'Graphite', price: 0, swatch: '#1e293b' },
  { id: '#06b6d4', label: 'Hyper Cyan', price: 120, swatch: '#06b6d4' },
  { id: '#10b981', label: 'Emerald GT', price: 150, swatch: '#10b981' },
  { id: '#a855f7', label: 'Ultraviolet', price: 200, swatch: '#a855f7' },
  { id: '#ec4899', label: 'Sunset Rose', price: 220, swatch: '#ec4899' },
  { id: '#eab308', label: 'Championship Gold', price: 300, swatch: '#eab308' },
];

export const PAINT_FINISHES: CustomOptionItem<PaintFinish>[] = [
  { id: 'glossy', label: 'Glossy', price: 0 },
  { id: 'matte', label: 'Stealth Matte', price: 140 },
  { id: 'metallic', label: 'Liquid Metallic', price: 220 },
];

export const WHEEL_DESIGNS: CustomOptionItem<WheelDesign>[] = [
  { id: 'sport5', label: '5-Spoke Sport', price: 0 },
  { id: 'turbine', label: 'Aero Turbine', price: 120 },
  { id: 'mesh', label: 'GT Forged Mesh', price: 180 },
  { id: 'cyberblade', label: 'Split Blade', price: 240 },
  { id: 'dish', label: 'Deep Dish Chrome', price: 300 },
];

export const WHEEL_COLORS: CustomOptionItem<string>[] = [
  { id: '#cbd5e1', label: 'Alloy Silver', price: 0, swatch: '#cbd5e1' },
  { id: '#18181b', label: 'Satin Black', price: 0, swatch: '#18181b' },
  { id: '#d97706', label: 'Bronze', price: 100, swatch: '#d97706' },
  { id: '#facc15', label: 'Racing Gold', price: 150, swatch: '#facc15' },
  { id: '#ef4444', label: 'Track Red', price: 150, swatch: '#ef4444' },
  { id: '#38bdf8', label: 'Electric Blue', price: 180, swatch: '#38bdf8' },
];

export const UNDERGLOW_OPTIONS: CustomOptionItem<string>[] = [
  { id: 'none', label: 'Off', price: 0, swatch: '#334155' },
  { id: '#06b6d4', label: 'Ice Cyan', price: 180, swatch: '#06b6d4' },
  { id: '#3b82f6', label: 'Nitro Blue', price: 180, swatch: '#3b82f6' },
  { id: '#ef4444', label: 'Crimson Pulse', price: 200, swatch: '#ef4444' },
  { id: '#10b981', label: 'Toxic Emerald', price: 200, swatch: '#10b981' },
  { id: '#f59e0b', label: 'Amber Gold', price: 240, swatch: '#f59e0b' },
];

export const SPOILER_OPTIONS: CustomOptionItem<SpoilerStyle>[] = [
  { id: 'none', label: 'Stock Clean', price: 0 },
  { id: 'lip', label: 'Ducktail Lip', price: 100 },
  { id: 'gt_wing', label: 'GT Carbon Wing', price: 220 },
  { id: 'swan_neck', label: 'Swan-Neck Pro', price: 340 },
];

export const ACCESSORY_OPTIONS: CustomOptionItem<AccessoryStyle>[] = [
  { id: 'none', label: 'Factory Trim', price: 0 },
  { id: 'racing_stripes', label: 'Twin Racing Stripes', price: 120 },
  { id: 'carbon_splitter', label: 'Front Carbon Splitter', price: 160 },
  { id: 'roof_scoop', label: 'Roof Air Scoop', price: 200 },
  { id: 'full_aero', label: 'Full Track Aero Kit', price: 380 },
];

export function getDefaultCustomization(carId: string): CarCustomization {
  const car = CAR_CATALOG.find((c) => c.id === carId) ?? CAR_CATALOG[0];
  return {
    bodyColor: car.defaultColor,
    finish: 'glossy',
    wheelDesign: 'sport5',
    wheelColor: '#cbd5e1',
    underglowColor: 'none',
    spoiler: car.archetype === 'prototype' || car.archetype === 'hypercar' ? 'gt_wing' : 'none',
    accessory: 'none',
  };
}

export function getCustomItemKey(category: string, id: string): string {
  return `${category}:${id}`;
}

export const DEFAULT_CONTROL_SETTINGS = {
  controlSize: 'MEDIUM' as ControlButtonSize,
  controlPosition: 'BALANCED' as HudLayoutPosition,
  controlOpacity: 0.88,
};

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  graphics: 'HIGH',
  sensitivity: 1.0,
  timeOfDay: 'DAY',
  weatherMode: 'SUNNY',
  ...DEFAULT_CONTROL_SETTINGS,
};

const STORAGE_KEY = 'star_car_3d_save_v1';

export function createInitialSaveData(): SaveData {
  const customizationsByCar: Record<string, CarCustomization> = {};
  for (const car of CAR_CATALOG) {
    customizationsByCar[car.id] = getDefaultCustomization(car.id);
  }
  return {
    coins: 250,
    bestScore: 0,
    bestDistance: 0,
    levelProgress: {
      TRAFFIC: { bestScore: 0, bestDistance: 0 },
      OFFROAD: { bestScore: 0, bestDistance: 0 },
      OBSTACLES: { bestScore: 0, bestDistance: 0 },
    },
    ownedCarIds: ['apex_gt'],
    selectedCarId: 'apex_gt',
    customizationsByCar,
    unlockedCustomKeys: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadSaveData(): SaveData {
  const base = createInitialSaveData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const owned = Array.isArray(parsed.ownedCarIds) && parsed.ownedCarIds.length > 0
      ? parsed.ownedCarIds.filter((id) => CAR_CATALOG.some((c) => c.id === id))
      : base.ownedCarIds;
    if (!owned.includes('apex_gt')) owned.unshift('apex_gt');

    const selected =
      parsed.selectedCarId && owned.includes(parsed.selectedCarId)
        ? parsed.selectedCarId
        : owned[0];

    const customizationsByCar = { ...base.customizationsByCar };
    if (parsed.customizationsByCar && typeof parsed.customizationsByCar === 'object') {
      for (const car of CAR_CATALOG) {
        if (parsed.customizationsByCar[car.id]) {
          customizationsByCar[car.id] = {
            ...customizationsByCar[car.id],
            ...parsed.customizationsByCar[car.id],
          };
        }
      }
    }

    const mergedSettings: GameSettings = {
      ...base.settings,
      ...(parsed.settings ?? {}),
    };
    if (!['SMALL', 'MEDIUM', 'LARGE'].includes(mergedSettings.controlSize)) {
      mergedSettings.controlSize = base.settings.controlSize;
    }
    if (!['EDGE', 'BALANCED', 'COMFORT'].includes(mergedSettings.controlPosition)) {
      mergedSettings.controlPosition = base.settings.controlPosition;
    }
    if (typeof mergedSettings.controlOpacity !== 'number' || Number.isNaN(mergedSettings.controlOpacity)) {
      mergedSettings.controlOpacity = base.settings.controlOpacity;
    } else {
      mergedSettings.controlOpacity = Math.min(1, Math.max(0.45, mergedSettings.controlOpacity));
    }

    const levelProgress: Record<LevelId, LevelProgress> = {
      TRAFFIC: {
        bestScore:
          typeof parsed.levelProgress?.TRAFFIC?.bestScore === 'number'
            ? Math.max(0, Math.floor(parsed.levelProgress.TRAFFIC.bestScore))
            : typeof parsed.bestScore === 'number'
              ? Math.max(0, Math.floor(parsed.bestScore))
              : 0,
        bestDistance:
          typeof parsed.levelProgress?.TRAFFIC?.bestDistance === 'number'
            ? Math.max(0, Math.floor(parsed.levelProgress.TRAFFIC.bestDistance))
            : typeof parsed.bestDistance === 'number'
              ? Math.max(0, Math.floor(parsed.bestDistance))
              : 0,
      },
      OFFROAD: {
        bestScore:
          typeof parsed.levelProgress?.OFFROAD?.bestScore === 'number'
            ? Math.max(0, Math.floor(parsed.levelProgress.OFFROAD.bestScore))
            : 0,
        bestDistance:
          typeof parsed.levelProgress?.OFFROAD?.bestDistance === 'number'
            ? Math.max(0, Math.floor(parsed.levelProgress.OFFROAD.bestDistance))
            : 0,
      },
      OBSTACLES: {
        bestScore:
          typeof parsed.levelProgress?.OBSTACLES?.bestScore === 'number'
            ? Math.max(0, Math.floor(parsed.levelProgress.OBSTACLES.bestScore))
            : 0,
        bestDistance:
          typeof parsed.levelProgress?.OBSTACLES?.bestDistance === 'number'
            ? Math.max(0, Math.floor(parsed.levelProgress.OBSTACLES.bestDistance))
            : 0,
      },
    };

    return {
      coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? Math.floor(parsed.coins) : base.coins,
      bestScore: typeof parsed.bestScore === 'number' ? Math.max(0, Math.floor(parsed.bestScore)) : 0,
      bestDistance: typeof parsed.bestDistance === 'number' ? Math.max(0, Math.floor(parsed.bestDistance)) : 0,
      levelProgress,
      ownedCarIds: owned,
      selectedCarId: selected,
      customizationsByCar,
      unlockedCustomKeys: Array.isArray(parsed.unlockedCustomKeys) ? parsed.unlockedCustomKeys : [],
      settings: mergedSettings,
    };
  } catch {
    return base;
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
