import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CAR_CATALOG,
  CarCustomization,
  CarSpec,
  GameSettings,
  GameState,
  HudSnapshot,
  LANE_CENTERS,
  LevelId,
  WeatherCondition,
} from './types';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import {
  buildOpponentCar,
  buildPlayerCar,
  BuiltCarHandle,
  BuiltOpponentHandle,
  OpponentType,
} from './carBuilder';
import {
  buildObstacleMesh,
  BuiltObstacleHandle,
  ObstacleKind,
} from './obstacleBuilder';
import { createWorldEnvironment, WorldEnvironmentHandle } from './worldBuilder';
import { audioEngine } from './audio';

interface CoinInstance {
  mesh: THREE.Group;
  active: boolean;
  collected: boolean;
  lane: number;
  z: number;
}

interface OpponentInstance {
  handle: BuiltOpponentHandle;
  active: boolean;
  lane: number;
  z: number;
  speedMs: number;
  nearMissed: boolean;
}

interface ObstacleInstance {
  handle: BuiltObstacleHandle;
  active: boolean;
  lane: number;
  z: number;
  nearMissed: boolean;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onCoinCollected: (amount: number) => void;
  onGameOver: (finalHud: HudSnapshot) => void;
  onPauseRequest: () => void;
  onContextLost: (lost: boolean) => void;
}

const OPPONENT_PALETTE = [
  '#e2e8f0',
  '#334155',
  '#1d4ed8',
  '#b91c1c',
  '#0f766e',
  '#ca8a04',
  '#475569',
  '#f8fafc',
];

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class StarCarEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private world: WorldEnvironmentHandle;
  private envRT: THREE.WebGLRenderTarget;

  private playerCar: BuiltCarHandle | null = null;
  private currentSpec: CarSpec = CAR_CATALOG[0];
  private currentCustom: CarCustomization;

  private coinPool: CoinInstance[] = [];
  private opponentPool: OpponentInstance[] = [];
  private obstaclePool: ObstacleInstance[] = [];
  private sparkPool: SparkParticle[] = [];
  private mudPool: SparkParticle[] = [];

  private gameState: GameState = 'MAIN_MENU';
  private currentLevel: LevelId = 'TRAFFIC';
  private settings: GameSettings;
  private totalCoins = 0;

  // Live Run Gameplay State
  private activeLane = 1; // 0 = left, 1 = center, 2 = right
  private laneQueue: (-1 | 1)[] = [];
  private laneAnimActive = false;
  private laneAnimStartX = 0;
  private laneAnimTargetX = 0;
  private laneAnimProgress = 0;
  private playerX = 0;
  private prevPlayerX = 0;
  private speedMs = 0;
  private distanceMeters = 0;
  private score = 0;
  private coinsThisRun = 0;
  private nearMissCount = 0;

  private nitroEnergy = 100;
  private nitroActive = false;
  private nitroCooldown = false;
  private nitroPressed = false;
  private nitroLatched = false;
  private throttlePressed = false;
  private brakePressed = false;

  private activeWeather: WeatherCondition = 'SUNNY';
  private randomWeatherTimer = 0;
  private nightFactor = 0; // smoothly transitions 0 (day) <-> 1 (night)

  private coinSpawnZ = -48;
  private opponentSpawnTimer = 0;
  private obstacleSpawnTimer = 0;
  private obstacleWaveCount = 0;
  private mudSpawnAccum = 0;
  private wheelSpinAngle = 0;
  private cameraShake = 0;

  // Showcase / Garage orbit state
  private showcaseAngle = 0.55;
  private showcaseDragging = false;
  private showcaseLastX = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchSwiped = false;

  // Loop & timing
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private hudEmitAccum = 0;
  private elapsedTotal = 0;

  // Bound handlers for clean removal
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer1 = 0;
  private resizeTimer2 = 0;
  private boundResize: () => void;
  private boundOrientationResize: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundBlur: () => void;
  private boundVisibilityChange: () => void;
  private boundContextLost: (e: Event) => void;
  private boundContextRestored: (e: Event) => void;

  constructor(
    container: HTMLElement,
    initialSpec: CarSpec,
    initialCustom: CarCustomization,
    initialSettings: GameSettings,
    initialCoins: number,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.currentSpec = initialSpec;
    this.currentCustom = { ...initialCustom };
    this.settings = { ...initialSettings };
    this.totalCoins = initialCoins;
    this.callbacks = callbacks;

    this.isSoftwareGl = detectSoftwareGl();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.graphics !== 'LOW';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyGraphicsPixelRatio();

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.2, 420);
    this.camera.position.set(3.8, 2.2, 5.6);

    // Studio PBR Reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.world = createWorldEnvironment(this.scene, this.textures, this.isSoftwareGl);

    this.initPools();
    this.rebuildPlayerCar(this.currentSpec, this.currentCustom);

    this.activeWeather =
      this.settings.weatherMode === 'RANDOM' ? 'SUNNY' : this.settings.weatherMode;
    this.nightFactor = this.settings.timeOfDay === 'NIGHT' ? 1 : 0;

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events once
    this.boundResize = this.handleResize.bind(this);
    this.boundOrientationResize = this.handleOrientationChange.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundBlur = this.clearHeldInputs.bind(this);
    this.boundVisibilityChange = () => {
      if (document.hidden) {
        this.clearHeldInputs();
      }
    };
    this.boundContextLost = (e: Event) => {
      e.preventDefault();
      this.clearHeldInputs();
      this.callbacks.onContextLost(true);
    };
    this.boundContextRestored = () => {
      this.callbacks.onContextLost(false);
    };

    window.addEventListener('resize', this.boundResize);
    window.addEventListener('orientationchange', this.boundOrientationResize);
    window.visualViewport?.addEventListener('resize', this.boundResize);
    screen.orientation?.addEventListener?.('change', this.boundOrientationResize);
    window.addEventListener('blur', this.boundBlur);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.boundResize);
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointercancel', this.boundPointerUp);
    dom.addEventListener('webglcontextlost', this.boundContextLost);
    dom.addEventListener('webglcontextrestored', this.boundContextRestored);

    this.clock.start();
    this.tick();
  }

  private applyGraphicsPixelRatio(): void {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      return;
    }
    const maxDpr = this.settings.graphics === 'LOW' ? 1.0 : this.settings.graphics === 'MEDIUM' ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.shadowMap.enabled = this.settings.graphics !== 'LOW';
  }

  private initPools(): void {
    // 1. Golden Star Coin Pool (28 pooled coins)
    const coinRimGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.12, 20);
    coinRimGeom.rotateX(Math.PI / 2);
    const coinEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x92400e,
      emissiveIntensity: 0.35,
    });
    const coinFaceGeom = new THREE.CircleGeometry(0.46, 20);
    const coinFaceMat = new THREE.MeshStandardMaterial({
      map: this.textures.coinFaceMap,
      metalness: 0.75,
      roughness: 0.22,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.28,
    });

    for (let i = 0; i < 28; i++) {
      const g = new THREE.Group();
      const rim = new THREE.Mesh(coinRimGeom, coinEdgeMat);
      const faceFront = new THREE.Mesh(coinFaceGeom, coinFaceMat);
      faceFront.position.z = 0.065;
      const faceBack = new THREE.Mesh(coinFaceGeom, coinFaceMat);
      faceBack.rotation.y = Math.PI;
      faceBack.position.z = -0.065;
      g.add(rim, faceFront, faceBack);
      g.visible = false;
      this.scene.add(g);
      this.coinPool.push({ mesh: g, active: false, collected: false, lane: 1, z: 0 });
    }

    // 2. Opponent Vehicle Pool (12 diverse vehicles)
    const types: OpponentType[] = ['sedan', 'suv', 'coupe', 'sport', 'truck'];
    for (let i = 0; i < 12; i++) {
      const type = types[i % types.length];
      const color = OPPONENT_PALETTE[i % OPPONENT_PALETTE.length];
      const handle = buildOpponentCar(type, color, this.textures);
      handle.root.visible = false;
      this.scene.add(handle.root);
      this.opponentPool.push({
        handle,
        active: false,
        lane: 0,
        z: -200,
        speedMs: 18,
        nearMissed: false,
      });
    }

    // 3. Coin & Impact Spark Particles (36 pooled)
    const sparkGeom = new THREE.SphereGeometry(0.09, 6, 6);
    for (let i = 0; i < 36; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sparkGeom, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkPool.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
      });
    }

    // 4. Off-Road & Road Challenge Obstacles Pool (18 pooled obstacles)
    const obstacleKinds: ObstacleKind[] = [
      'rock',
      'rock',
      'log',
      'log',
      'stump',
      'stump',
      'cones',
      'cones',
      'construction_barrier',
      'construction_barrier',
      'wooden_roadblock',
      'wooden_roadblock',
      'tire_stack',
      'tire_stack',
      'concrete_barrier',
      'concrete_barrier',
      'drum_pylon',
      'drum_pylon',
    ];
    for (const kind of obstacleKinds) {
      const handle = buildObstacleMesh(kind, this.textures, this.isSoftwareGl);
      handle.root.visible = false;
      this.scene.add(handle.root);
      this.obstaclePool.push({
        handle,
        active: false,
        lane: 1,
        z: -220,
        nearMissed: false,
      });
    }

    // 5. Off-Road Mud & Dust Spray Particles (28 pooled)
    const mudGeom = new THREE.SphereGeometry(0.12, 5, 5);
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x78553a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(mudGeom, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.mudPool.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.45,
      });
    }
  }

  public setCarAndCustomization(spec: CarSpec, custom: CarCustomization): void {
    const needsRebuild = spec.id !== this.currentSpec.id || !this.playerCar;
    this.currentSpec = spec;
    this.currentCustom = { ...custom };
    if (needsRebuild) {
      this.rebuildPlayerCar(spec, custom);
    } else if (this.playerCar) {
      this.playerCar.setCustomization(custom);
    }
  }

  private rebuildPlayerCar(spec: CarSpec, custom: CarCustomization): void {
    if (this.playerCar) {
      this.scene.remove(this.playerCar.root);
      this.playerCar.dispose();
      this.playerCar = null;
    }
    this.playerCar = buildPlayerCar(spec, custom, this.textures, this.isSoftwareGl);
    this.playerCar.root.position.set(this.playerX, 0, 0);
    this.scene.add(this.playerCar.root);
  }

  public setSettings(next: GameSettings): void {
    const prevGraphics = this.settings.graphics;
    const prevWeatherMode = this.settings.weatherMode;
    this.settings = { ...next };

    if (prevGraphics !== next.graphics) {
      this.applyGraphicsPixelRatio();
    }

    if (next.weatherMode !== 'RANDOM') {
      this.activeWeather = next.weatherMode;
    } else if (prevWeatherMode !== 'RANDOM') {
      this.randomWeatherTimer = 18;
    }
  }

  public setTotalCoins(coins: number): void {
    this.totalCoins = coins;
  }

  public setLevel(level: LevelId): void {
    this.currentLevel = level;
    this.world.setLevel(level);
    this.clearDynamicEntities();
  }

  public setGameState(next: GameState): void {
    const prev = this.gameState;
    this.gameState = next;

    if (next === 'PLAYING' && prev !== 'PAUSED' && prev !== 'SETTINGS') {
      this.startNewRun();
    } else if (next !== 'PLAYING') {
      this.clearHeldInputs();
      audioEngine.updateDriving(false, 0, false, 0, false, false);
      if (next !== 'PAUSED' && next !== 'GAME_OVER') {
        // Showcase states: clear traffic/obstacles/coins and center car on road
        this.clearDynamicEntities();
        this.playerX = 0;
        this.activeLane = 1;
        this.laneQueue = [];
        this.laneAnimActive = false;
        this.laneAnimProgress = 0;
        if (this.playerCar) {
          this.playerCar.root.position.set(0, 0, 0);
          this.playerCar.setNitro(false, this.elapsedTotal);
          this.playerCar.setBraking(false);
          this.playerCar.updateMotion(this.wheelSpinAngle, 0, 0, 0, 0);
        }
      }
    }
  }

  public restartRun(): void {
    this.gameState = 'PLAYING';
    this.startNewRun();
  }

  private clearDynamicEntities(): void {
    for (const c of this.coinPool) {
      c.active = false;
      c.collected = false;
      c.mesh.visible = false;
    }
    for (const o of this.opponentPool) {
      o.active = false;
      o.handle.root.visible = false;
    }
    for (const obs of this.obstaclePool) {
      obs.active = false;
      obs.handle.root.visible = false;
    }
    for (const sp of this.sparkPool) {
      sp.life = 0;
      sp.mesh.visible = false;
    }
    for (const mud of this.mudPool) {
      mud.life = 0;
      mud.mesh.visible = false;
    }
  }

  private startNewRun(): void {
    this.clearDynamicEntities();
    this.world.setLevel(this.currentLevel);
    this.world.reset();
    this.activeLane = 1;
    this.laneQueue = [];
    this.laneAnimActive = false;
    this.laneAnimStartX = 0;
    this.laneAnimTargetX = 0;
    this.laneAnimProgress = 0;
    this.playerX = 0;
    this.prevPlayerX = 0;
    const startCruiseMs = Math.min(20, (this.currentSpec.topSpeedKmh / 3.6) * 0.30);
    this.speedMs = startCruiseMs; // ~72 km/h rolling highway start
    this.distanceMeters = 0;
    this.score = 0;
    this.coinsThisRun = 0;
    this.nearMissCount = 0;
    this.nitroEnergy = 100;
    this.nitroActive = false;
    this.nitroCooldown = false;
    this.clearHeldInputs();
    this.cameraShake = 0;
    this.coinSpawnZ = -40;
    this.opponentSpawnTimer = 0.7;
    this.obstacleSpawnTimer = 0.75;
    this.obstacleWaveCount = 0;
    this.mudSpawnAccum = 0;

    if (this.settings.weatherMode === 'RANDOM') {
      const choices: WeatherCondition[] = ['SUNNY', 'RAINY', 'FOGGY', 'SNOWY'];
      this.activeWeather = choices[Math.floor(Math.random() * choices.length)];
      this.randomWeatherTimer = 28;
    } else {
      this.activeWeather = this.settings.weatherMode;
    }

    if (this.playerCar) {
      this.playerCar.root.position.set(0, 0, 0);
      this.playerCar.root.rotation.set(0, 0, 0);
    }

    this.emitHud();
  }

  public clearHeldInputs(): void {
    this.throttlePressed = false;
    this.brakePressed = false;
    this.nitroPressed = false;
    this.nitroLatched = false;
  }

  private startNextQueuedLane(dir: -1 | 1): boolean {
    const nextLane = this.activeLane + dir;
    if (nextLane < 0 || nextLane > 2) {
      return false;
    }
    this.activeLane = nextLane;
    this.laneAnimActive = true;
    this.laneAnimStartX = this.playerX;
    this.laneAnimTargetX = LANE_CENTERS[nextLane];
    this.laneAnimProgress = 0;
    return true;
  }

  private enqueueLaneChange(dir: -1 | 1): void {
    if (this.gameState !== 'PLAYING') return;
    if (!this.laneAnimActive) {
      this.startNextQueuedLane(dir);
      return;
    }
    // Calculate where the car will be after executing already-queued steps
    let projectedLane = this.activeLane;
    for (const queuedDir of this.laneQueue) {
      projectedLane += queuedDir;
    }
    const afterNext = projectedLane + dir;
    if (afterNext >= 0 && afterNext <= 2 && this.laneQueue.length < 2) {
      this.laneQueue.push(dir);
    }
  }

  // Input API for Keyboard + Mobile Touch Controls (discrete 1-tap = 1-lane)
  public steerLeft(): void {
    this.enqueueLaneChange(-1);
  }

  public steerRight(): void {
    this.enqueueLaneChange(1);
  }

  public setThrottle(active: boolean): void {
    const next = active && this.gameState === 'PLAYING';
    if (this.throttlePressed !== next) {
      this.throttlePressed = next;
      this.hudEmitAccum = 0.025;
    }
  }

  public setBrake(active: boolean): void {
    const next = active && this.gameState === 'PLAYING';
    if (next) {
      this.nitroLatched = false;
    }
    if (this.brakePressed !== next) {
      this.brakePressed = next;
      this.hudEmitAccum = 0.025;
    }
  }

  public setNitro(active: boolean): void {
    const next = active && this.gameState === 'PLAYING';
    if (next && !this.nitroPressed && this.nitroEnergy >= 15 && !this.nitroCooldown) {
      audioEngine.playNitroIgnite();
    }
    this.nitroPressed = next;
  }

  /** Tap-to-activate Nitro boost (works seamlessly together with holding Accelerator). */
  public triggerNitroTap(): void {
    if (this.gameState !== 'PLAYING') return;
    if (this.nitroLatched) {
      this.nitroLatched = false;
      this.hudEmitAccum = 0.033;
      return;
    }
    if (!this.nitroCooldown && this.nitroEnergy >= 15) {
      this.nitroLatched = true;
      audioEngine.playNitroIgnite();
      this.hudEmitAccum = 0.033;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameState === 'PLAYING') {
      if (e.repeat) return;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.steerLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.steerRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.throttlePressed = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.brakePressed = true;
          break;
        case 'Space':
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          this.setNitro(true);
          break;
        case 'Escape':
        case 'KeyP':
          this.callbacks.onPauseRequest();
          break;
      }
    } else if (this.gameState === 'PAUSED' && (e.code === 'Escape' || e.code === 'KeyP')) {
      this.callbacks.onPauseRequest();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.throttlePressed = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.brakePressed = false;
        break;
      case 'Space':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.setNitro(false);
        break;
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    audioEngine.unlock();
    if (this.gameState === 'PLAYING') {
      this.touchStartX = e.clientX;
      this.touchStartY = e.clientY;
      this.touchSwiped = false;
    } else if (
      this.gameState === 'GARAGE' ||
      this.gameState === 'STORE' ||
      this.gameState === 'CUSTOMIZATION' ||
      this.gameState === 'MAIN_MENU' ||
      this.gameState === 'LEVEL_SELECT'
    ) {
      this.showcaseDragging = true;
      this.showcaseLastX = e.clientX;
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.gameState === 'PLAYING') {
      if (!this.touchSwiped && e.buttons > 0) {
        const dx = e.clientX - this.touchStartX;
        const dy = e.clientY - this.touchStartY;
        const threshold = 32 / Math.max(0.6, this.settings.sensitivity);
        if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.1) {
          if (dx < 0) this.steerLeft();
          else this.steerRight();
          this.touchSwiped = true;
        }
      }
    } else if (this.showcaseDragging) {
      const dx = e.clientX - this.showcaseLastX;
      this.showcaseLastX = e.clientX;
      this.showcaseAngle -= dx * 0.008;
    }
  }

  private handlePointerUp(): void {
    this.showcaseDragging = false;
    this.touchSwiped = false;
  }

  private handleResize(): void {
    if (this.disposed) return;
    const vv = window.visualViewport;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || vv?.width || window.innerWidth));
    const height = Math.max(1, Math.round(rect.height || vv?.height || window.innerHeight));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.applyGraphicsPixelRatio();
  }

  private handleOrientationChange(): void {
    this.handleResize();
    clearTimeout(this.resizeTimer1);
    clearTimeout(this.resizeTimer2);
    // Android Chrome settles visualViewport dimensions slightly after orientationchange fires
    this.resizeTimer1 = window.setTimeout(() => this.handleResize(), 100);
    this.resizeTimer2 = window.setTimeout(() => this.handleResize(), 280);
  }

  private spawnCoinPattern(): void {
    const count = 3 + Math.floor(Math.random() * 4);
    const candidateLanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    let chosenLane = candidateLanes[0];

    // Pick a lane that does not overlap an obstacle near spawn Z
    for (const lane of candidateLanes) {
      const hasObstacle = this.obstaclePool.some(
        (obs) => obs.active && obs.lane === lane && obs.z < -150 && obs.z > -210
      );
      if (!hasObstacle) {
        chosenLane = lane;
        break;
      }
    }

    let spawned = 0;
    for (const c of this.coinPool) {
      if (!c.active) {
        c.active = true;
        c.collected = false;
        c.lane = chosenLane;
        c.z = -175 - spawned * 4.4;
        c.mesh.position.set(LANE_CENTERS[chosenLane], 0.85, c.z);
        c.mesh.visible = true;
        spawned++;
        if (spawned >= count) break;
      }
    }
    this.coinSpawnZ = 22 + Math.random() * 24;
  }

  private spawnOpponentWave(): void {
    // Pick 1 or 2 lanes max so at least 1 lane is ALWAYS passable
    const lanes = [0, 1, 2];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = tmp;
    }

    const difficulty = Math.min(1, this.distanceMeters / 3500);
    const wantTwo = Math.random() < 0.34 + difficulty * 0.32;
    const spawnCount = wantTwo ? 2 : 1;
    const baseSpawnZ = -195;

    for (let s = 0; s < spawnCount; s++) {
      const lane = lanes[s];
      let blocked = false;
      for (const o of this.opponentPool) {
        if (o.active && o.lane === lane && Math.abs(o.z - baseSpawnZ) < 26) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const candidates = this.opponentPool.filter((o) => !o.active);
      if (candidates.length === 0) break;
      const opp = candidates[Math.floor(Math.random() * candidates.length)];

      opp.active = true;
      opp.lane = lane;
      opp.z = baseSpawnZ - s * (8 + Math.random() * 14);
      opp.nearMissed = false;
      const laneBaseSpeed = lane === 0 ? 24 : lane === 1 ? 20 : 16;
      opp.speedMs = laneBaseSpeed + Math.random() * 6 + difficulty * 5;
      opp.handle.root.position.set(LANE_CENTERS[lane], 0, opp.z);
      opp.handle.root.visible = true;
    }

    this.opponentSpawnTimer = Math.max(0.58, 1.45 - difficulty * 0.62) + Math.random() * 0.45;
  }

  private spawnOffroadObstacleWave(): void {
    const offroadKinds: ObstacleKind[] = ['rock', 'log', 'stump'];
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const difficulty = Math.min(1, this.distanceMeters / 3000);
    const wantTwo = Math.random() < 0.28 + difficulty * 0.34;
    const spawnCount = wantTwo ? 2 : 1;
    const baseSpawnZ = -190;

    for (let s = 0; s < spawnCount; s++) {
      const lane = lanes[s];
      const zPos = baseSpawnZ - s * (4 + Math.random() * 10);
      const blocked = this.obstaclePool.some(
        (obs) => obs.active && obs.lane === lane && Math.abs(obs.z - zPos) < 22
      );
      if (blocked) continue;

      const candidates = this.obstaclePool.filter(
        (obs) => !obs.active && offroadKinds.includes(obs.handle.kind)
      );
      if (candidates.length === 0) break;
      const picked = candidates[Math.floor(Math.random() * candidates.length)];

      picked.active = true;
      picked.lane = lane;
      picked.z = zPos;
      picked.nearMissed = false;
      picked.handle.root.position.set(LANE_CENTERS[lane], 0, picked.z);
      picked.handle.root.rotation.y =
        picked.handle.kind === 'log' ? (Math.random() - 0.5) * 0.25 : Math.random() * Math.PI * 2;
      picked.handle.root.visible = true;
    }

    this.obstacleSpawnTimer = Math.max(0.56, 1.32 - difficulty * 0.54) + Math.random() * 0.38;
  }

  private spawnRoadObstacleWave(): void {
    const roadKinds: ObstacleKind[] = [
      'cones',
      'construction_barrier',
      'wooden_roadblock',
      'tire_stack',
      'concrete_barrier',
      'drum_pylon',
    ];
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const difficulty = Math.min(1, this.distanceMeters / 2800);
    this.obstacleWaveCount++;

    // Escalating patterns: single blocker, double barricade (leaving 1 open lane), or staggered slalom
    const patternRoll = Math.random();
    const isStaggeredSlalom = this.obstacleWaveCount % 4 === 0;
    const spawnCount = isStaggeredSlalom || patternRoll < 0.38 + difficulty * 0.38 ? 2 : 1;
    const baseSpawnZ = -192;

    for (let s = 0; s < spawnCount; s++) {
      const lane = lanes[s];
      const zPos = isStaggeredSlalom ? baseSpawnZ - s * 22 : baseSpawnZ - s * 4;
      const blocked = this.obstaclePool.some(
        (obs) => obs.active && obs.lane === lane && Math.abs(obs.z - zPos) < 20
      );
      if (blocked) continue;

      const candidates = this.obstaclePool.filter(
        (obs) => !obs.active && roadKinds.includes(obs.handle.kind)
      );
      if (candidates.length === 0) break;
      const picked = candidates[Math.floor(Math.random() * candidates.length)];

      picked.active = true;
      picked.lane = lane;
      picked.z = zPos;
      picked.nearMissed = false;
      picked.handle.root.position.set(LANE_CENTERS[lane], 0, picked.z);
      picked.handle.root.rotation.y = 0;
      picked.handle.root.visible = true;
    }

    this.obstacleSpawnTimer = Math.max(0.48, 1.24 - difficulty * 0.58) + Math.random() * 0.32;
  }

  private triggerMudSpray(dt: number): void {
    if (this.currentLevel !== 'OFFROAD' || this.speedMs < 5) return;
    this.mudSpawnAccum += dt * (0.65 + this.speedMs / 32);
    if (this.mudSpawnAccum < 0.045) return;
    this.mudSpawnAccum = 0;

    for (const sideX of [-0.72, 0.72]) {
      const puff = this.mudPool.find((m) => m.life <= 0);
      if (!puff) break;
      puff.life = 0.28 + Math.random() * 0.18;
      puff.maxLife = puff.life;
      puff.vx = sideX * (1.1 + Math.random() * 1.4) + (Math.random() - 0.5) * 1.2;
      puff.vy = 1.6 + Math.random() * 2.3;
      puff.vz = 5.5 + this.speedMs * 0.22;
      puff.mesh.position.set(this.playerX + sideX, 0.14, 1.5);
      puff.mesh.scale.setScalar(0.8 + Math.random() * 0.7);
      (puff.mesh.material as THREE.MeshBasicMaterial).opacity = 0.78;
      puff.mesh.visible = true;
    }
  }

  private triggerSparks(x: number, y: number, z: number, colorHex: number, count: number): void {
    let emitted = 0;
    for (const sp of this.sparkPool) {
      if (sp.life <= 0) {
        sp.life = 0.35 + Math.random() * 0.2;
        sp.maxLife = sp.life;
        sp.vx = (Math.random() - 0.5) * 9;
        sp.vy = 2.5 + Math.random() * 6;
        sp.vz = (Math.random() - 0.5) * 7;
        sp.mesh.position.set(x, y, z);
        (sp.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (sp.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        sp.mesh.visible = true;
        emitted++;
        if (emitted >= count) break;
      }
    }
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate({
      levelId: this.currentLevel,
      speedKmh: Math.round(this.speedMs * 3.6),
      topSpeedKmh: this.currentSpec.topSpeedKmh,
      distanceMeters: Math.floor(this.distanceMeters),
      score: Math.floor(this.score),
      coinsThisRun: this.coinsThisRun,
      totalCoins: this.totalCoins,
      nitroEnergy: Math.round(this.nitroEnergy),
      nitroActive: this.nitroActive,
      nitroCooldown: this.nitroCooldown,
      activeWeather: this.activeWeather,
      isNight: this.settings.timeOfDay === 'NIGHT',
      nearMissCount: this.nearMissCount,
    });
  }

  private updateGameplay(dt: number): void {
    // Random Weather cycle
    if (this.settings.weatherMode === 'RANDOM') {
      this.randomWeatherTimer -= dt;
      if (this.randomWeatherTimer <= 0) {
        const list: WeatherCondition[] = ['SUNNY', 'RAINY', 'FOGGY', 'SNOWY'];
        const nextList = list.filter((w) => w !== this.activeWeather);
        this.activeWeather = nextList[Math.floor(Math.random() * nextList.length)];
        this.randomWeatherTimer = 32;
      }
    }

    // Weather & Off-Road terrain handling multipliers
    const weatherGrip =
      this.activeWeather === 'SNOWY' ? 0.78 : this.activeWeather === 'RAINY' ? 0.86 : 1.0;
    const isOffroad = this.currentLevel === 'OFFROAD';
    const isOffroadSpec =
      this.currentSpec.archetype === 'rally_4x4' || this.currentSpec.archetype === 'baja_truck';
    const surfaceSpeedMult = isOffroad ? (isOffroadSpec ? 0.97 : 0.86) : 1.0;
    const surfaceGrip = isOffroad ? (isOffroadSpec ? 0.94 : 0.82) : 1.0;
    const combinedGrip = weatherGrip * surfaceGrip;

    // Nitro energy & activation (supports both tap-to-activate latch and keyboard hold)
    const prevNitroActive = this.nitroActive;
    if (this.brakePressed) {
      this.nitroLatched = false;
    }
    const wantNitro = (this.nitroPressed || this.nitroLatched) && !this.brakePressed;
    if (wantNitro && !this.nitroCooldown && this.nitroEnergy > 0) {
      this.nitroActive = true;
      this.nitroEnergy = Math.max(0, this.nitroEnergy - 28 * dt);
      if (this.nitroEnergy <= 0) {
        this.nitroActive = false;
        this.nitroLatched = false;
        this.nitroCooldown = true;
      }
    } else {
      this.nitroActive = false;
      const rechargeRate = this.nitroCooldown ? 13 : 11;
      this.nitroEnergy = Math.min(100, this.nitroEnergy + rechargeRate * dt);
      if (this.nitroCooldown && this.nitroEnergy >= 25) {
        this.nitroCooldown = false;
      }
    }

    if (prevNitroActive !== this.nitroActive) {
      this.hudEmitAccum = 0.033;
    }

    // Single authoritative vehicle speed physics loop (braking priority > nitro > throttle > coast down)
    const specTopMs = (this.currentSpec.topSpeedKmh / 3.6) * surfaceSpeedMult;
    const nitroTopMs = specTopMs * (1.16 + (this.currentSpec.nitroPower / 100) * 0.14);

    const accelRate =
      (12 + (this.currentSpec.acceleration / 100) * 16) * (this.nitroActive ? 2.15 : 1.0);
    const brakeRate = 58 * combinedGrip;
    const coastDragRate = 4.2;

    if (this.brakePressed) {
      // Braking always has priority over throttle/nitro and smoothly stops down to 0 km/h
      this.speedMs = Math.max(0, this.speedMs - brakeRate * dt);
    } else if (this.nitroActive) {
      if (this.speedMs < nitroTopMs) {
        this.speedMs = Math.min(nitroTopMs, this.speedMs + accelRate * dt);
      } else {
        this.speedMs = THREE.MathUtils.damp(this.speedMs, nitroTopMs, 2.5, dt);
      }
    } else if (this.throttlePressed) {
      // Accelerator held: continuously accelerate toward the vehicle's maximum speed
      if (this.speedMs < specTopMs) {
        this.speedMs = Math.min(specTopMs, this.speedMs + accelRate * dt);
      } else {
        this.speedMs = Math.max(specTopMs, this.speedMs - coastDragRate * dt);
      }
    } else {
      // Accelerator released: stop accelerating and naturally coast down
      this.speedMs = Math.max(0, this.speedMs - coastDragRate * dt);
    }

    const travelDelta = this.speedMs * dt;
    this.distanceMeters += travelDelta;
    this.score += travelDelta * (this.nitroActive ? 2.5 : 1.2);

    // Discrete One-Tap 3-Lane Transition Animation (strictly bounded to Left / Center / Right lanes)
    this.prevPlayerX = this.playerX;
    if (this.laneAnimActive) {
      const handlingFactor = 0.85 + (this.currentSpec.handling / 100) * 0.25;
      const baseDuration = THREE.MathUtils.clamp(
        0.19 / (Math.max(0.65, this.settings.sensitivity) * handlingFactor * combinedGrip),
        0.12,
        0.25
      );
      this.laneAnimProgress = Math.min(1, this.laneAnimProgress + dt / baseDuration);
      const t = this.laneAnimProgress;
      const eased = t * t * (3 - 2 * t);
      this.playerX = THREE.MathUtils.lerp(this.laneAnimStartX, this.laneAnimTargetX, eased);

      if (this.laneAnimProgress >= 1) {
        this.playerX = this.laneAnimTargetX;
        this.laneAnimActive = false;
        this.laneAnimProgress = 0;

        while (this.laneQueue.length > 0) {
          const nextDir = this.laneQueue.shift()!;
          if (this.startNextQueuedLane(nextDir)) {
            break;
          }
        }
      }
    } else {
      this.playerX = LANE_CENTERS[this.activeLane];
    }
    this.playerX = THREE.MathUtils.clamp(this.playerX, LANE_CENTERS[0], LANE_CENTERS[2]);
    const lateralVel = (this.playerX - this.prevPlayerX) / Math.max(0.001, dt);

    // Off-road terrain suspension bounce & mud spray
    const speedFactor = Math.min(1, this.speedMs / 22);
    const suspensionOffsetY = isOffroad
      ? (Math.sin(this.distanceMeters * 0.52) * 0.048 +
          Math.sin(this.distanceMeters * 1.38) * 0.024) *
        speedFactor
      : 0;
    const terrainPitch = isOffroad ? Math.cos(this.distanceMeters * 0.52) * 0.024 * speedFactor : 0;
    const terrainRoll = isOffroad ? Math.sin(this.distanceMeters * 0.85) * 0.028 * speedFactor : 0;
    this.triggerMudSpray(dt);

    // Update Player Car transform & wheel kinematics
    const wheelR = isOffroadSpec ? 0.41 : 0.34;
    this.wheelSpinAngle -= travelDelta / wheelR;
    const steerAngle = THREE.MathUtils.clamp(-lateralVel * 0.032, -0.34, 0.34);
    const bodyRoll = THREE.MathUtils.clamp(-lateralVel * 0.011, -0.09, 0.09) + terrainRoll;
    const bodyPitch = (this.nitroActive ? -0.035 : this.brakePressed ? 0.03 : 0) + terrainPitch;

    if (this.playerCar) {
      this.playerCar.root.position.x = this.playerX;
      this.playerCar.root.rotation.y = steerAngle * 0.28;
      this.playerCar.updateMotion(
        this.wheelSpinAngle,
        steerAngle,
        bodyRoll,
        bodyPitch,
        suspensionOffsetY
      );
      this.playerCar.setBraking(this.brakePressed && !this.nitroActive);
      this.playerCar.setNitro(this.nitroActive, this.elapsedTotal);
      this.playerCar.setNightHeadlights(this.nightFactor);
    }

    // Third-person chase camera tuned for full-screen horizontal Landscape gameplay
    const narrowPadFov =
      this.camera.aspect < 1.25 ? THREE.MathUtils.clamp((1.25 - this.camera.aspect) * 18, 0, 10) : 0;
    const baseFov =
      (this.nitroActive ? 78 : 60 + Math.max(0, (this.speedMs - 22) * 0.22)) + narrowPadFov;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, baseFov, 6, dt);
    this.camera.updateProjectionMatrix();

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.5);
    }
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.45;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.35;

    _camTargetPos.set(
      this.playerX * 0.78 + shakeX,
      2.52 + (this.nitroActive ? -0.16 : 0) + suspensionOffsetY * 0.45 + shakeY,
      6.1 + (this.nitroActive ? 0.5 : 0)
    );
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, 9, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, 9, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, 9, dt);
    _camLookAt.set(this.playerX * 0.9, 0.96, -14);
    this.camera.lookAt(_camLookAt);

    // World scrolling
    this.world.update(
      dt,
      travelDelta,
      this.nightFactor,
      this.activeWeather,
      this.settings.graphics,
      0,
      this.distanceMeters
    );

    // Coin spawning & collection
    this.coinSpawnZ -= travelDelta;
    if (this.coinSpawnZ <= 0) {
      this.spawnCoinPattern();
    }

    for (const c of this.coinPool) {
      if (!c.active) continue;
      c.z += travelDelta;
      c.mesh.position.z = c.z;
      c.mesh.rotation.y += dt * 3.8;

      if (!c.collected && Math.abs(c.z) < 2.1 && Math.abs(c.mesh.position.x - this.playerX) < 1.35) {
        c.collected = true;
        c.active = false;
        c.mesh.visible = false;
        this.coinsThisRun += 1;
        this.totalCoins += 1;
        this.score += 50;
        audioEngine.playCoin();
        this.triggerSparks(c.mesh.position.x, 0.9, c.z, 0xfacc15, 10);
        this.callbacks.onCoinCollected(1);
      } else if (c.z > 14) {
        c.active = false;
        c.mesh.visible = false;
      }
    }

    const playerHalfW = this.currentSpec.width * 0.42;
    const playerHalfL = this.currentSpec.length * 0.44;

    if (this.currentLevel === 'TRAFFIC') {
      // Level 01: Dynamic traffic cars
      this.opponentSpawnTimer -= dt;
      if (this.opponentSpawnTimer <= 0) {
        this.spawnOpponentWave();
      }

      for (const o of this.opponentPool) {
        if (!o.active) continue;
        const relativeDelta = (this.speedMs - o.speedMs) * dt;
        o.z += relativeDelta;
        o.handle.root.position.z = o.z;

        const oppWheelAngle = -(o.speedMs * dt) / 0.34;
        for (const ws of o.handle.wheelSpins) {
          ws.rotation.x += oppWheelAngle;
        }
        o.handle.headlightMat.emissiveIntensity = 0.4 + this.nightFactor * 2.2;

        const oppHalfW = o.handle.width * 0.43;
        const oppHalfL = o.handle.length * 0.44;
        const dx = Math.abs(o.handle.root.position.x - this.playerX);
        const dz = Math.abs(o.z);

        if (dx < playerHalfW + oppHalfW && dz < playerHalfL + oppHalfL) {
          this.handleCollision(o.handle.root.position.x, o.z);
          return;
        }

        if (!o.nearMissed && o.z > 1.5 && o.z < 5.5 && dx < 2.7) {
          o.nearMissed = true;
          this.nearMissCount++;
          this.score += 75;
        }

        if (o.z > 24 || o.z < -250) {
          o.active = false;
          o.handle.root.visible = false;
        }
      }
    } else {
      // Level 02 (OFFROAD) & Level 03 (OBSTACLES): Static terrain/road obstacles
      this.obstacleSpawnTimer -= dt;
      if (this.obstacleSpawnTimer <= 0) {
        if (this.currentLevel === 'OFFROAD') {
          this.spawnOffroadObstacleWave();
        } else {
          this.spawnRoadObstacleWave();
        }
      }

      for (const obs of this.obstaclePool) {
        if (!obs.active) continue;
        obs.z += travelDelta;
        obs.handle.root.position.z = obs.z;

        const obsHalfW = obs.handle.width * 0.42;
        const obsHalfL = obs.handle.length * 0.44;
        const dx = Math.abs(obs.handle.root.position.x - this.playerX);
        const dz = Math.abs(obs.z);

        if (dx < playerHalfW + obsHalfW && dz < playerHalfL + obsHalfL) {
          this.handleCollision(obs.handle.root.position.x, obs.z);
          return;
        }

        if (!obs.nearMissed && obs.z > 1.4 && obs.z < 5.0 && dx < 2.65) {
          obs.nearMissed = true;
          this.nearMissCount++;
          this.score += 75;
        }

        if (obs.z > 20) {
          obs.active = false;
          obs.handle.root.visible = false;
        }
      }
    }

    // Update sound engine (includes off-road gravel/engine tone)
    audioEngine.updateDriving(
      true,
      this.speedMs / Math.max(10, specTopMs),
      this.nitroActive,
      lateralVel * 0.12,
      this.activeWeather === 'RAINY',
      isOffroad
    );

    // Emit HUD at ~40Hz for responsive live digital speedometer digits & needle
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.025) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private handleCollision(hitX: number, hitZ: number): void {
    this.clearHeldInputs();
    this.cameraShake = 1.0;
    this.triggerSparks(
      (this.playerX + hitX) * 0.5,
      0.8,
      hitZ * 0.5,
      0xf97316,
      18
    );
    audioEngine.playCrash();
    audioEngine.updateDriving(false, 0, false, 0, false, false);

    if (this.playerCar) {
      this.playerCar.setNitro(false, this.elapsedTotal);
    }

    this.gameState = 'GAME_OVER';
    const finalHud: HudSnapshot = {
      levelId: this.currentLevel,
      speedKmh: Math.round(this.speedMs * 3.6),
      topSpeedKmh: this.currentSpec.topSpeedKmh,
      distanceMeters: Math.floor(this.distanceMeters),
      score: Math.floor(this.score),
      coinsThisRun: this.coinsThisRun,
      totalCoins: this.totalCoins,
      nitroEnergy: Math.round(this.nitroEnergy),
      nitroActive: false,
      nitroCooldown: this.nitroCooldown,
      activeWeather: this.activeWeather,
      isNight: this.settings.timeOfDay === 'NIGHT',
      nearMissCount: this.nearMissCount,
    };
    this.callbacks.onGameOver(finalHud);
  }

  private updateShowcase(dt: number): void {
    // Slowly rotate showcase camera around the car on the live highway
    if (!this.showcaseDragging) {
      const autoSpeed =
        this.gameState === 'MAIN_MENU' ? 0.24 : this.gameState === 'CUSTOMIZATION' ? 0.18 : 0.34;
      this.showcaseAngle += dt * autoSpeed;
    }

    const dist = this.gameState === 'MAIN_MENU' ? 5.8 : 5.3;
    const camHeight = this.gameState === 'MAIN_MENU' ? 1.82 : 1.7;
    const lookOffsetY =
      this.gameState === 'GARAGE' || this.gameState === 'STORE' || this.gameState === 'CUSTOMIZATION'
        ? 0.35
        : 0.52;

    _camTargetPos.set(
      Math.sin(this.showcaseAngle) * dist,
      camHeight,
      Math.cos(this.showcaseAngle) * dist
    );
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, 7, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, 7, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, 7, dt);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 52, 6, dt);
    this.camera.updateProjectionMatrix();

    _camLookAt.set(0, lookOffsetY, 0);
    this.camera.lookAt(_camLookAt);

    // Gentle scroll in Main Menu / Level Select for living motion
    const menuScroll =
      this.gameState === 'MAIN_MENU' || this.gameState === 'LEVEL_SELECT' ? 14 * dt : 0;
    if (this.playerCar) {
      if (menuScroll > 0) {
        this.wheelSpinAngle -= menuScroll / 0.34;
      }
      this.playerCar.updateMotion(this.wheelSpinAngle, 0, 0, 0, 0);
      this.playerCar.setNightHeadlights(this.nightFactor);
      this.playerCar.setNitro(false, this.elapsedTotal);
    }

    const previewWeather =
      this.settings.weatherMode === 'RANDOM' ? 'SUNNY' : this.settings.weatherMode;
    this.activeWeather = previewWeather;
    this.world.update(dt, menuScroll, this.nightFactor, previewWeather, this.settings.graphics, 0, 0);
  }

  private updateSparks(dt: number): void {
    for (const sp of this.sparkPool) {
      if (sp.life > 0) {
        sp.life -= dt;
        sp.vy -= 14 * dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y = Math.max(0.05, sp.mesh.position.y + sp.vy * dt);
        sp.mesh.position.z += sp.vz * dt;
        (sp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, sp.life / sp.maxLife);
        if (sp.life <= 0) {
          sp.mesh.visible = false;
        }
      }
    }

    for (const mud of this.mudPool) {
      if (mud.life > 0) {
        mud.life -= dt;
        mud.vy -= 10 * dt;
        mud.mesh.position.x += mud.vx * dt;
        mud.mesh.position.y = Math.max(0.04, mud.mesh.position.y + mud.vy * dt);
        mud.mesh.position.z += mud.vz * dt;
        (mud.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          (mud.life / mud.maxLife) * 0.75
        );
        if (mud.life <= 0) {
          mud.mesh.visible = false;
        }
      }
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.elapsedTotal += dt;

    // Smooth Day/Night transition
    const targetNight = this.settings.timeOfDay === 'NIGHT' ? 1 : 0;
    this.nightFactor = THREE.MathUtils.damp(this.nightFactor, targetNight, 3.2, dt);

    if (this.gameState === 'PLAYING') {
      this.updateGameplay(dt);
    } else if (this.gameState === 'PAUSED' || this.gameState === 'GAME_OVER') {
      // Hold scene still during pause/gameover; just update sparks & lighting transition
      this.world.update(0, 0, this.nightFactor, this.activeWeather, this.settings.graphics, 0);
      if (this.playerCar) {
        this.playerCar.setNightHeadlights(this.nightFactor);
      }
    } else {
      this.updateShowcase(dt);
    }

    this.updateSparks(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    clearTimeout(this.resizeTimer1);
    clearTimeout(this.resizeTimer2);

    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('orientationchange', this.boundOrientationResize);
    window.visualViewport?.removeEventListener('resize', this.boundResize);
    screen.orientation?.removeEventListener?.('change', this.boundOrientationResize);
    window.removeEventListener('blur', this.boundBlur);
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerUp);
    dom.removeEventListener('webglcontextlost', this.boundContextLost);
    dom.removeEventListener('webglcontextrestored', this.boundContextRestored);

    audioEngine.updateDriving(false, 0, false, 0, false, false);

    if (this.playerCar) {
      this.playerCar.dispose();
    }
    for (const obs of this.obstaclePool) {
      obs.handle.dispose();
    }
    this.world.dispose();
    this.textures.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
