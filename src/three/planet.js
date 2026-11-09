// Construcción del planeta: relieve, colores por altura/latitud/pendiente,
// océano, nubes y atmósfera. Todo procedural, sin modelos externos.
import * as THREE from 'three';
import { rawHeight, makeNoise3, groundFactor } from '../lib/terrain.js';

const SEG_W = 200;
const SEG_H = 140;

let baseCache = null;
const tint = makeNoise3(4242);

// Las alturas solo dependen de la dirección: se calculan una vez.
function base() {
  if (baseCache) return baseCache;
  const geo = new THREE.SphereGeometry(1, SEG_W, SEG_H);
  const pos = geo.attributes.position;
  const n = pos.count;
  const dirs = new Float32Array(n * 3);
  const raw = new Float32Array(n);
  const variation = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const l = Math.hypot(x, y, z) || 1;
    dirs[i * 3] = x / l; dirs[i * 3 + 1] = y / l; dirs[i * 3 + 2] = z / l;
    raw[i] = rawHeight(x / l, y / l, z / l);
    variation[i] = tint(x * 4.1, y * 4.1, z * 4.1) * 0.6 + tint(x * 13, y * 13, z * 13) * 0.4;
  }
  baseCache = { geo, dirs, raw, variation, n };
  return baseCache;
}

const c = (hex) => new THREE.Color(hex);
const DEAD = c('#19191b');
const DEAD_HI = c('#2a2928');
const BARE_ROCK = c('#6e655c');
const BARE_DRY = c('#8e7c63');

function smooth(a, b, v) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function buildTerrain(palette) {
  const { geo: src, dirs, raw, variation, n } = base();
  const geo = src.clone();
  const pos = geo.attributes.position;
  const heights = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let h = raw[i] - (0.23 + palette.sea);
    const lat = Math.abs(dirs[i * 3 + 1]);
    // Casquetes polares: hielo que sobresale del mar.
    const capStart = (palette.cold ? 0.72 : 0.86) + variation[i] * 0.06;
    if (lat > capStart) {
      const k = smooth(capStart, capStart + 0.05, lat);
      h = h * (1 - k) + Math.max(h, 0.003 + (lat - capStart) * 0.12) * k;
    }
    heights[i] = h;
    const r = groundFactor(h);
    pos.setXYZ(i, dirs[i * 3] * r, dirs[i * 3 + 1] * r, dirs[i * 3 + 2] * r);
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.userData.heights = heights;
  return geo;
}

// Pinta los colores según la piel y los factores del mundo (color, agua, aire, vida).
export function paintTerrain(geo, palette, factors) {
  const { dirs, variation, n } = base();
  const heights = geo.userData.heights;
  const normals = geo.attributes.normal;
  const col = geo.attributes.color;
  const P = {};
  for (const k of ['deep', 'shallow', 'sand', 'grass', 'forest', 'dry', 'rock', 'snow', 'ice']) P[k] = c(palette[k]);
  const full = new THREE.Color();
  const bare = new THREE.Color();
  const out = new THREE.Color();
  const tmp = new THREE.Color();
  const capBase = palette.cold ? 0.72 : 0.86;
  for (let i = 0; i < n; i++) {
    const h = heights[i];
    const dx = dirs[i * 3], dy = dirs[i * 3 + 1], dz = dirs[i * 3 + 2];
    const lat = Math.abs(dy);
    const v = variation[i];
    const slope = 1 - (normals.getX(i) * dx + normals.getY(i) * dy + normals.getZ(i) * dz);

    if (h <= 0) {
      // Fondo marino: turquesa cerca de la costa, oscuro en lo profundo.
      full.copy(P.shallow).lerp(P.deep, smooth(0, 0.28, -h));
      bare.copy(BARE_ROCK).multiplyScalar(0.55 - Math.min(0.3, -h));
      // Sin agua todavía, la cuenca es roca; con agua, fondo de color.
      tmp.copy(bare).lerp(full, factors.water);
      full.copy(tmp);
      bare.copy(BARE_ROCK).multiplyScalar(0.5);
    } else {
      const elev = h;
      const snowLine = (palette.cold ? 0.45 : 0.78) - v * 0.08;
      // Banda seca alrededor del ecuador según la piel.
      const dryness = smooth(0.15, -0.05, lat - palette.dryBand * 0.55 + v * 0.18);
      const forestness = smooth(-0.1, 0.35, v + elev * 0.6);
      // Color pleno (con vida)
      full.copy(P.grass).lerp(P.forest, forestness);
      full.lerp(P.dry, dryness);
      full.lerp(P.sand, smooth(0.035, 0.0, elev));
      full.lerp(P.rock, Math.max(smooth(0.5, 0.72, elev), smooth(0.05, 0.13, slope)));
      full.lerp(P.snow, smooth(snowLine, snowLine + 0.08, elev));
      // Color desnudo (roca y tierra seca, antes de la vida)
      bare.copy(BARE_DRY).lerp(P.dry, 0.35 * dryness).lerp(BARE_ROCK, Math.max(smooth(0.25, 0.6, elev), smooth(0.04, 0.12, slope)));
      bare.lerp(P.sand, smooth(0.03, 0.0, elev) * 0.6);
      bare.lerp(P.snow, smooth(snowLine, snowLine + 0.08, elev) * factors.air);
      tmp.copy(bare).lerp(full, factors.life);
      full.copy(tmp);
      bare.copy(BARE_ROCK);
    }
    const capStart = capBase + v * 0.06;
    if (lat > capStart) full.lerp(P.ice, smooth(capStart, capStart + 0.04, lat) * Math.max(factors.water, 0.4));

    // Mundo apagado → color.
    const shade = 1 + v * 0.08;
    out.copy(DEAD).lerp(DEAD_HI, Math.max(0, h) * 1.5).lerp(full, factors.color).multiplyScalar(shade);
    col.setXYZ(i, out.r, out.g, out.b);
  }
  col.needsUpdate = true;
}

export function terrainMaterial() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: false });
}

export function buildOcean(palette) {
  const geo = new THREE.SphereGeometry(1, 120, 80);
  const mat = new THREE.MeshPhongMaterial({
    color: c(palette.deep), transparent: true, opacity: 0.55, shininess: 90,
    specular: new THREE.Color('#9fb8c8'), depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  return mesh;
}

// Textura de nubes generada con ruido (equirectangular).
let cloudTexCache = null;
export function cloudTexture() {
  if (cloudTexCache) return cloudTexCache;
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const nz = makeNoise3(99);
  for (let y = 0; y < H; y++) {
    const lat = (y / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2;
      const dx = Math.sin(lat) * Math.cos(lon), dy = Math.cos(lat), dz = Math.sin(lat) * Math.sin(lon);
      let v = 0, a = 0.5, f = 2.2;
      for (let o = 0; o < 5; o++) { v += a * nz(dx * f, dy * f * 1.6, dz * f); a *= 0.5; f *= 2; }
      const alpha = Math.max(0, Math.min(1, (v - 0.05) * 2.6));
      const idx = (y * W + x) * 4;
      img.data[idx] = 255; img.data[idx + 1] = 255; img.data[idx + 2] = 255;
      img.data[idx + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  cloudTexCache = tex;
  return tex;
}

export function buildClouds() {
  const mat = new THREE.MeshLambertMaterial({ map: cloudTexture(), transparent: true, opacity: 0.5, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.075, 96, 64), mat);
  mesh.renderOrder = 3;
  return mesh;
}

export function buildAtmosphere(color) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: c(color) }, uStrength: { value: 1 } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vView;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength;
      varying vec3 vNormal; varying vec3 vView;
      void main(){
        float f = 1.0 - abs(dot(vNormal, vView));
        float a = pow(f, 3.0) * uStrength;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 48), mat);
  mesh.renderOrder = 4;
  return mesh;
}

export function buildStars(count) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const d = 30 + Math.random() * 30;
    pos[i * 3] = r * Math.cos(t) * d; pos[i * 3 + 1] = u * d; pos[i * 3 + 2] = r * Math.sin(t) * d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0.8 }));
}

export function buildRings() {
  const geo = new THREE.RingGeometry(1.42, 1.62, 160, 1);
  const mat = new THREE.MeshBasicMaterial({ color: '#f3e6c8', transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2.25;
  mesh.rotation.y = 0.2;
  const inner = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.36, 160, 1), mat.clone());
  inner.material.opacity = 0.2;
  mesh.add(inner);
  return mesh;
}

export function buildAurora(color) {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: c(color) }, uStrength: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
      void main(){
        float wave = sin(vUv.x * 40.0 + uTime * 0.6) * 0.5 + 0.5;
        float wave2 = sin(vUv.x * 17.0 - uTime * 0.4) * 0.5 + 0.5;
        float fade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
        float a = fade * (0.2 + 0.8 * wave * wave2) * 0.3 * uStrength;
        vec3 col = mix(uColor, vec3(0.55, 1.0, 0.8), vUv.y * 0.6);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  [1, -1].forEach((s) => {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.2, 96, 1, true), mat);
    cyl.position.y = s * 1.0;
    if (s < 0) cyl.rotation.x = Math.PI;
    group.add(cyl);
  });
  group.userData.material = mat;
  return group;
}

// Lluvia suave: gotas que caen en sentido radial.
export function buildRain(count = 500) {
  const pos = new Float32Array(count * 3);
  const dirs = new Float32Array(count * 3);
  const rad = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    dirs[i * 3] = r * Math.cos(t); dirs[i * 3 + 1] = u; dirs[i * 3 + 2] = r * Math.sin(t);
    rad[i] = 1.02 + Math.random() * 0.1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#cfe3f2', size: 0.012, transparent: true, opacity: 0.7, depthWrite: false }));
  pts.userData.tick = (dt) => {
    for (let i = 0; i < count; i++) {
      rad[i] -= dt * 0.06;
      if (rad[i] < 1.005) rad[i] = 1.12;
      pos[i * 3] = dirs[i * 3] * rad[i]; pos[i * 3 + 1] = dirs[i * 3 + 1] * rad[i]; pos[i * 3 + 2] = dirs[i * 3 + 2] * rad[i];
    }
    geo.attributes.position.needsUpdate = true;
  };
  pts.userData.tick(0);
  return pts;
}

export function buildFog() {
  const mat = new THREE.MeshLambertMaterial({ map: cloudTexture(), color: '#e9edf0', transparent: true, opacity: 0.2, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.03, 96, 64), mat);
  mesh.rotation.z = 1.2;
  mesh.renderOrder = 2;
  return mesh;
}
