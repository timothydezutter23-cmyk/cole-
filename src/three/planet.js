// Construcción del planeta: relieve, colores por altura/latitud/pendiente,
// mar, nubes y atmósfera. Todo procedural, sin modelos externos.
import * as THREE from 'three';
import { rawHeight, makeNoise3, groundFactor, RELIEF } from '../lib/terrain.js';

const SEG_W = 320;
const SEG_H = 200;
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
  const { geo: src, dirs, raw, n } = base();
  const geo = src.clone();
  const pos = geo.attributes.position;
  for (let i = 0; i < n; i++) {
    const h = raw[i] - (0.23 + palette.sea);
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

// ---------- Nubes: mapa equirectangular con la misma proyección que el relieve ----------
const CLOUD_W = 1024;
const CLOUD_H = 512;
let cloudCache = null;
function cloudMap() {
  if (cloudCache) return cloudCache;
  const nz = makeNoise3(99);
  const wz = makeNoise3(512);
  const data = new Uint8Array(CLOUD_W * CLOUD_H * 4);
  for (let y = 0; y < CLOUD_H; y++) {
    const lat = ((y + 0.5) / CLOUD_H - 0.5) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    // Más nubes en latitudes medias y en el ecuador, menos en los trópicos.
    const bands = 0.08 * Math.cos(lat * 6) - 0.02;
    for (let x = 0; x < CLOUD_W; x++) {
      const lon = ((x + 0.5) / CLOUD_W - 0.5) * Math.PI * 2;
      const dx = cl * Math.cos(lon), dz = cl * Math.sin(lon);
      // Deformación para formas de remolino estiradas en horizontal.
      const w = wz(dx * 1.6, sl * 3.2, dz * 1.6) * 0.35;
      const px = dx * 2.6 + w, py = sl * 3.2 + w * 0.5, pz = dz * 2.6 - w;
      let v = 0, a = 0.5, f = 1;
      for (let o = 0; o < 5; o++) { v += a * nz(px * f, py * f, pz * f); a *= 0.5; f *= 2.1; }
      const t = Math.max(0, Math.min(1, (v + bands - 0.02) / 0.32));
      const i = (y * CLOUD_W + x) * 4;
      data[i] = Math.round(t * t * (3 - 2 * t) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, CLOUD_W, CLOUD_H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cloudCache = tex;
  return tex;
}

const GLSL_EQUIRECT = /* glsl */ `
// Muestreo bicúbico (B-spline) con 4 lecturas: sin bloques ni escalones.
vec4 cubicW(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v; vec4 s = n * n * n;
  float x = s.x; float y = s.y - 4.0 * s.x; float z = s.z - 4.0 * s.y + 6.0 * s.x; float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}
vec4 bicubic(sampler2D tex, vec2 uv, vec2 size) {
  vec2 inv = 1.0 / size; uv = uv * size - 0.5; vec2 f = fract(uv); uv -= f;
  vec4 xc = cubicW(f.x); vec4 yc = cubicW(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 o = (c + vec4(xc.yw, yc.yw) / s) * inv.xxyy;
  vec4 s0 = texture2D(tex, o.xz), s1 = texture2D(tex, o.yz), s2 = texture2D(tex, o.xw), s3 = texture2D(tex, o.yw);
  float sx = s.x / (s.x + s.y); float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}
vec2 equirect(vec3 d) { return vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5); }
vec3 rotY(vec3 d, float a) { float c = cos(a), s = sin(a); return vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z); }
`;

const GLSL_COMMON = /* glsl */ `
uniform sampler2D uHeight;
uniform sampler2D uClouds;
uniform float uCloudRot, uCloudShadow;
uniform float uSea, uDryBand, uCapBase, uSnowBase, uRelief, uBump;
uniform vec4 uFactors; // color, water, air, life
${PAL_KEYS.map((k) => `uniform vec3 uC_${k};`).join('\n')}
varying vec3 vDir;
varying vec3 vNM0; varying vec3 vNM1; varying vec3 vNM2;
${GLSL_EQUIRECT}
float sm(float a, float b, float v) { float t = clamp((v - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// Altura sobre el nivel del mar (sin unidades) con detalle fino por píxel.
float heightAt(vec3 d) {
  float fine = (vnoise(d * 48.0) - 0.5) * 0.022 + (vnoise(d * 140.0) - 0.5) * 0.009;
  return bicubic(uHeight, equirect(d), vec2(${MAP_W}.0, ${MAP_H}.0)).r - (0.23 + uSea) + fine;
}
// Elevación real (fracción del radio), igual que el relieve de la malla.
float elevAt(vec3 d) { float h = heightAt(d); return h > 0.0 ? pow(h, 1.25) * uRelief : 0.0; }
`;

const GLSL_COLOR = /* glsl */ `
  vec3 d = normalize(vDir);
  vec2 hv = bicubic(uHeight, equirect(d), vec2(${MAP_W}.0, ${MAP_H}.0)).rg;
  float h = heightAt(d);
  float v = hv.g;
  float lat = abs(d.y);
  float grain = vnoise(d * 220.0) - 0.5;

  // Pendiente a partir del relieve por píxel (también se usa para la luz).
  vec3 tA = normalize(cross(abs(d.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), d));
  vec3 tB = cross(d, tA);
  float eps = 0.005;
  float e0 = elevAt(d);
  float gA = (elevAt(normalize(d + tA * eps)) - e0) / eps;
  float gB = (elevAt(normalize(d + tB * eps)) - e0) / eps;
  float steep = length(vec2(gA, gB)) / max(uRelief, 0.0001);

  vec3 bareRock = vec3(0.157, 0.133, 0.110);
  vec3 bareDry = vec3(0.271, 0.208, 0.125);
  vec3 col;
  float waterMask = 0.0;
  float waterLine = mix(-0.3, 0.0, uFactors.y);
  // Temperatura: más frío hacia los polos y en altura.
  float cold = sm(0.5, 0.82, lat + max(h, 0.0) * 0.35 + v * 0.05);
  if (h < waterLine && uFactors.y > 0.001) {
    float depth = waterLine - h;
    col = mix(uC_shallow, uC_deep, sm(0.0, 0.2, depth));
    col = mix(col, uC_foam, (1.0 - sm(0.0, 0.01, depth)) * 0.45);
    col *= 1.0 - cold * 0.25;
    waterMask = 1.0;
  } else if (h <= 0.0) {
    col = mix(bareRock * 0.9, bareRock * 0.45, sm(0.0, 0.3, -h));
  } else {
    float snowLine = uSnowBase - v * 0.08 - cold * 0.45;
    float dryness = sm(0.15, -0.05, lat - uDryBand * 0.55 + v * 0.18) * (1.0 - cold);
    float forestness = sm(-0.15, 0.3, v + h * 0.4 + grain * 0.2);
    float rocky = max(sm(0.6, 0.85, h), sm(7.0, 15.0, steep));
    vec3 tundra = mix(uC_rock, uC_dry, 0.35) * 0.95;
    vec3 full = mix(uC_grass, uC_forest, forestness);
    full = mix(full, uC_dry, dryness);
    full = mix(full, tundra, cold * 0.85);
    full = mix(full, uC_sand, sm(0.025, 0.0, h) * (1.0 - cold));
    full = mix(full, uC_rock, rocky);
    full = mix(full, uC_snow, sm(snowLine, snowLine + 0.06, h) * (1.0 - sm(12.0, 20.0, steep) * 0.5));
    vec3 bare = mix(bareDry, uC_dry, 0.35 * dryness);
    bare = mix(bare, bareRock, max(sm(0.25, 0.6, h), sm(5.0, 12.0, steep)));
    bare = mix(bare, uC_sand, sm(0.025, 0.0, h) * 0.6);
    bare = mix(bare, uC_snow, sm(snowLine, snowLine + 0.06, h) * uFactors.z);
    col = mix(bare, full, uFactors.w);
  }
  // Hielo polar plano, de borde irregular, sobre tierra y mar.
  float capStart = uCapBase + v * 0.07 + grain * 0.02;
  float ice = sm(capStart, capStart + 0.025, lat) * max(uFactors.y, 0.4);
  col = mix(col, uC_ice, ice);
  waterMask *= 1.0 - ice;
  if (waterMask < 0.5) col *= 1.0 + grain * 0.1 + v * 0.06;
  // Sombra de las nubes sobre el suelo.
  float cloudHere = texture2D(uClouds, equirect(rotY(d, uCloudRot))).r;
  col *= 1.0 - cloudHere * uCloudShadow;
  vec3 dead = mix(vec3(0.0098, 0.0098, 0.0116), vec3(0.023, 0.022, 0.021), clamp(max(h, 0.0) * 1.5, 0.0, 1.0));
  col = mix(dead, col, uFactors.x);
  vec4 diffuseColor = vec4(col, opacity);
`;

const GLSL_NORMAL = /* glsl */ `
  #include <normal_fragment_maps>
  {
    // Relieve sombreado por píxel: la malla da la forma, esto da el detalle.
    mat3 nm = mat3(vNM0, vNM1, vNM2);
    vec3 nObj = normalize(d - (gA * tA + gB * tB) * uBump * (1.0 - waterMask));
    normal = normalize(nm * nObj);
  }
`;

// Material del terreno: iluminación estándar, color y relieve calculados por píxel.
export function terrainMaterial(cloudRot = { value: 0 }) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  const uniforms = {
    uHeight: { value: heightMap() },
    uClouds: { value: cloudMap() },
    uCloudRot: cloudRot,
    uCloudShadow: { value: 0 },
    uSea: { value: 0 }, uDryBand: { value: 0 }, uCapBase: { value: 0.86 }, uSnowBase: { value: 0.78 },
    uRelief: { value: RELIEF }, uBump: { value: 1.3 },
    uFactors: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
  PAL_KEYS.forEach((k) => { uniforms[`uC_${k}`] = { value: new THREE.Color() }; });
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDir;\nvarying vec3 vNM0; varying vec3 vNM1; varying vec3 vNM2;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = position;\nvNM0 = normalMatrix[0]; vNM1 = normalMatrix[1]; vNM2 = normalMatrix[2];');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', GLSL_COLOR)
      .replace('#include <normal_fragment_maps>', GLSL_NORMAL)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.22, waterMask);');
  };
  return mat;
}

// Ajusta piel y etapa del mundo sin reconstruir nada.
export function setTerrainLook(mat, palette, factors) {
  const u = mat.userData.uniforms;
  PAL_KEYS.forEach((k) => u[`uC_${k}`].value.set(palette[k]));
  u.uSea.value = palette.sea;
  u.uDryBand.value = palette.dryBand;
  u.uCapBase.value = palette.cold ? 0.74 : 0.88;
  u.uSnowBase.value = palette.cold ? 0.45 : 0.8;
  u.uFactors.value.set(factors.color, factors.water, factors.air, factors.life);
  u.uCloudShadow.value = 0.35 * factors.air * palette.clouds;
}

// Capa de nubes (o de niebla) que gira alrededor del eje, con luz real.
function cloudLayer(radius, rot, color, opacity) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, transparent: true, opacity, depthWrite: false });
  const uniforms = { uClouds: { value: cloudMap() }, uCloudRot: rot };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDir;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D uClouds;\nuniform float uCloudRot;\nvarying vec3 vDir;\n${GLSL_EQUIRECT}
float chash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(chash(i), chash(i + vec3(1,0,0)), f.x), mix(chash(i + vec3(0,1,0)), chash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(chash(i + vec3(0,0,1)), chash(i + vec3(1,0,1)), f.x), mix(chash(i + vec3(0,1,1)), chash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec3 cd = rotY(normalize(vDir), uCloudRot);
         float ca = bicubic(uClouds, equirect(cd), vec2(${CLOUD_W}.0, ${CLOUD_H}.0)).r;
         // Detalle fino por píxel para que el borde de la nube sea nítido de cerca.
         float cdet = (cnoise(cd * 70.0) - 0.5) * 0.5 + (cnoise(cd * 190.0) - 0.5) * 0.25;
         ca = smoothstep(0.18, 0.9, ca + cdet * ca * (1.0 - ca) * 2.0);
         vec4 diffuseColor = vec4(diffuse, opacity * ca);`);
  };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 80), mat);
  return mesh;
}

export function buildClouds(rot) {
  const mesh = cloudLayer(1.032, rot, '#ffffff', 0.9);
  mesh.renderOrder = 3;
  return mesh;
}

// Atmósfera: halo fino que brilla en el lado de día y se vuelve cálido en el
// atardecer, más una neblina azul sobre el borde del planeta.
export function buildAtmosphere(color) {
  const uniforms = { uColor: { value: c(color) }, uStrength: { value: 1 }, uSun: { value: new THREE.Vector3(-0.7, 0.35, 0.6).normalize() } };
  const vertexShader = `
    varying vec3 vNormal; varying vec3 vView; varying vec3 vWorldN;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vWorldN = normalize(mat3(modelMatrix) * normal);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const common = `
    uniform vec3 uColor; uniform float uStrength; uniform vec3 uSun;
    varying vec3 vNormal; varying vec3 vView; varying vec3 vWorldN;
    vec3 skyTint(float sd) { return mix(vec3(1.0, 0.5, 0.25), uColor, smoothstep(-0.05, 0.45, sd)); }`;
  const RS = 1.07;
  const limb = Math.sqrt(1 - 1 / (RS * RS)).toFixed(4);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(RS, 96, 64), new THREE.ShaderMaterial({
    uniforms, vertexShader,
    fragmentShader: `${common}
      void main(){
        float k = clamp(abs(dot(vNormal, vView)) / ${limb}, 0.0, 1.0);
        float sd = dot(vWorldN, uSun);
        float day = smoothstep(-0.35, 0.4, sd);
        float a = pow(k, 3.5) * day * 0.9 * uStrength;
        gl_FragColor = vec4(skyTint(sd) * a, a);
      }`,
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const haze = new THREE.Mesh(new THREE.SphereGeometry(1.034, 96, 64), new THREE.ShaderMaterial({
    uniforms, vertexShader,
    fragmentShader: `${common}
      void main(){
        float f = 1.0 - max(dot(vNormal, vView), 0.0);
        float sd = dot(vWorldN, uSun);
        float day = smoothstep(-0.2, 0.5, sd);
        float a = (pow(f, 3.0) * 0.75 + 0.03) * day * uStrength;
        gl_FragColor = vec4(skyTint(sd) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const group = new THREE.Group();
  group.add(halo, haze);
  halo.renderOrder = 4;
  haze.renderOrder = 4;
  group.userData.uniforms = uniforms;
  return group;
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
        float a = fade * (0.2 + 0.8 * wave * wave2) * 0.14 * uStrength;
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

export function buildFog(rot) {
  const mesh = cloudLayer(1.012, rot, '#dfe4e8', 0.45);
  mesh.renderOrder = 2;
  return mesh;
}
