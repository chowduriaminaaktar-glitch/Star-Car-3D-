import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';

export type ObstacleKind =
  // Level 2: Off-Road natural obstacles
  | 'rock'
  | 'log'
  | 'stump'
  // Level 3: Road challenge obstacles
  | 'cones'
  | 'construction_barrier'
  | 'wooden_roadblock'
  | 'tire_stack'
  | 'concrete_barrier'
  | 'drum_pylon';

export interface BuiltObstacleHandle {
  root: THREE.Group;
  kind: ObstacleKind;
  width: number;
  length: number;
  dispose: () => void;
}

export function buildObstacleMesh(
  kind: ObstacleKind,
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): BuiltObstacleHandle {
  const root = new THREE.Group();
  const castShadow = !isSoftwareGl;

  // Soft ground contact shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.2),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  let width = 1.9;
  let length = 1.3;

  if (kind === 'rock') {
    width = 2.05;
    length = 1.7;
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.94,
      metalness: 0.04,
    });
    const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), rockMat);
    mainRock.scale.set(1.25, 0.88, 1.0);
    mainRock.position.set(0, 0.68, 0);
    mainRock.rotation.set(0.2, 0.7, 0.15);
    mainRock.castShadow = castShadow;

    const sideRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), rockMat);
    sideRock.position.set(-0.72, 0.42, 0.35);
    sideRock.rotation.set(0.4, 1.1, 0.2);
    sideRock.castShadow = castShadow;

    const pebbleRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), rockMat);
    pebbleRock.position.set(0.76, 0.32, -0.25);
    root.add(mainRock, sideRock, pebbleRock);
  } else if (kind === 'log') {
    width = 2.5;
    length = 1.1;
    const barkMat = new THREE.MeshStandardMaterial({
      map: textures.woodPlankMap,
      color: 0x7c5333,
      roughness: 0.95,
    });
    const cutMat = new THREE.MeshStandardMaterial({
      color: 0xd6b07c,
      roughness: 0.88,
    });

    const trunkGeom = new THREE.CylinderGeometry(0.42, 0.46, 2.55, 10);
    trunkGeom.rotateZ(Math.PI / 2);
    const trunk = new THREE.Mesh(trunkGeom, barkMat);
    trunk.position.set(0, 0.44, 0);
    trunk.rotation.y = 0.12;
    trunk.castShadow = castShadow;

    const endCapGeom = new THREE.CircleGeometry(0.4, 10);
    const capL = new THREE.Mesh(endCapGeom, cutMat);
    capL.position.set(-1.28, 0.44, -0.15);
    capL.rotation.y = -Math.PI / 2 + 0.12;
    const capR = new THREE.Mesh(endCapGeom, cutMat);
    capR.position.set(1.28, 0.44, 0.15);
    capR.rotation.y = Math.PI / 2 + 0.12;

    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.65, 7), barkMat);
    branch.position.set(0.42, 0.78, 0.08);
    branch.rotation.z = -0.55;
    root.add(trunk, capL, capR, branch);
  } else if (kind === 'stump') {
    width = 1.75;
    length = 1.6;
    const barkMat = new THREE.MeshStandardMaterial({
      map: textures.woodPlankMap,
      color: 0x6b4428,
      roughness: 0.94,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd9b98b,
      roughness: 0.85,
    });
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.86, 1.05, 10), barkMat);
    stump.position.y = 0.52;
    stump.castShadow = castShadow;

    const topDisc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 10), ringMat);
    topDisc.rotation.x = -Math.PI / 2;
    topDisc.position.y = 1.055;

    const mudMound = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.28, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x4b3522, roughness: 0.96 })
    );
    mudMound.position.y = 0.09;
    root.add(stump, topDisc, mudMound);
  } else if (kind === 'cones') {
    width = 2.0;
    length = 1.5;
    const coneMat = new THREE.MeshStandardMaterial({
      map: textures.hazardStripeMap,
      roughness: 0.45,
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
    });

    const offsets: [number, number][] = [
      [-0.68, 0.25],
      [0, -0.32],
      [0.68, 0.25],
    ];
    for (const [ox, oz] of offsets) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.58), baseMat);
      base.position.set(ox, 0.04, oz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.86, 12), coneMat);
      cone.position.set(ox, 0.49, oz);
      cone.castShadow = castShadow;
      root.add(base, cone);
    }
  } else if (kind === 'construction_barrier') {
    width = 2.55;
    length = 1.0;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.65 });
    const stripeMat = new THREE.MeshStandardMaterial({
      map: textures.hazardStripeMap,
      roughness: 0.38,
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.52, 0.14), stripeMat);
    board.position.set(0, 0.88, 0);
    board.castShadow = castShadow;

    const lowerBoard = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.24, 0.12), stripeMat);
    lowerBoard.position.set(0, 0.42, 0);

    for (const lx of [-1.02, 1.02]) {
      const legF = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), frameMat);
      legF.position.set(lx, 0.55, 0.22);
      legF.rotation.x = -0.22;
      const legB = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), frameMat);
      legB.position.set(lx, 0.55, -0.22);
      legB.rotation.x = 0.22;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), beaconMat);
      lamp.position.set(lx, 1.24, 0);
      root.add(legF, legB, lamp);
    }
    root.add(board, lowerBoard);
  } else if (kind === 'wooden_roadblock') {
    width = 2.45;
    length = 1.05;
    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodPlankMap,
      roughness: 0.88,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.92,
    });
    const paintStripeMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.6,
    });

    const topPlank = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.3, 0.16), woodMat);
    topPlank.position.set(0, 0.92, 0);
    topPlank.castShadow = castShadow;

    const midPlank = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 0.14), woodMat);
    midPlank.position.set(0, 0.5, 0);
    midPlank.castShadow = castShadow;

    const warningStrip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.17), paintStripeMat);
    warningStrip.position.set(0, 0.92, 0);

    for (const sx of [-0.95, 0.95]) {
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.16, 0.14), darkWoodMat);
      leg1.position.set(sx, 0.56, 0.22);
      leg1.rotation.x = -0.24;
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.16, 0.14), darkWoodMat);
      leg2.position.set(sx, 0.56, -0.22);
      leg2.rotation.x = 0.24;
      root.add(leg1, leg2);
    }
    root.add(topPlank, midPlank, warningStrip);
  } else if (kind === 'tire_stack') {
    width = 2.25;
    length = 1.35;
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.86,
      metalness: 0.08,
    });
    const redTireMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.65,
    });
    const tireGeom = new THREE.TorusGeometry(0.38, 0.18, 10, 18);
    tireGeom.rotateX(Math.PI / 2);

    const stacks: [number, number, number][] = [
      [-0.65, 0, 2],
      [0.65, 0, 2],
      [0, -0.1, 3],
    ];
    for (const [sx, sz, count] of stacks) {
      for (let h = 0; h < count; h++) {
        const useRed = h === count - 1;
        const t = new THREE.Mesh(tireGeom, useRed ? redTireMat : tireMat);
        t.position.set(sx, 0.19 + h * 0.34, sz);
        t.castShadow = castShadow;
        root.add(t);
      }
    }
  } else if (kind === 'concrete_barrier') {
    width = 2.4;
    length = 1.15;
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.9,
      metalness: 0.05,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      map: textures.hazardStripeMap,
      roughness: 0.5,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.34, 0.92), concreteMat);
    base.position.set(0, 0.17, 0);
    base.castShadow = castShadow;

    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.72, 0.44), concreteMat);
    wall.position.set(0, 0.66, 0);
    wall.castShadow = castShadow;

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.16, 0.48), stripeMat);
    topCap.position.set(0, 1.05, 0);
    root.add(base, wall, topCap);
  } else {
    // 'drum_pylon'
    width = 1.95;
    length = 1.3;
    const drumMat = new THREE.MeshStandardMaterial({
      map: textures.hazardStripeMap,
      roughness: 0.42,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });
    for (const dx of [-0.55, 0.55]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.12, 14), capMat);
      base.position.set(dx, 0.06, 0);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 1.06, 14), drumMat);
      body.position.set(dx, 0.62, 0);
      body.castShadow = castShadow;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.1, 14), capMat);
      top.position.set(dx, 1.18, 0);
      root.add(base, body, top);
    }
  }

  return {
    root,
    kind,
    width,
    length,
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
