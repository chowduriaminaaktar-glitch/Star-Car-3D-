import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  asphaltRoughnessDry: THREE.CanvasTexture;
  asphaltRoughnessWet: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  snowMap: THREE.CanvasTexture;
  dirtRoadMap: THREE.CanvasTexture;
  forestFloorMap: THREE.CanvasTexture;
  hazardStripeMap: THREE.CanvasTexture;
  woodPlankMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
  cityWindowMap: THREE.CanvasTexture;
  carbonMap: THREE.CanvasTexture;
  coinFaceMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. 3-Lane Highway Asphalt Albedo
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d')!;

  rctx.fillStyle = '#252932';
  rctx.fillRect(0, 0, 512, 512);

  // Subtle aggregate asphalt speckle
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 28 + Math.floor(Math.random() * 28);
    rctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    rctx.fillRect(x, y, 2, 2);
  }

  // Subtle darker tire-wear tracks in each of the 3 lanes
  const lanePxCenters = [98, 256, 414];
  for (const cx of lanePxCenters) {
    const gradLeft = rctx.createLinearGradient(cx - 42, 0, cx + 42, 0);
    gradLeft.addColorStop(0, 'rgba(15, 18, 24, 0)');
    gradLeft.addColorStop(0.28, 'rgba(15, 18, 24, 0.25)');
    gradLeft.addColorStop(0.5, 'rgba(15, 18, 24, 0.04)');
    gradLeft.addColorStop(0.72, 'rgba(15, 18, 24, 0.25)');
    gradLeft.addColorStop(1, 'rgba(15, 18, 24, 0)');
    rctx.fillStyle = gradLeft;
    rctx.fillRect(cx - 42, 0, 84, 512);
  }

  // Shoulder rumble strips + crisp yellow/white edge lines
  rctx.fillStyle = '#eab308';
  rctx.fillRect(16, 0, 8, 512);
  rctx.fillStyle = '#f8fafc';
  rctx.fillRect(488, 0, 8, 512);

  // Dashed lane dividers between Lane 1/2 and Lane 2/3
  rctx.fillStyle = '#f1f5f9';
  const dividerXs = [173, 333];
  for (const dx of dividerXs) {
    for (let y = 16; y < 512; y += 128) {
      rctx.fillRect(dx, y, 6, 72);
    }
  }

  const asphaltMap = new THREE.CanvasTexture(roadCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.ClampToEdgeWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(1, 5);
  asphaltMap.anisotropy = aniso;

  // 2. Dry Road Roughness Map (linear)
  const dryCanvas = document.createElement('canvas');
  dryCanvas.width = 256;
  dryCanvas.height = 256;
  const dctx = dryCanvas.getContext('2d')!;
  dctx.fillStyle = '#d4d4d4';
  dctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 180 + Math.floor(Math.random() * 65);
    dctx.fillStyle = `rgb(${v},${v},${v})`;
    dctx.fillRect(x, y, 2, 2);
  }
  const asphaltRoughnessDry = new THREE.CanvasTexture(dryCanvas);
  asphaltRoughnessDry.wrapS = THREE.RepeatWrapping;
  asphaltRoughnessDry.wrapT = THREE.RepeatWrapping;
  asphaltRoughnessDry.repeat.set(2, 6);

  // 3. Wet Puddle Roughness Map (dark = glossy specular puddles)
  const wetCanvas = document.createElement('canvas');
  wetCanvas.width = 256;
  wetCanvas.height = 256;
  const wctx = wetCanvas.getContext('2d')!;
  wctx.fillStyle = '#484848';
  wctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 42; i++) {
    const px = Math.random() * 256;
    const py = Math.random() * 256;
    const rx = 14 + Math.random() * 34;
    const ry = 22 + Math.random() * 55;
    const grad = wctx.createRadialGradient(px, py, 2, px, py, Math.max(rx, ry));
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(1, 'rgba(72,72,72,0)');
    wctx.fillStyle = grad;
    wctx.beginPath();
    wctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    wctx.fill();
  }
  const asphaltRoughnessWet = new THREE.CanvasTexture(wetCanvas);
  asphaltRoughnessWet.wrapS = THREE.RepeatWrapping;
  asphaltRoughnessWet.wrapT = THREE.RepeatWrapping;
  asphaltRoughnessWet.repeat.set(1, 5);

  // 4. Grass Terrain Texture
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gctx = grassCanvas.getContext('2d')!;
  gctx.fillStyle = '#2d6a32';
  gctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const g = 88 + Math.floor(Math.random() * 48);
    const r = Math.floor(g * 0.42);
    const b = Math.floor(g * 0.35);
    gctx.fillStyle = `rgb(${r},${g},${b})`;
    gctx.fillRect(x, y, 3, 3);
  }
  const grassMap = new THREE.CanvasTexture(grassCanvas);
  grassMap.colorSpace = THREE.SRGBColorSpace;
  grassMap.wrapS = THREE.RepeatWrapping;
  grassMap.wrapT = THREE.RepeatWrapping;
  grassMap.repeat.set(8, 12);
  grassMap.anisotropy = aniso;

  // 5. Snow Terrain Texture
  const snowCanvas = document.createElement('canvas');
  snowCanvas.width = 256;
  snowCanvas.height = 256;
  const sctx = snowCanvas.getContext('2d')!;
  sctx.fillStyle = '#dce7f2';
  sctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 215 + Math.floor(Math.random() * 40);
    sctx.fillStyle = `rgb(${v - 6},${v},${Math.min(255, v + 8)})`;
    sctx.fillRect(x, y, 3, 3);
  }
  const snowMap = new THREE.CanvasTexture(snowCanvas);
  snowMap.colorSpace = THREE.SRGBColorSpace;
  snowMap.wrapS = THREE.RepeatWrapping;
  snowMap.wrapT = THREE.RepeatWrapping;
  snowMap.repeat.set(8, 12);

  // 6. Soft Radial Contact Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shctx = shadowCanvas.getContext('2d')!;
  const shGrad = shctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  shGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.42)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shctx.fillStyle = shGrad;
  shctx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  // 7. Cloud Puff Sprite Texture
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 128;
  cloudCanvas.height = 128;
  const cctx = cloudCanvas.getContext('2d')!;
  const clGrad = cctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  clGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  clGrad.addColorStop(0.5, 'rgba(241, 245, 249, 0.55)');
  clGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  cctx.fillStyle = clGrad;
  cctx.fillRect(0, 0, 128, 128);
  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;

  // 8. Distant City Skyline Window Grid (for Night Mode)
  const winCanvas = document.createElement('canvas');
  winCanvas.width = 256;
  winCanvas.height = 256;
  const winCtx = winCanvas.getContext('2d')!;
  winCtx.fillStyle = '#090d16';
  winCtx.fillRect(0, 0, 256, 256);
  for (let row = 8; row < 248; row += 14) {
    for (let col = 6; col < 250; col += 12) {
      if (Math.random() > 0.42) {
        const warm = Math.random() > 0.35;
        winCtx.fillStyle = warm
          ? `rgba(253, 224, 71, ${0.45 + Math.random() * 0.5})`
          : `rgba(56, 189, 248, ${0.45 + Math.random() * 0.45})`;
        winCtx.fillRect(col, row, 6, 8);
      }
    }
  }
  const cityWindowMap = new THREE.CanvasTexture(winCanvas);
  cityWindowMap.colorSpace = THREE.SRGBColorSpace;
  cityWindowMap.wrapS = THREE.RepeatWrapping;
  cityWindowMap.wrapT = THREE.RepeatWrapping;

  // 9. Carbon Fiber Weave Texture
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 64;
  carbonCanvas.height = 64;
  const cbCtx = carbonCanvas.getContext('2d')!;
  cbCtx.fillStyle = '#111827';
  cbCtx.fillRect(0, 0, 64, 64);
  cbCtx.fillStyle = '#1f2937';
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if (((x + y) / 8) % 2 === 0) {
        cbCtx.fillRect(x, y, 6, 4);
      } else {
        cbCtx.fillRect(x + 2, y + 4, 6, 4);
      }
    }
  }
  const carbonMap = new THREE.CanvasTexture(carbonCanvas);
  carbonMap.colorSpace = THREE.SRGBColorSpace;
  carbonMap.wrapS = THREE.RepeatWrapping;
  carbonMap.wrapT = THREE.RepeatWrapping;
  carbonMap.repeat.set(4, 4);

  // 10. Coin Star Emblem Texture
  const coinCanvas = document.createElement('canvas');
  coinCanvas.width = 128;
  coinCanvas.height = 128;
  const coCtx = coinCanvas.getContext('2d')!;
  coCtx.fillStyle = '#f59e0b';
  coCtx.fillRect(0, 0, 128, 128);
  coCtx.strokeStyle = '#fef08a';
  coCtx.lineWidth = 8;
  coCtx.beginPath();
  coCtx.arc(64, 64, 52, 0, Math.PI * 2);
  coCtx.stroke();
  // Star emblem
  coCtx.fillStyle = '#fef9c3';
  coCtx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 30 : 13;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const x = 64 + Math.cos(a) * r;
    const y = 64 + Math.sin(a) * r;
    if (i === 0) coCtx.moveTo(x, y);
    else coCtx.lineTo(x, y);
  }
  coCtx.closePath();
  coCtx.fill();
  const coinFaceMap = new THREE.CanvasTexture(coinCanvas);
  coinFaceMap.colorSpace = THREE.SRGBColorSpace;

  // 11. Off-Road Dirt & Mud Trail Texture (3 rugged tire-rut lanes)
  const dirtCanvas = document.createElement('canvas');
  dirtCanvas.width = 512;
  dirtCanvas.height = 512;
  const dirtCtx = dirtCanvas.getContext('2d')!;
  dirtCtx.fillStyle = '#6b4c30';
  dirtCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.floor(Math.random() * 44) - 22;
    const r = Math.min(255, Math.max(0, 108 + shade));
    const g = Math.min(255, Math.max(0, 76 + Math.floor(shade * 0.75)));
    const b = Math.min(255, Math.max(0, 48 + Math.floor(shade * 0.5)));
    dirtCtx.fillStyle = `rgb(${r},${g},${b})`;
    dirtCtx.fillRect(x, y, 3, 3);
  }
  // 3 parallel mud/gravel driving tracks + soft mossy edges
  for (const cx of [98, 256, 414]) {
    const trackGrad = dirtCtx.createLinearGradient(cx - 46, 0, cx + 46, 0);
    trackGrad.addColorStop(0, 'rgba(65, 42, 24, 0)');
    trackGrad.addColorStop(0.25, 'rgba(54, 34, 18, 0.52)');
    trackGrad.addColorStop(0.5, 'rgba(130, 96, 62, 0.28)');
    trackGrad.addColorStop(0.75, 'rgba(54, 34, 18, 0.52)');
    trackGrad.addColorStop(1, 'rgba(65, 42, 24, 0)');
    dirtCtx.fillStyle = trackGrad;
    dirtCtx.fillRect(cx - 46, 0, 92, 512);
  }
  // Organic grass/mud border edges
  dirtCtx.fillStyle = 'rgba(52, 86, 36, 0.72)';
  dirtCtx.fillRect(0, 0, 18, 512);
  dirtCtx.fillRect(494, 0, 18, 512);
  const dirtRoadMap = new THREE.CanvasTexture(dirtCanvas);
  dirtRoadMap.colorSpace = THREE.SRGBColorSpace;
  dirtRoadMap.wrapS = THREE.ClampToEdgeWrapping;
  dirtRoadMap.wrapT = THREE.RepeatWrapping;
  dirtRoadMap.repeat.set(1, 5);
  dirtRoadMap.anisotropy = aniso;

  // 12. Off-Road Forest Floor Terrain Texture
  const forestCanvas = document.createElement('canvas');
  forestCanvas.width = 256;
  forestCanvas.height = 256;
  const fctx = forestCanvas.getContext('2d')!;
  fctx.fillStyle = '#365324';
  fctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const pick = Math.random();
    fctx.fillStyle =
      pick < 0.35 ? '#4d3b27' : pick < 0.7 ? '#3d6328' : '#2a471d';
    fctx.fillRect(x, y, 3, 3);
  }
  const forestFloorMap = new THREE.CanvasTexture(forestCanvas);
  forestFloorMap.colorSpace = THREE.SRGBColorSpace;
  forestFloorMap.wrapS = THREE.RepeatWrapping;
  forestFloorMap.wrapT = THREE.RepeatWrapping;
  forestFloorMap.repeat.set(8, 12);
  forestFloorMap.anisotropy = aniso;

  // 13. Construction Hazard Stripe Texture
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 128;
  hazCanvas.height = 128;
  const hctx = hazCanvas.getContext('2d')!;
  hctx.fillStyle = '#f97316';
  hctx.fillRect(0, 0, 128, 128);
  hctx.fillStyle = '#f8fafc';
  for (let i = -128; i < 256; i += 32) {
    hctx.beginPath();
    hctx.moveTo(i, 0);
    hctx.lineTo(i + 16, 0);
    hctx.lineTo(i + 144, 128);
    hctx.lineTo(i + 128, 128);
    hctx.closePath();
    hctx.fill();
  }
  const hazardStripeMap = new THREE.CanvasTexture(hazCanvas);
  hazardStripeMap.colorSpace = THREE.SRGBColorSpace;
  hazardStripeMap.wrapS = THREE.RepeatWrapping;
  hazardStripeMap.wrapT = THREE.RepeatWrapping;

  // 14. Timber / Wood Plank Texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 128;
  woodCanvas.height = 128;
  const wdCtx = woodCanvas.getContext('2d')!;
  wdCtx.fillStyle = '#8b5a2b';
  wdCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 6) {
    wdCtx.fillStyle = y % 12 === 0 ? '#6e4520' : '#9c6735';
    wdCtx.fillRect(0, y, 128, 3);
  }
  const woodPlankMap = new THREE.CanvasTexture(woodCanvas);
  woodPlankMap.colorSpace = THREE.SRGBColorSpace;
  woodPlankMap.wrapS = THREE.RepeatWrapping;
  woodPlankMap.wrapT = THREE.RepeatWrapping;

  return {
    asphaltMap,
    asphaltRoughnessDry,
    asphaltRoughnessWet,
    grassMap,
    snowMap,
    dirtRoadMap,
    forestFloorMap,
    hazardStripeMap,
    woodPlankMap,
    contactShadowMap,
    cloudMap,
    cityWindowMap,
    carbonMap,
    coinFaceMap,
    dispose: () => {
      asphaltMap.dispose();
      asphaltRoughnessDry.dispose();
      asphaltRoughnessWet.dispose();
      grassMap.dispose();
      snowMap.dispose();
      dirtRoadMap.dispose();
      forestFloorMap.dispose();
      hazardStripeMap.dispose();
      woodPlankMap.dispose();
      contactShadowMap.dispose();
      cloudMap.dispose();
      cityWindowMap.dispose();
      carbonMap.dispose();
      coinFaceMap.dispose();
    },
  };
}
