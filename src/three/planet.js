// Construcción del planeta: relieve, colores por altura/latitud/pendiente,
// mar, nubes y atmósfera. Todo procedural, sin modelos externos.
import * as THREE from 'three';
import { rawHeight, makeNoise3, groundFactor } from '../lib/terrain.js';

const SEG_W = 220;
const SEG_H = 150;
// Mapa de alturas en alta resolución: el color se calcula por píxel a partir
// de él, así las costas salen curvas y limpias en vez de en escalera.
const MAP_W = 768;
const MAP_H = 384;

let baseCache = null;
let mapCache = null;
const tint = makeNoise3(4242);
const variationAt = (x, y, z) => tint(x * 4.1, y * 4.1, z * 4.1) * 0.6 + tint(x * 13, y * 13, z * 13) * 0.4;

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
    variation[i] = variationAt(x / l, y / l, z / l);
  }
  baseCache = { geo, dirs, raw, variation, n };
  return baseCache;
}

// Textura equirectangular (R = altura, G = variación) en media precisión,
// que la GPU puede interpolar suavemente.
function heightMap() {
  if (mapCache) return mapCache;
  const data = new Uint16Array(MAP_W * MAP_H * 4);
  for (let y = 0; y < MAP_H; y++) {
    const lat = ((y + 0.5) / MAP_H - 0.5) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < MAP_W; x++) {
      const lon = ((x + 0.5) / MAP_W - 0.5) * Math.PI * 2;
      const dx = cl * Math.cos(lon), dz = cl * Math.sin(lon);
      const i = (y * MAP_W + x) * 4;
      data[i] = THREE.DataUtils.toHalfFloat(rawHeight(dx, sl, dz));
      data[i + 1] = THREE.DataUtils.toHalfFloat(variationAt(dx, sl, dz));
      data[i + 3] = THREE.DataUtils.toHalfFloat(1);
    }
  }
  const tex = new THREE.DataTexture(data, MAP_W, MAP_H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  mapCache = tex;
  return tex;
}

function smooth(a, b, v) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function buildTerrain(palette) {
  const { geo: src, dirs, raw, variation, n } = base();
  const geo = src.clone();
  const pos = geo.attributes.position;
  for (let i = 0; i < n; i++) {
    let h = raw[i] - (0.23 + palette.sea);
    const lat = Math.abs(dirs[i * 3 + 1]);
    // Casquetes polares: hielo que sobresale del mar.
    const capStart = (palette.cold ? 0.72 : 0.86) + variation[i] * 0.06;
    if (lat > capStart) {
      const k = smooth(capStart, capStart + 0.05, lat);
      h = h * (1 - k) + Math.max(h, 0.003 + (lat - capStart) * 0.12) * k;
    }
    const r = groundFactor(h);
    pos.setXYZ(i, dirs[i * 3] * r, dirs[i * 3 + 1] * r, dirs[i * 3 + 2] * r);
  }
  geo.computeVertexNormals();
  // Pendiente por vértice (para la roca en laderas).
  const normals = geo.attributes.normal;
  const slope = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    slope[i] = 1 - (normals.getX(i) * dirs[i * 3] + normals.getY(i) * dirs[i * 3 + 1] + normals.getZ(i) * dirs[i * 3 + 2]);
  }
  geo.setAttribute('aSlope', new THREE.BufferAttribute(slope, 1));
  return geo;
}

const c = (hex) => new THREE.Color(hex);

const PAL_KEYS = ['deep', 'shallow', 'foam', 'sand', 'grass', 'forest', 'dry', 'rock', 'snow', 'ice'];

const GLSL_COMMON = /* glsl */ `
uniform sampler2D uHeight;
uniform float uSea, uDryBand, uCapBase, uSnowBase;
uniform vec4 uFactors; // color, water, air, life
${PAL_KEYS.map((k) => `uniform vec3 uC_${k};`).join('\n')}
varying vec3 vDir;
varying float vSlope;
float sm(float a, float b, float v) { float t = clamp((v - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

const GLSL_COLOR = /* glsl */ `
  vec3 d = normalize(vDir);
  vec2 huv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);
  vec2 hv = texture2D(uHeight, huv).rg;
  // Detalle fino por píxel: rompe la interpolación y da textura al suelo.
  float fine = (vnoise(d * 48.0) - 0.5) * 0.022 + (vnoise(d * 140.0) - 0.5) * 0.009;
  float h = hv.r - (0.23 + uSea) + fine;
  float v = hv.g;
  float lat = abs(d.y);
  float capStart = uCapBase + v * 0.06;
  float capK = sm(capStart, capStart + 0.05, lat);
  h = mix(h, max(h, 0.003 + (lat - capStart) * 0.12), capK);
  float grain = vnoise(d * 220.0) - 0.5;

  vec3 bareRock = vec3(0.157, 0.133, 0.110);
  vec3 bareDry = vec3(0.271, 0.208, 0.125);
  vec3 col;
  float waterMask = 0.0;
  // El mar sube con el factor de agua: primero cuencas secas, luego mares llenos.
  float waterLine = mix(-0.3, 0.0, uFactors.y);
  if (h < waterLine && uFactors.y > 0.001) {
    float depth = waterLine - h;
    col = mix(uC_shallow, uC_deep, sm(0.0, 0.22, depth));
    col = mix(col, uC_foam, (1.0 - sm(0.0, 0.012, depth)) * 0.55);
    waterMask = 1.0;
  } else if (h <= 0.0) {
    // Cuenca seca (antes del agua) o fondo recién descubierto.
    col = mix(bareRock * 0.9, bareRock * 0.45, sm(0.0, 0.3, -h));
  } else {
    float snowLine = uSnowBase - v * 0.08;
    float dryness = sm(0.15, -0.05, lat - uDryBand * 0.55 + v * 0.18);
    float forestness = sm(-0.1, 0.35, v + h * 0.6 + grain * 0.15);
    float slopeRock = sm(0.05, 0.13, vSlope);
    vec3 full = mix(uC_grass, uC_forest, forestness);
    full = mix(full, uC_dry, dryness);
    full = mix(full, uC_sand, sm(0.03, 0.0, h));
    full = mix(full, uC_rock, max(sm(0.5, 0.72, h), slopeRock));
    full = mix(full, uC_snow, sm(snowLine, snowLine + 0.06, h));
    vec3 bare = mix(bareDry, uC_dry, 0.35 * dryness);
    bare = mix(bare, bareRock, max(sm(0.25, 0.6, h), sm(0.04, 0.12, vSlope)));
    bare = mix(bare, uC_sand, sm(0.03, 0.0, h) * 0.6);
    bare = mix(bare, uC_snow, sm(snowLine, snowLine + 0.06, h) * uFactors.z);
    col = mix(bare, full, uFactors.w);
  }
  col = mix(col, uC_ice, sm(capStart, capStart + 0.04, lat) * max(uFactors.y, 0.4));
  if (waterMask < 0.5) col *= 1.0 + grain * 0.12 + v * 0.08;
  // Mundo apagado: casi negro, con un poco de relieve.
  vec3 dead = mix(vec3(0.0098, 0.0098, 0.0116), vec3(0.023, 0.022, 0.021), clamp(max(h, 0.0) * 1.5, 0.0, 1.0));
  col = mix(dead, col, uFactors.x);
  vec4 diffuseColor = vec4(col, opacity);
`;

// Material del terreno: iluminación estándar, color calculado por píxel.
export function terrainMaterial(palette) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  const uniforms = {
    uHeight: { value: heightMap() },
    uSea: { value: 0 }, uDryBand: { value: 0 }, uCapBase: { value: 0.86 }, uSnowBase: { value: 0.78 },
    uFactors: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
  PAL_KEYS.forEach((k) => { uniforms[`uC_${k}`] = { value: new THREE.Color() }; });
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSlope;\nvarying vec3 vDir;\nvarying float vSlope;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = position;\nvSlope = aSlope;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', GLSL_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, waterMask);');
  };
  if (palette) setTerrainLook(mat, palette, { color: 0, water: 0, air: 0, life: 0 });
  return mat;
}

// Ajusta piel y etapa del mundo sin reconstruir nada.
export function setTerrainLook(mat, palette, factors) {
  const u = mat.userData.uniforms;
  // Los colores de la piel están en sRGB; el shader trabaja en lineal.
  PAL_KEYS.forEach((k) => u[`uC_${k}`].value.set(palette[k]));
  u.uSea.value = palette.sea;
  u.uDryBand.value = palette.dryBand;
  u.uCapBase.value = palette.cold ? 0.72 : 0.86;
  u.uSnowBase.value = palette.cold ? 0.45 : 0.78;
  u.uFactors.value.set(factors.color, factors.water, factors.air, factors.life);
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
