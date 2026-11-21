import * as THREE from 'three';
import { GraphicsQuality, LevelId, ROAD_WIDTH, WeatherCondition } from './types';
import { ProceduralTextureSet } from './textures';

export interface WorldEnvironmentHandle {
  setLevel: (level: LevelId) => void;
  update: (
    dt: number,
    travelDeltaZ: number,
    nightFactor: number,
    weather: WeatherCondition,
    graphics: GraphicsQuality,
    playerZ: number,
    distanceMeters?: number
  ) => void;
  reset: () => void;
  dispose: () => void;
}

const SEGMENT_LENGTH = 60;
const SEGMENT_COUNT = 8; // 480m endless scrolling corridor
const TOTAL_SPAN = SEGMENT_LENGTH * SEGMENT_COUNT;

const _colorScratch = new THREE.Color();
const _colorDaySky = new THREE.Color(0x60a5fa);
const _colorNightSky = new THREE.Color(0x050816);
const _colorFogWeather = new THREE.Color(0x94a3b8);
const _colorRainSky = new THREE.Color(0x475569);
const _colorSnowSky = new THREE.Color(0xcbd5e1);
const _colorNightWeather = new THREE.Color(0x0b1224);

const _sunDayColor = new THREE.Color(0xfff3d6);
const _moonNightColor = new THREE.Color(0x93c5fd);
const _hemiDaySky = new THREE.Color(0x87ceeb);
const _hemiDayGround = new THREE.Color(0x3f6212);
const _hemiNightSky = new THREE.Color(0x1e293b);
const _hemiNightGround = new THREE.Color(0x090d16);

export function createWorldEnvironment(
  scene: THREE.Scene,
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): WorldEnvironmentHandle {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // Lighting rig (warm directional sun/moon + cool hemisphere fill)
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3f6212, 0.85);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.85);
  keyLight.position.set(24, 42, 18);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(isSoftwareGl ? 512 : 1024, isSoftwareGl ? 512 : 1024);
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 110;
  keyLight.shadow.camera.left = -20;
  keyLight.shadow.camera.right = 20;
  keyLight.shadow.camera.top = 28;
  keyLight.shadow.camera.bottom = -28;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);
  scene.add(keyLight.target);

  // Fog initialized to daytime horizon
  const fog = new THREE.FogExp2(0x7cb9f8, 0.0045);
  scene.fog = fog;
  scene.background = new THREE.Color(0x60a5fa);

  // Sky objects: Sun, Moon, Stars, Clouds, Distant City Skyline
  const skyGroup = new THREE.Group();
  scene.add(skyGroup);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(12, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
  );
  sunMesh.position.set(70, 95, -260);
  skyGroup.add(sunMesh);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(9, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0, fog: false })
  );
  moonMesh.position.set(-55, 85, -260);
  skyGroup.add(moonMesh);

  // Stars (Points)
  const starCount = 360;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 460;
    starPos[i * 3 + 1] = 28 + Math.random() * 140;
    starPos[i * 3 + 2] = -120 - Math.random() * 220;
  }
  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 1.4,
    transparent: true,
    opacity: 0,
    fog: false,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeom, starMat);
  skyGroup.add(stars);

  // Slowly moving clouds
  const cloudGroup = new THREE.Group();
  skyGroup.add(cloudGroup);
  const cloudSprites: { sprite: THREE.Sprite; speed: number; baseX: number }[] = [];
  const cloudMat = new THREE.SpriteMaterial({
    map: textures.cloudMap,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    fog: false,
  });
  for (let i = 0; i < 18; i++) {
    const sp = new THREE.Sprite(cloudMat);
    const bx = (Math.random() - 0.5) * 320;
    const by = 42 + Math.random() * 36;
    const bz = -140 - Math.random() * 160;
    const scale = 24 + Math.random() * 26;
    sp.position.set(bx, by, bz);
    sp.scale.set(scale * 1.9, scale * 0.78, 1);
    cloudGroup.add(sp);
    cloudSprites.push({ sprite: sp, speed: 1.2 + Math.random() * 2.2, baseX: bx });
  }

  // Distant City Skyline (shown in Traffic & Obstacles levels)
  const cityGroup = new THREE.Group();
  skyGroup.add(cityGroup);
  const cityMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    map: textures.cityWindowMap,
    emissive: 0xffffff,
    emissiveMap: textures.cityWindowMap,
    emissiveIntensity: 0.05,
    roughness: 0.85,
    fog: true,
  });
  for (let i = 0; i < 28; i++) {
    const bw = 10 + Math.random() * 14;
    const bh = 22 + Math.random() * 58;
    const bd = 10 + Math.random() * 12;
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cityMat);
    const bx = -220 + i * 16 + (Math.random() - 0.5) * 6;
    const xPos = Math.abs(bx) < 18 ? (bx < 0 ? -24 : 24) : bx;
    bMesh.position.set(xPos, bh * 0.5 - 2, -230 - Math.random() * 45);
    cityGroup.add(bMesh);
  }

  // Distant Mountain Peaks (shown in Off-Roading level)
  const mountainGroup = new THREE.Group();
  mountainGroup.visible = false;
  skyGroup.add(mountainGroup);
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.94,
    metalness: 0.02,
  });
  const mountainPeakMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.88,
  });
  for (let i = 0; i < 20; i++) {
    const rad = 22 + Math.random() * 24;
    const mh = 34 + Math.random() * 54;
    const mx = -230 + i * 24 + (Math.random() - 0.5) * 10;
    const xPos = Math.abs(mx) < 22 ? (mx < 0 ? -36 : 36) : mx;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(rad, mh, 6), mountainMat);
    peak.position.set(xPos, mh * 0.42 - 4, -225 - Math.random() * 48);
    mountainGroup.add(peak);
    if (mh > 56) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.36, mh * 0.35, 6), mountainPeakMat);
      cap.position.set(xPos, mh * 0.72 - 4, peak.position.z);
      mountainGroup.add(cap);
    }
  }

  // Shared road and terrain materials
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltMap,
    roughnessMap: textures.asphaltRoughnessDry,
    roughness: 0.82,
    metalness: 0.08,
    envMapIntensity: 0.8,
  });

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.grassMap,
    roughness: 0.94,
    metalness: 0.0,
    color: 0xffffff,
  });

  const shoulderMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.05,
  });

  const guardrailMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.82,
  });

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.5,
    metalness: 0.7,
  });

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.92,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x2f7d32,
    roughness: 0.85,
  });

  const bushMat = new THREE.MeshStandardMaterial({
    color: 0x3b8c3e,
    roughness: 0.88,
  });

  const lampHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });

  const lightPoolMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Reusable Geometries for Road Segments
  const roadGeom = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
  roadGeom.rotateX(-Math.PI / 2);

  const terrainStripGeom = new THREE.PlaneGeometry(110, SEGMENT_LENGTH);
  terrainStripGeom.rotateX(-Math.PI / 2);

  const shoulderGeom = new THREE.BoxGeometry(1.4, 0.06, SEGMENT_LENGTH);
  const railGeom = new THREE.BoxGeometry(0.14, 0.28, SEGMENT_LENGTH);
  const postGeom = new THREE.BoxGeometry(0.12, 0.75, 0.12);

  // Composite multi-part Tree builder (trunk + 3 layered foliage crowns + shadow)
  const treeTrunkGeom = new THREE.CylinderGeometry(0.18, 0.32, 2.6, 7);
  const treeCrown1Geom = new THREE.ConeGeometry(1.9, 2.8, 8);
  const treeCrown2Geom = new THREE.ConeGeometry(1.45, 2.4, 8);
  const treeCrown3Geom = new THREE.ConeGeometry(0.95, 1.8, 8);
  const bushGeom = new THREE.DodecahedronGeometry(0.85, 1);

  const lampPoleGeom = new THREE.CylinderGeometry(0.08, 0.12, 6.2, 8);
  const lampArmGeom = new THREE.BoxGeometry(1.6, 0.1, 0.12);
  const lampHeadGeom = new THREE.BoxGeometry(0.55, 0.12, 0.32);
  const lightPoolGeom = new THREE.CircleGeometry(4.4, 16);
  lightPoolGeom.rotateX(-Math.PI / 2);

  const hillMoundMat = new THREE.MeshStandardMaterial({
    color: 0x4b5c2c,
    roughness: 0.94,
  });

  const boulderSideMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.92,
  });

  const obstacleCurbMat = new THREE.MeshStandardMaterial({
    map: textures.hazardStripeMap,
    roughness: 0.55,
  });

  const hillMoundGeom = new THREE.ConeGeometry(7.5, 4.6, 7);
  const boulderSideGeom = new THREE.DodecahedronGeometry(1.4, 0);
  const obstacleCurbGeom = new THREE.BoxGeometry(0.5, 0.32, SEGMENT_LENGTH);

  interface RoadSegment {
    group: THREE.Group;
    z: number;
    baseIndex: number;
  }
  const segments: RoadSegment[] = [];
  const highwayPropGroups: THREE.Group[] = [];
  const offroadPropGroups: THREE.Group[] = [];
  const obstaclePropGroups: THREE.Group[] = [];
  let activeLevel: LevelId = 'TRAFFIC';

  function createCompositeTree(scale: number): THREE.Group {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(treeTrunkGeom, trunkMat);
    trunk.position.y = 1.3;
    trunk.castShadow = !isSoftwareGl;

    const c1 = new THREE.Mesh(treeCrown1Geom, foliageMat);
    c1.position.y = 3.2;
    c1.castShadow = !isSoftwareGl;

    const c2 = new THREE.Mesh(treeCrown2Geom, foliageMat);
    c2.position.y = 4.6;

    const c3 = new THREE.Mesh(treeCrown3Geom, foliageMat);
    c3.position.y = 5.7;

    t.add(trunk, c1, c2, c3);
    t.scale.setScalar(scale);
    return t;
  }

  function createCompositeBush(scale: number): THREE.Group {
    const b = new THREE.Group();
    const m1 = new THREE.Mesh(bushGeom, bushMat);
    m1.position.set(0, 0.52, 0);
    const m2 = new THREE.Mesh(bushGeom, bushMat);
    m2.position.set(0.55, 0.38, 0.15);
    m2.scale.setScalar(0.72);
    const m3 = new THREE.Mesh(bushGeom, bushMat);
    m3.position.set(-0.48, 0.36, -0.12);
    m3.scale.setScalar(0.68);
    b.add(m1, m2, m3);
    b.scale.setScalar(scale);
    return b;
  }

  function createStreetlight(side: -1 | 1): THREE.Group {
    const lg = new THREE.Group();
    const pole = new THREE.Mesh(lampPoleGeom, postMat);
    pole.position.y = 3.1;
    const arm = new THREE.Mesh(lampArmGeom, postMat);
    arm.position.set(-side * 0.72, 6.1, 0);
    const head = new THREE.Mesh(lampHeadGeom, lampHeadMat);
    head.position.set(-side * 1.35, 6.02, 0);

    const pool = new THREE.Mesh(lightPoolGeom, lightPoolMat);
    pool.position.set(-side * 2.2, 0.03, 0);

    lg.add(pole, arm, head, pool);
    return lg;
  }

  for (let s = 0; s < SEGMENT_COUNT; s++) {
    const segGroup = new THREE.Group();
    const zPos = -s * SEGMENT_LENGTH;
    segGroup.position.z = zPos;

    // Road surface (switches between asphalt and rugged dirt trail)
    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.receiveShadow = true;
    roadMesh.position.y = 0;
    segGroup.add(roadMesh);

    // Left & Right expansive terrain (grass / snow / forest floor)
    const terL = new THREE.Mesh(terrainStripGeom, terrainMat);
    terL.position.set(-ROAD_WIDTH / 2 - 56.2, -0.02, 0);
    terL.receiveShadow = true;
    const terR = new THREE.Mesh(terrainStripGeom, terrainMat);
    terR.position.set(ROAD_WIDTH / 2 + 56.2, -0.02, 0);
    terR.receiveShadow = true;
    segGroup.add(terL, terR);

    // Layer A: Highway props (shoulders, guardrails, streetlights) for Traffic & Obstacles
    const hwyGroup = new THREE.Group();
    const shL = new THREE.Mesh(shoulderGeom, shoulderMat);
    shL.position.set(-ROAD_WIDTH / 2 - 0.7, 0.01, 0);
    shL.receiveShadow = true;
    const shR = new THREE.Mesh(shoulderGeom, shoulderMat);
    shR.position.set(ROAD_WIDTH / 2 + 0.7, 0.01, 0);
    shR.receiveShadow = true;
    hwyGroup.add(shL, shR);

    const railX = ROAD_WIDTH / 2 + 1.35;
    const railL = new THREE.Mesh(railGeom, guardrailMat);
    railL.position.set(-railX, 0.56, 0);
    const railR = new THREE.Mesh(railGeom, guardrailMat);
    railR.position.set(railX, 0.56, 0);
    hwyGroup.add(railL, railR);

    for (let pz = -SEGMENT_LENGTH / 2 + 6; pz < SEGMENT_LENGTH / 2; pz += 12) {
      const pL = new THREE.Mesh(postGeom, postMat);
      pL.position.set(-railX - 0.08, 0.37, pz);
      const pR = new THREE.Mesh(postGeom, postMat);
      pR.position.set(railX + 0.08, 0.37, pz);
      hwyGroup.add(pL, pR);
    }

    for (const lz of [-15, 15]) {
      const slL = createStreetlight(-1);
      slL.position.set(-railX - 0.45, 0, lz);
      const slR = createStreetlight(1);
      slR.position.set(railX + 0.45, 0, lz);
      hwyGroup.add(slL, slR);
    }
    segGroup.add(hwyGroup);
    highwayPropGroups.push(hwyGroup);

    // Layer B: Off-Road props (rolling terrain hills, boulders, denser trail-side trees)
    const offGroup = new THREE.Group();
    offGroup.visible = false;
    for (let h = 0; h < 4; h++) {
      const side: -1 | 1 = h % 2 === 0 ? -1 : 1;
      const hz = -SEGMENT_LENGTH / 2 + 8 + h * 14;
      const hill = new THREE.Mesh(hillMoundGeom, hillMoundMat);
      hill.scale.set(1.2 + (h % 2) * 0.5, 0.9 + Math.random() * 0.9, 1.4);
      hill.position.set(side * (ROAD_WIDTH / 2 + 14 + Math.random() * 14), 1.4, hz);
      offGroup.add(hill);

      const boulder = new THREE.Mesh(boulderSideGeom, boulderSideMat);
      boulder.scale.set(0.8 + Math.random() * 0.6, 0.7 + Math.random() * 0.5, 0.9);
      boulder.position.set(side * (ROAD_WIDTH / 2 + 1.8 + Math.random() * 2.4), 0.45, hz + 4);
      boulder.rotation.set(Math.random(), Math.random(), 0);
      offGroup.add(boulder);

      const trailTree = createCompositeTree(1.0 + Math.random() * 0.6);
      trailTree.position.set(side * (ROAD_WIDTH / 2 + 3.8 + Math.random() * 4.5), 0, hz - 3);
      offGroup.add(trailTree);
    }
    segGroup.add(offGroup);
    offroadPropGroups.push(offGroup);

    // Layer C: Level 3 Road Obstacles challenge curbs (high-visibility striped edge barriers)
    const obsGroup = new THREE.Group();
    obsGroup.visible = false;
    const curbL = new THREE.Mesh(obstacleCurbGeom, obstacleCurbMat);
    curbL.position.set(-ROAD_WIDTH / 2 - 0.35, 0.16, 0);
    const curbR = new THREE.Mesh(obstacleCurbGeom, obstacleCurbMat);
    curbR.position.set(ROAD_WIDTH / 2 + 0.35, 0.16, 0);
    obsGroup.add(curbL, curbR);
    segGroup.add(obsGroup);
    obstaclePropGroups.push(obsGroup);

    // Shared Trees & Bushes along both sides
    for (let i = 0; i < 6; i++) {
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      const tz = -SEGMENT_LENGTH / 2 + 5 + i * 9.5 + (Math.random() - 0.5) * 3;
      const tx = side * (ROAD_WIDTH / 2 + 5.2 + Math.random() * 14);
      const tree = createCompositeTree(0.85 + Math.random() * 0.48);
      tree.position.set(tx, 0, tz);
      segGroup.add(tree);

      const outerTree = createCompositeTree(1.0 + Math.random() * 0.55);
      outerTree.position.set(side * (ROAD_WIDTH / 2 + 22 + Math.random() * 18), 0, tz + 3);
      segGroup.add(outerTree);

      if (i % 2 === 0) {
        const bush = createCompositeBush(0.75 + Math.random() * 0.4);
        bush.position.set(side * (ROAD_WIDTH / 2 + 2.6 + Math.random() * 2.2), 0, tz - 2.5);
        segGroup.add(bush);
      }
    }

    worldGroup.add(segGroup);
    segments.push({ group: segGroup, z: zPos, baseIndex: s });
  }

  // Weather Particle System (Pooled Points for Rain / Snow)
  const MAX_PARTICLES = isSoftwareGl ? 320 : 1200;
  const particlePositions = new Float32Array(MAX_PARTICLES * 3);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 44;
    particlePositions[i * 3 + 1] = Math.random() * 22;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 65 - 18;
  }
  const particleGeom = new THREE.BufferGeometry();
  particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xe0f2fe,
    size: 0.25,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const weatherParticles = new THREE.Points(particleGeom, particleMat);
  weatherParticles.frustumCulled = false;
  scene.add(weatherParticles);

  let currentSnowBlend = 0;
  let elapsed = 0;

  const applyLevelAppearance = (level: LevelId) => {
    activeLevel = level;
    const isOffroad = level === 'OFFROAD';
    const isObstacles = level === 'OBSTACLES';

    for (const g of highwayPropGroups) g.visible = !isOffroad;
    for (const g of offroadPropGroups) g.visible = isOffroad;
    for (const g of obstaclePropGroups) g.visible = isObstacles;

    cityGroup.visible = !isOffroad;
    mountainGroup.visible = isOffroad;

    const desiredRoadMap = isOffroad ? textures.dirtRoadMap : textures.asphaltMap;
    if (roadMat.map !== desiredRoadMap) {
      roadMat.map = desiredRoadMap;
      roadMat.needsUpdate = true;
    }
  };

  return {
    setLevel: (level: LevelId) => {
      applyLevelAppearance(level);
    },
    update: (
      dt: number,
      travelDeltaZ: number,
      nightFactor: number,
      weather: WeatherCondition,
      graphics: GraphicsQuality,
      playerZ: number,
      distanceMeters = 0
    ) => {
      elapsed += dt;

      // Move sky & keyLight relative to player Z
      skyGroup.position.z = playerZ;
      keyLight.position.set(24, 42, playerZ + 18);
      keyLight.target.position.set(0, 0, playerZ - 12);

      // Recycle highway/trail segments smoothly + subtle off-road horizontal curve feel on distant segments
      const isOffroad = activeLevel === 'OFFROAD';
      const curvePhase = distanceMeters * 0.014;
      for (const seg of segments) {
        seg.z += travelDeltaZ;
        if (seg.z > SEGMENT_LENGTH + 18) {
          seg.z -= TOTAL_SPAN;
        }
        seg.group.position.z = seg.z;
        if (isOffroad && seg.z < -28) {
          const distFactor = Math.min(1, (-seg.z - 28) / 180);
          seg.group.position.x = Math.sin(curvePhase + seg.z * 0.012) * 3.8 * distFactor * distFactor;
        } else {
          seg.group.position.x = 0;
        }
      }

      // Clouds drift slowly across sky
      for (const c of cloudSprites) {
        c.sprite.position.x += c.speed * dt;
        if (c.sprite.position.x > 180) c.sprite.position.x = -180;
      }
      cloudMat.opacity = Math.max(0.12, (1 - nightFactor * 0.72) * (weather === 'FOGGY' ? 0.35 : 0.85));

      // Day <-> Night + Weather Sky & Fog Color Blending
      _colorScratch.copy(_colorDaySky);
      if (weather === 'RAINY') {
        _colorScratch.lerp(_colorRainSky, 0.75);
      } else if (weather === 'FOGGY') {
        _colorScratch.lerp(_colorFogWeather, 0.88);
      } else if (weather === 'SNOWY') {
        _colorScratch.lerp(_colorSnowSky, 0.72);
      }

      const nightTarget = weather === 'SUNNY' ? _colorNightSky : _colorNightWeather;
      _colorScratch.lerp(nightTarget, nightFactor);
      (scene.background as THREE.Color).copy(_colorScratch);
      fog.color.copy(_colorScratch);

      const targetFogDensity =
        weather === 'FOGGY'
          ? 0.028
          : weather === 'RAINY'
            ? 0.011
            : weather === 'SNOWY'
              ? 0.013
              : (isOffroad ? 0.0048 : 0.0042) + nightFactor * 0.0022;
      fog.density = THREE.MathUtils.damp(fog.density, targetFogDensity, 2.5, dt);

      // Key & Hemisphere light transitions
      keyLight.color.copy(_sunDayColor).lerp(_moonNightColor, nightFactor);
      const weatherDim = weather === 'RAINY' ? 0.62 : weather === 'FOGGY' ? 0.55 : weather === 'SNOWY' ? 0.78 : 1.0;
      keyLight.intensity = THREE.MathUtils.lerp(1.9 * weatherDim, 0.48, nightFactor);

      hemiLight.color.copy(_hemiDaySky).lerp(_hemiNightSky, nightFactor);
      hemiLight.groundColor.copy(_hemiDayGround).lerp(_hemiNightGround, nightFactor);
      hemiLight.intensity = THREE.MathUtils.lerp(0.88 * weatherDim, 0.32, nightFactor);

      sunMesh.visible = nightFactor < 0.85 && weather === 'SUNNY';
      moonMesh.visible = nightFactor > 0.15;
      starMat.opacity = Math.max(0, (nightFactor - 0.25) / 0.75) * (weather === 'SUNNY' ? 0.9 : 0.35);

      // Streetlights & City Skyline glow at night
      lampHeadMat.emissiveIntensity = nightFactor * 2.8;
      lightPoolMat.opacity = nightFactor * 0.26;
      cityMat.emissiveIntensity = 0.04 + nightFactor * 1.15;

      // Wet Asphalt Reflections in Rainy Mode (matte dirt in Off-Roading)
      const isRainy = weather === 'RAINY';
      const targetRoughness = isOffroad ? 0.95 : isRainy ? 0.22 : 0.85;
      roadMat.roughness = THREE.MathUtils.damp(roadMat.roughness, targetRoughness, 3.0, dt);
      roadMat.envMapIntensity = isOffroad ? 0.25 : isRainy ? 2.1 : 0.75;
      const desiredRoughMap =
        !isOffroad && isRainy ? textures.asphaltRoughnessWet : textures.asphaltRoughnessDry;
      if (roadMat.roughnessMap !== desiredRoughMap) {
        roadMat.roughnessMap = desiredRoughMap;
        roadMat.needsUpdate = true;
      }

      // Terrain texture: Snow vs Off-Road Forest Floor vs Highway Grass
      const targetSnow = weather === 'SNOWY' ? 1 : 0;
      currentSnowBlend = THREE.MathUtils.damp(currentSnowBlend, targetSnow, 2.5, dt);
      const desiredTerrainMap =
        currentSnowBlend > 0.5
          ? textures.snowMap
          : isOffroad
            ? textures.forestFloorMap
            : textures.grassMap;
      if (terrainMat.map !== desiredTerrainMap) {
        terrainMat.map = desiredTerrainMap;
        terrainMat.needsUpdate = true;
      }
      foliageMat.color.setHex(0x2f7d32).lerp(_colorSnowSky, currentSnowBlend * 0.78);
      bushMat.color.setHex(0x3b8c3e).lerp(_colorSnowSky, currentSnowBlend * 0.75);
      hillMoundMat.color.setHex(0x4b5c2c).lerp(_colorSnowSky, currentSnowBlend * 0.75);

      // Weather Particles (Rain / Snow)
      const activeRatio = graphics === 'LOW' ? 0.35 : graphics === 'MEDIUM' ? 0.65 : 1.0;
      const activeCount = Math.floor(MAX_PARTICLES * activeRatio);
      particleGeom.setDrawRange(0, activeCount);

      if (weather === 'RAINY' || weather === 'SNOWY') {
        weatherParticles.visible = true;
        weatherParticles.position.z = playerZ;
        const isSnow = weather === 'SNOWY';
        particleMat.color.setHex(isSnow ? 0xffffff : 0xbae6fd);
        particleMat.size = isSnow ? 0.36 : 0.2;
        particleMat.opacity = isSnow ? 0.82 : 0.58;

        const posArr = particleGeom.attributes.position.array as Float32Array;
        const fallSpeed = isSnow ? 6.5 : 34;
        const zSpeed = isSnow ? travelDeltaZ * 0.45 : travelDeltaZ * 0.9;
        for (let i = 0; i < activeCount; i++) {
          const idx = i * 3;
          posArr[idx + 1] -= fallSpeed * dt;
          posArr[idx + 2] += zSpeed;
          if (isSnow) {
            posArr[idx] += Math.sin(elapsed * 2.2 + i) * 1.4 * dt;
          } else {
            posArr[idx] -= 2.2 * dt;
          }

          if (posArr[idx + 1] < 0) {
            posArr[idx + 1] = 20 + Math.random() * 4;
            posArr[idx] = (Math.random() - 0.5) * 44;
          }
          if (posArr[idx + 2] > 14) {
            posArr[idx + 2] = -48 - Math.random() * 14;
          }
        }
        particleGeom.attributes.position.needsUpdate = true;
      } else {
        weatherParticles.visible = false;
      }
    },
    reset: () => {
      for (let s = 0; s < segments.length; s++) {
        segments[s].z = -s * SEGMENT_LENGTH;
        segments[s].group.position.set(0, 0, segments[s].z);
      }
    },
    dispose: () => {
      roadGeom.dispose();
      terrainStripGeom.dispose();
      shoulderGeom.dispose();
      railGeom.dispose();
      postGeom.dispose();
      treeTrunkGeom.dispose();
      treeCrown1Geom.dispose();
      treeCrown2Geom.dispose();
      treeCrown3Geom.dispose();
      bushGeom.dispose();
      lampPoleGeom.dispose();
      lampArmGeom.dispose();
      lampHeadGeom.dispose();
      lightPoolGeom.dispose();
      hillMoundGeom.dispose();
      boulderSideGeom.dispose();
      obstacleCurbGeom.dispose();
      starGeom.dispose();
      particleGeom.dispose();
    },
  };
}
