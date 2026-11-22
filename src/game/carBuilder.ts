import * as THREE from 'three';
import {
  AccessoryStyle,
  CarChassisArchetype,
  CarCustomization,
  CarSpec,
  PaintFinish,
  SpoilerStyle,
  WheelDesign,
} from './types';
import { ProceduralTextureSet } from './textures';

export interface BuiltCarHandle {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  paintMaterial: THREE.MeshPhysicalMaterial;
  wheelPivots: THREE.Group[]; // [FL, FR, RL, RR] steering pivots
  wheelSpins: THREE.Group[]; // rotating wheel+rim assemblies
  nitroFlames: THREE.Mesh[];
  headlightMeshes: THREE.Mesh[];
  taillightMeshes: THREE.Mesh[];
  headlightSpots: THREE.SpotLight[];
  underglowMesh: THREE.Mesh;
  underglowMat: THREE.MeshBasicMaterial;
  spoilerGroup: THREE.Group;
  accessoryGroup: THREE.Group;
  setCustomization: (custom: CarCustomization) => void;
  setNightHeadlights: (nightFactor: number) => void;
  setBraking: (braking: boolean) => void;
  setNitro: (active: boolean, time: number) => void;
  updateMotion: (
    wheelSpinAngle: number,
    steerAngle: number,
    bodyRoll: number,
    bodyPitch: number,
    suspensionOffsetY?: number
  ) => void;
  dispose: () => void;
}

export type OpponentType = 'sedan' | 'suv' | 'coupe' | 'truck' | 'sport';

export interface BuiltOpponentHandle {
  root: THREE.Group;
  wheelSpins: THREE.Group[];
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  width: number;
  length: number;
  type: OpponentType;
}

function getProfilePoints(archetype: CarChassisArchetype): THREE.Vector2[] {
  // Side profile in X-Y plane, extruded along Z then rotated so length is along Z (-Z is forward)
  switch (archetype) {
    case 'coupe':
      return [
        new THREE.Vector2(-2.15, 0.24),
        new THREE.Vector2(-2.08, 0.56),
        new THREE.Vector2(-1.35, 0.72),
        new THREE.Vector2(-0.62, 1.18),
        new THREE.Vector2(0.45, 1.2),
        new THREE.Vector2(1.42, 0.84),
        new THREE.Vector2(2.05, 0.78),
        new THREE.Vector2(2.12, 0.3),
        new THREE.Vector2(1.5, 0.24),
      ];
    case 'track':
      return [
        new THREE.Vector2(-2.22, 0.22),
        new THREE.Vector2(-2.14, 0.52),
        new THREE.Vector2(-1.4, 0.68),
        new THREE.Vector2(-0.55, 1.12),
        new THREE.Vector2(0.55, 1.12),
        new THREE.Vector2(1.45, 0.82),
        new THREE.Vector2(2.14, 0.8),
        new THREE.Vector2(2.18, 0.28),
      ];
    case 'midengine':
      return [
        new THREE.Vector2(-2.24, 0.2),
        new THREE.Vector2(-2.15, 0.48),
        new THREE.Vector2(-1.28, 0.68),
        new THREE.Vector2(-0.58, 1.08),
        new THREE.Vector2(0.35, 1.1),
        new THREE.Vector2(1.48, 0.82),
        new THREE.Vector2(2.18, 0.76),
        new THREE.Vector2(2.2, 0.24),
      ];
    case 'muscle_gt':
      return [
        new THREE.Vector2(-2.28, 0.24),
        new THREE.Vector2(-2.2, 0.64),
        new THREE.Vector2(-1.1, 0.78),
        new THREE.Vector2(-0.35, 1.24),
        new THREE.Vector2(0.75, 1.22),
        new THREE.Vector2(1.65, 0.88),
        new THREE.Vector2(2.2, 0.84),
        new THREE.Vector2(2.24, 0.28),
      ];
    case 'hypercar':
      return [
        new THREE.Vector2(-2.28, 0.18),
        new THREE.Vector2(-2.12, 0.44),
        new THREE.Vector2(-1.25, 0.66),
        new THREE.Vector2(-0.48, 1.04),
        new THREE.Vector2(0.45, 1.05),
        new THREE.Vector2(1.55, 0.74),
        new THREE.Vector2(2.22, 0.68),
        new THREE.Vector2(2.24, 0.22),
      ];
    case 'prototype':
      return [
        new THREE.Vector2(-2.34, 0.16),
        new THREE.Vector2(-2.15, 0.42),
        new THREE.Vector2(-1.32, 0.62),
        new THREE.Vector2(-0.62, 1.02),
        new THREE.Vector2(0.28, 1.02),
        new THREE.Vector2(1.2, 0.68),
        new THREE.Vector2(2.26, 0.68),
        new THREE.Vector2(2.3, 0.2),
      ];
    case 'rally_4x4':
      return [
        new THREE.Vector2(-2.16, 0.34),
        new THREE.Vector2(-2.08, 0.72),
        new THREE.Vector2(-1.26, 0.88),
        new THREE.Vector2(-0.52, 1.38),
        new THREE.Vector2(0.68, 1.36),
        new THREE.Vector2(1.48, 0.96),
        new THREE.Vector2(2.08, 0.92),
        new THREE.Vector2(2.12, 0.38),
      ];
    case 'baja_truck':
      return [
        new THREE.Vector2(-2.3, 0.42),
        new THREE.Vector2(-2.22, 0.9),
        new THREE.Vector2(-1.2, 1.04),
        new THREE.Vector2(-0.58, 1.56),
        new THREE.Vector2(0.32, 1.56),
        new THREE.Vector2(0.55, 1.12),
        new THREE.Vector2(2.18, 1.1),
        new THREE.Vector2(2.24, 0.46),
      ];
  }
}

function createCarBodyGeometry(spec: CarSpec): THREE.BufferGeometry {
  const pts = getProfilePoints(spec.archetype);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
  }
  shape.closePath();

  const bodyHalfWidth = (spec.width - 0.16) / 2;
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: bodyHalfWidth * 2,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Extrude is along +Z, profile X is length, Y is up.
  // Center along extrusion depth, then rotate -PI/2 around Y so profile -X -> -Z (front)
  geom.translate(0, 0, -bodyHalfWidth);
  geom.rotateY(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

function buildWheelAssembly(
  design: WheelDesign,
  rimColor: string,
  radius: number,
  width: number
): THREE.Group {
  const group = new THREE.Group();

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.85,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(rimColor),
    roughness: design === 'dish' ? 0.12 : 0.24,
    metalness: 0.88,
  });
  const discMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.45,
    metalness: 0.7,
  });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.3,
  });

  // Tire outer cylinder (oriented with axle along X)
  const tireGeom = new THREE.CylinderGeometry(radius, radius, width, 24);
  tireGeom.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeom, tireMat);
  tire.castShadow = true;
  group.add(tire);

  // Sidewall rim barrel
  const barrelGeom = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width + 0.015, 20);
  barrelGeom.rotateZ(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeom, rimMat);
  group.add(barrel);

  // Brake disc + caliper
  const discGeom = new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, width * 0.45, 16);
  discGeom.rotateZ(Math.PI / 2);
  const disc = new THREE.Mesh(discGeom, discMat);
  group.add(disc);

  const caliperGeom = new THREE.BoxGeometry(width * 0.55, radius * 0.28, radius * 0.22);
  const caliper = new THREE.Mesh(caliperGeom, caliperMat);
  caliper.position.set(0, radius * 0.25, radius * 0.22);
  group.add(caliper);

  // Spokes based on design
  const spokeCount =
    design === 'sport5' ? 5 : design === 'turbine' ? 8 : design === 'mesh' ? 10 : design === 'cyberblade' ? 6 : 4;
  const spokeThickness = design === 'mesh' ? 0.032 : design === 'turbine' ? 0.045 : 0.055;
  const spokeGeom = new THREE.BoxGeometry(width + 0.025, radius * 0.64, spokeThickness);

  for (let i = 0; i < spokeCount; i++) {
    const angle = (i * Math.PI * 2) / spokeCount;
    const spoke = new THREE.Mesh(spokeGeom, rimMat);
    spoke.rotation.x = angle;
    if (design === 'turbine') {
      spoke.rotation.y = 0.22;
    }
    group.add(spoke);
  }

  // Center hub cap
  const hubGeom = new THREE.CylinderGeometry(radius * 0.19, radius * 0.19, width + 0.04, 14);
  hubGeom.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeom, rimMat);
  group.add(hub);

  return group;
}

function buildSpoiler(style: SpoilerStyle, bodyColor: string, carbonMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  if (style === 'none') return group;

  const paintMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bodyColor),
    roughness: 0.2,
    metalness: 0.5,
  });

  if (style === 'lip') {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.09, 0.22), paintMat);
    lip.position.set(0, 0.86, 2.02);
    lip.rotation.x = -0.25;
    lip.castShadow = true;
    group.add(lip);
  } else if (style === 'gt_wing') {
    const pylonGeom = new THREE.BoxGeometry(0.06, 0.28, 0.22);
    const leftPylon = new THREE.Mesh(pylonGeom, carbonMat);
    leftPylon.position.set(-0.5, 0.94, 1.92);
    const rightPylon = new THREE.Mesh(pylonGeom, carbonMat);
    rightPylon.position.set(0.5, 0.94, 1.92);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.06, 0.34), carbonMat);
    wing.position.set(0, 1.1, 1.96);
    wing.rotation.x = 0.08;
    wing.castShadow = true;

    const endplateGeom = new THREE.BoxGeometry(0.04, 0.22, 0.4);
    const leftEnd = new THREE.Mesh(endplateGeom, paintMat);
    leftEnd.position.set(-0.92, 1.08, 1.96);
    const rightEnd = new THREE.Mesh(endplateGeom, paintMat);
    rightEnd.position.set(0.92, 1.08, 1.96);

    group.add(leftPylon, rightPylon, wing, leftEnd, rightEnd);
  } else if (style === 'swan_neck') {
    const pylonGeom = new THREE.BoxGeometry(0.05, 0.34, 0.16);
    const leftPylon = new THREE.Mesh(pylonGeom, carbonMat);
    leftPylon.position.set(-0.42, 1.02, 1.88);
    leftPylon.rotation.x = 0.18;
    const rightPylon = new THREE.Mesh(pylonGeom, carbonMat);
    rightPylon.position.set(0.42, 1.02, 1.88);
    rightPylon.rotation.x = 0.18;

    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.055, 0.38), carbonMat);
    mainWing.position.set(0, 1.14, 2.02);
    mainWing.rotation.x = 0.1;
    mainWing.castShadow = true;

    const upperFlap = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.035, 0.16), paintMat);
    upperFlap.position.set(0, 1.2, 2.12);
    upperFlap.rotation.x = 0.22;

    const endplateGeom = new THREE.BoxGeometry(0.04, 0.28, 0.46);
    const leftEnd = new THREE.Mesh(endplateGeom, carbonMat);
    leftEnd.position.set(-0.97, 1.14, 2.03);
    const rightEnd = new THREE.Mesh(endplateGeom, carbonMat);
    rightEnd.position.set(0.97, 1.14, 2.03);

    group.add(leftPylon, rightPylon, mainWing, upperFlap, leftEnd, rightEnd);
  }

  return group;
}

function buildAccessories(
  style: AccessoryStyle,
  spec: CarSpec,
  carbonMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  if (style === 'none') return group;

  const addStripes = style === 'racing_stripes' || style === 'full_aero';
  const addSplitter = style === 'carbon_splitter' || style === 'full_aero';
  const addScoop = style === 'roof_scoop' || style === 'full_aero';

  if (addStripes) {
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const hoodStripeGeom = new THREE.BoxGeometry(0.14, 0.02, 1.25);
    const s1 = new THREE.Mesh(hoodStripeGeom, stripeMat);
    s1.position.set(-0.14, 0.72, -1.35);
    s1.rotation.x = 0.22;
    const s2 = new THREE.Mesh(hoodStripeGeom, stripeMat);
    s2.position.set(0.14, 0.72, -1.35);
    s2.rotation.x = 0.22;

    const roofStripeGeom = new THREE.BoxGeometry(0.14, 0.02, 1.05);
    const r1 = new THREE.Mesh(roofStripeGeom, stripeMat);
    r1.position.set(-0.14, spec.archetype === 'hypercar' || spec.archetype === 'prototype' ? 1.11 : 1.25, -0.05);
    const r2 = new THREE.Mesh(roofStripeGeom, stripeMat);
    r2.position.set(0.14, spec.archetype === 'hypercar' || spec.archetype === 'prototype' ? 1.11 : 1.25, -0.05);

    group.add(s1, s2, r1, r2);
  }

  if (addSplitter) {
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.08, 0.05, 0.42), carbonMat);
    splitter.position.set(0, 0.16, -spec.length * 0.48);
    const sideSkirtGeom = new THREE.BoxGeometry(0.12, 0.06, spec.length * 0.56);
    const leftSkirt = new THREE.Mesh(sideSkirtGeom, carbonMat);
    leftSkirt.position.set(-spec.width * 0.51, 0.17, 0);
    const rightSkirt = new THREE.Mesh(sideSkirtGeom, carbonMat);
    rightSkirt.position.set(spec.width * 0.51, 0.17, 0);

    const canardGeom = new THREE.BoxGeometry(0.16, 0.03, 0.24);
    const lc = new THREE.Mesh(canardGeom, carbonMat);
    lc.position.set(-spec.width * 0.5, 0.34, -spec.length * 0.42);
    lc.rotation.z = 0.32;
    const rc = new THREE.Mesh(canardGeom, carbonMat);
    rc.position.set(spec.width * 0.5, 0.34, -spec.length * 0.42);
    rc.rotation.z = -0.32;

    group.add(splitter, leftSkirt, rightSkirt, lc, rc);
  }

  if (addScoop) {
    const roofY = spec.archetype === 'hypercar' || spec.archetype === 'prototype' ? 1.11 : 1.26;
    const scoopBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.72), carbonMat);
    scoopBody.position.set(0, roofY + 0.06, 0.12);
    const intakeMouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.09, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x090d16 })
    );
    intakeMouth.position.set(0, roofY + 0.06, -0.25);
    group.add(scoopBody, intakeMouth);
  }

  return group;
}

function applyPaintFinish(mat: THREE.MeshPhysicalMaterial, colorHex: string, finish: PaintFinish): void {
  mat.color.set(colorHex);
  if (finish === 'glossy') {
    mat.metalness = 0.28;
    mat.roughness = 0.14;
    mat.clearcoat = 1.0;
    mat.clearcoatRoughness = 0.06;
  } else if (finish === 'metallic') {
    mat.metalness = 0.88;
    mat.roughness = 0.22;
    mat.clearcoat = 0.92;
    mat.clearcoatRoughness = 0.08;
  } else {
    // Matte
    mat.metalness = 0.18;
    mat.roughness = 0.74;
    mat.clearcoat = 0.0;
    mat.clearcoatRoughness = 0.8;
  }
  mat.needsUpdate = true;
}

export function buildPlayerCar(
  spec: CarSpec,
  customization: CarCustomization,
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): BuiltCarHandle {
  const root = new THREE.Group();
  const chassisPivot = new THREE.Group(); // Handles roll/pitch suspension tilt
  root.add(chassisPivot);

  // Ground contact shadow (bottom-center grounded)
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.width * 1.45, spec.length * 1.24),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  root.add(shadowPlane);

  // Underglow strip (optional neon)
  const underglowMat = new THREE.MeshBasicMaterial({
    color: customization.underglowColor === 'none' ? 0x06b6d4 : new THREE.Color(customization.underglowColor),
    transparent: true,
    opacity: customization.underglowColor === 'none' ? 0 : 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const underglowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.width * 1.22, spec.length * 1.04),
    underglowMat
  );
  underglowMesh.rotation.x = -Math.PI / 2;
  underglowMesh.position.y = 0.025;
  root.add(underglowMesh);

  // 1. Primary Sculpted Body
  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(customization.bodyColor),
    envMapIntensity: 1.35,
  });
  applyPaintFinish(paintMaterial, customization.bodyColor, customization.finish);

  const bodyGeom = createCarBodyGeometry(spec);
  const bodyMesh = new THREE.Mesh(bodyGeom, paintMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  chassisPivot.add(bodyMesh);

  // Shared dark carbon & trim materials
  const carbonMat = new THREE.MeshStandardMaterial({
    map: textures.carbonMap,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.35,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.55,
    metalness: 0.4,
  });

  // 2. Cockpit Glass Canopy
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1220,
    metalness: 0.1,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: isSoftwareGl ? 0.72 : 0.85,
    depthWrite: false,
  });
  const isOffroadRig = spec.archetype === 'rally_4x4' || spec.archetype === 'baja_truck';
  const canopyHeight =
    spec.archetype === 'hypercar' || spec.archetype === 'prototype'
      ? 0.36
      : isOffroadRig
        ? 0.48
        : 0.42;
  const canopyY =
    spec.archetype === 'hypercar' || spec.archetype === 'prototype'
      ? 0.91
      : spec.archetype === 'baja_truck'
        ? 1.34
        : spec.archetype === 'rally_4x4'
          ? 1.18
          : 1.02;
  const canopyGeom = new THREE.BoxGeometry(spec.width * 0.72, canopyHeight, spec.length * 0.42);
  const canopy = new THREE.Mesh(canopyGeom, glassMat);
  canopy.position.set(0, canopyY, spec.archetype === 'baja_truck' ? -0.18 : 0.04);
  canopy.renderOrder = 2;
  chassisPivot.add(canopy);

  // 3. Lower Chassis Skirt & Rear Diffuser
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.96, 0.14, spec.length * 0.92),
    darkTrimMat
  );
  skirt.position.set(0, isOffroadRig ? 0.38 : 0.22, 0);
  chassisPivot.add(skirt);

  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.82, 0.2, 0.32),
    carbonMat
  );
  diffuser.position.set(0, 0.25, spec.length * 0.47);
  chassisPivot.add(diffuser);

  // 4. Front Grille & Intake
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.62, 0.2, 0.12),
    darkTrimMat
  );
  grille.position.set(0, 0.32, -spec.length * 0.49);
  chassisPivot.add(grille);

  // 5. Side Mirrors
  const mirrorGeom = new THREE.BoxGeometry(0.18, 0.09, 0.14);
  const leftMirror = new THREE.Mesh(mirrorGeom, paintMaterial);
  leftMirror.position.set(-spec.width * 0.51, 0.84, -0.58);
  const rightMirror = new THREE.Mesh(mirrorGeom, paintMaterial);
  rightMirror.position.set(spec.width * 0.51, 0.84, -0.58);
  chassisPivot.add(leftMirror, rightMirror);

  // 6. Headlights + Real Night SpotLights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.6,
    roughness: 0.15,
    metalness: 0.1,
  });
  const headlightGeom = new THREE.BoxGeometry(0.36, 0.11, 0.12);
  const hlLeft = new THREE.Mesh(headlightGeom, headlightMat);
  hlLeft.position.set(-spec.width * 0.32, 0.48, -spec.length * 0.49);
  const hlRight = new THREE.Mesh(headlightGeom, headlightMat);
  hlRight.position.set(spec.width * 0.32, 0.48, -spec.length * 0.49);
  chassisPivot.add(hlLeft, hlRight);

  const headlightSpots: THREE.SpotLight[] = [];
  for (const xSign of [-1, 1]) {
    const spot = new THREE.SpotLight(0xe0f2fe, 0, 62, Math.PI / 5.5, 0.55, 1.4);
    spot.position.set(xSign * 0.55, 0.55, -spec.length * 0.48);
    spot.target.position.set(xSign * 0.65, 0.0, -28);
    chassisPivot.add(spot);
    chassisPivot.add(spot.target);
    headlightSpots.push(spot);
  }

  // 7. LED Taillights
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });
  const tailGeom = new THREE.BoxGeometry(0.46, 0.1, 0.08);
  const tlLeft = new THREE.Mesh(tailGeom, taillightMat);
  tlLeft.position.set(-spec.width * 0.3, 0.64, spec.length * 0.48);
  const tlRight = new THREE.Mesh(tailGeom, taillightMat);
  tlRight.position.set(spec.width * 0.3, 0.64, spec.length * 0.48);
  const tlBar = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.72, 0.04, 0.06), taillightMat);
  tlBar.position.set(0, 0.64, spec.length * 0.485);
  chassisPivot.add(tlLeft, tlRight, tlBar);

  // 8. Exhaust Tips & Nitro Blue Flame Cones
  const exhaustGeom = new THREE.CylinderGeometry(0.065, 0.075, 0.22, 12);
  exhaustGeom.rotateX(Math.PI / 2);
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.15,
  });
  const exPositions = [-0.42, 0.42];
  const nitroFlames: THREE.Mesh[] = [];
  const flameGeom = new THREE.ConeGeometry(0.11, 0.95, 12);
  flameGeom.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (const exX of exPositions) {
    const tip = new THREE.Mesh(exhaustGeom, chromeMat);
    tip.position.set(exX, 0.26, spec.length * 0.49);
    chassisPivot.add(tip);

    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.position.set(exX, 0.26, spec.length * 0.49 + 0.5);
    flame.visible = false;
    chassisPivot.add(flame);
    nitroFlames.push(flame);
  }

  // 9. Four Wheels (Front Steering Pivots + Spin Groups)
  const wheelRadius = isOffroadRig ? 0.41 : 0.34;
  const wheelWidth = isOffroadRig ? 0.31 : 0.26;
  const wheelCoords: [number, number, number][] = [
    [-spec.width * 0.46, wheelRadius, -spec.length * 0.31], // FL
    [spec.width * 0.46, wheelRadius, -spec.length * 0.31], // FR
    [-spec.width * 0.47, wheelRadius, spec.length * 0.31], // RL
    [spec.width * 0.47, wheelRadius, spec.length * 0.31], // RR
  ];

  const wheelPivots: THREE.Group[] = [];
  const wheelSpins: THREE.Group[] = [];

  const rebuildWheels = (design: WheelDesign, color: string) => {
    for (let i = 0; i < wheelPivots.length; i++) {
      const pivot = wheelPivots[i];
      while (pivot.children.length > 0) {
        pivot.remove(pivot.children[0]);
      }
      const spin = buildWheelAssembly(design, color, wheelRadius, wheelWidth);
      pivot.add(spin);
      wheelSpins[i] = spin;
    }
  };

  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(wheelCoords[i][0], wheelCoords[i][1], wheelCoords[i][2]);
    root.add(pivot);
    wheelPivots.push(pivot);
    wheelSpins.push(new THREE.Group());
  }
  rebuildWheels(customization.wheelDesign, customization.wheelColor);

  // 10. Spoiler & Accessories Groups
  let spoilerGroup = buildSpoiler(customization.spoiler, customization.bodyColor, carbonMat);
  chassisPivot.add(spoilerGroup);

  let accessoryGroup = buildAccessories(customization.accessory, spec, carbonMat);
  chassisPivot.add(accessoryGroup);

  let currentCustom = { ...customization };

  return {
    root,
    bodyMesh,
    paintMaterial,
    wheelPivots,
    wheelSpins,
    nitroFlames,
    headlightMeshes: [hlLeft, hlRight],
    taillightMeshes: [tlLeft, tlRight, tlBar],
    headlightSpots,
    underglowMesh,
    underglowMat,
    spoilerGroup,
    accessoryGroup,
    setCustomization: (next: CarCustomization) => {
      applyPaintFinish(paintMaterial, next.bodyColor, next.finish);

      if (next.wheelDesign !== currentCustom.wheelDesign || next.wheelColor !== currentCustom.wheelColor) {
        rebuildWheels(next.wheelDesign, next.wheelColor);
      }

      if (next.spoiler !== currentCustom.spoiler || next.bodyColor !== currentCustom.bodyColor) {
        chassisPivot.remove(spoilerGroup);
        spoilerGroup = buildSpoiler(next.spoiler, next.bodyColor, carbonMat);
        chassisPivot.add(spoilerGroup);
      }

      if (next.accessory !== currentCustom.accessory) {
        chassisPivot.remove(accessoryGroup);
        accessoryGroup = buildAccessories(next.accessory, spec, carbonMat);
        chassisPivot.add(accessoryGroup);
      }

      if (next.underglowColor === 'none') {
        underglowMat.opacity = 0;
        underglowMesh.visible = false;
      } else {
        underglowMesh.visible = true;
        underglowMat.color.set(next.underglowColor);
        underglowMat.opacity = 0.72;
      }

      currentCustom = { ...next };
    },
    setNightHeadlights: (nightFactor: number) => {
      headlightMat.emissiveIntensity = 0.6 + nightFactor * 2.8;
      for (const spot of headlightSpots) {
        spot.intensity = nightFactor * 36;
      }
    },
    setBraking: (braking: boolean) => {
      taillightMat.emissive.setHex(braking ? 0xff2424 : 0xef4444);
      taillightMat.emissiveIntensity = braking ? 5.2 : 0.9;
    },
    setNitro: (active: boolean, time: number) => {
      for (let i = 0; i < nitroFlames.length; i++) {
        const f = nitroFlames[i];
        f.visible = active;
        if (active) {
          const flicker = 0.85 + Math.sin(time * 48 + i * 2.1) * 0.28;
          f.scale.set(1, 1, flicker * 1.45);
        }
      }
    },
    updateMotion: (
      wheelSpinAngle: number,
      steerAngle: number,
      bodyRoll: number,
      bodyPitch: number,
      suspensionOffsetY = 0
    ) => {
      chassisPivot.position.y = suspensionOffsetY;
      chassisPivot.rotation.z = bodyRoll;
      chassisPivot.rotation.x = bodyPitch;
      for (let i = 0; i < 4; i++) {
        if (i < 2) {
          wheelPivots[i].rotation.y = steerAngle;
        }
        wheelSpins[i].rotation.x = wheelSpinAngle;
      }
    },
    dispose: () => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      });
    },
  };
}

export function buildOpponentCar(
  type: OpponentType,
  colorHex: string,
  textures: ProceduralTextureSet
): BuiltOpponentHandle {
  const root = new THREE.Group();

  const dims: Record<OpponentType, { w: number; l: number; h: number; cabH: number }> = {
    sedan: { w: 1.88, l: 4.3, h: 0.56, cabH: 0.52 },
    coupe: { w: 1.9, l: 4.2, h: 0.48, cabH: 0.44 },
    sport: { w: 1.96, l: 4.35, h: 0.44, cabH: 0.4 },
    suv: { w: 2.04, l: 4.6, h: 0.68, cabH: 0.62 },
    truck: { w: 2.16, l: 5.4, h: 0.72, cabH: 1.15 },
  };
  const d = dims[type];

  // Ground contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(d.w * 1.4, d.l * 1.2),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  root.add(shadow);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: type === 'truck' ? 0.5 : 0.24,
    metalness: type === 'truck' ? 0.15 : 0.45,
    clearcoat: type === 'truck' ? 0.2 : 0.85,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.6,
    metalness: 0.3,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.4,
  });

  // Lower chassis body
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, d.l), bodyMat);
  lowerBody.position.y = 0.32 + d.h * 0.5;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  root.add(lowerBody);

  // Bumper & grille trim
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(d.w + 0.04, 0.2, 0.22), trimMat);
  frontBumper.position.set(0, 0.3, -d.l * 0.49);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(d.w + 0.04, 0.2, 0.22), trimMat);
  rearBumper.position.set(0, 0.3, d.l * 0.49);
  root.add(frontBumper, rearBumper);

  // Cabin / Cargo Box
  if (type === 'truck') {
    const cargoMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.55,
      metalness: 0.1,
    });
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.cabH, d.l * 0.66), cargoMat);
    cargo.position.set(0, 0.34 + d.h + d.cabH * 0.5 - 0.15, d.l * 0.15);
    cargo.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.92, 0.82, d.l * 0.26), bodyMat);
    cab.position.set(0, 0.34 + d.h + 0.32, -d.l * 0.34);
    cab.castShadow = true;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.82, 0.42, 0.08), glassMat);
    windshield.position.set(0, 0.34 + d.h + 0.42, -d.l * 0.47);
    root.add(cargo, cab, windshield);
  } else {
    const cabLen = type === 'suv' ? d.l * 0.62 : d.l * 0.46;
    const cabZ = type === 'suv' ? 0.28 : 0.14;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.84, d.cabH, cabLen), glassMat);
    cabin.position.set(0, 0.32 + d.h + d.cabH * 0.46, cabZ);
    cabin.castShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.82, 0.08, cabLen * 0.92), bodyMat);
    roof.position.set(0, 0.32 + d.h + d.cabH * 0.92, cabZ);
    root.add(cabin, roof);

    if (type === 'sport') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.88, 0.06, 0.24), trimMat);
      wing.position.set(0, 0.32 + d.h + 0.16, d.l * 0.44);
      root.add(wing);
    }
  }

  // Headlights & Taillights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.4,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 1.1,
  });

  const lightGeom = new THREE.BoxGeometry(0.32, 0.12, 0.08);
  for (const xSign of [-1, 1]) {
    const hl = new THREE.Mesh(lightGeom, headlightMat);
    hl.position.set(xSign * d.w * 0.32, 0.56, -d.l * 0.5);
    const tl = new THREE.Mesh(lightGeom, taillightMat);
    tl.position.set(xSign * d.w * 0.32, 0.62, d.l * 0.5);
    root.add(hl, tl);
  }

  // Wheels
  const wheelRadius = type === 'truck' || type === 'suv' ? 0.38 : 0.33;
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.8 });
  const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 16);
  tireGeom.rotateZ(Math.PI / 2);
  const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, 0.25, 12);
  rimGeom.rotateZ(Math.PI / 2);

  const wheelSpins: THREE.Group[] = [];
  const wheelOffsets: [number, number, number][] = [
    [-d.w * 0.47, wheelRadius, -d.l * 0.32],
    [d.w * 0.47, wheelRadius, -d.l * 0.32],
    [-d.w * 0.47, wheelRadius, d.l * 0.32],
    [d.w * 0.47, wheelRadius, d.l * 0.32],
  ];

  for (const [wx, wy, wz] of wheelOffsets) {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(tireGeom, tireMat);
    const rim = new THREE.Mesh(rimGeom, rimMat);
    wg.add(tire, rim);
    root.add(wg);
    wheelSpins.push(wg);
  }

  return {
    root,
    wheelSpins,
    headlightMat,
    taillightMat,
    width: d.w,
    length: d.l,
    type,
  };
}
