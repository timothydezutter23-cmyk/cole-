// Piezas del mundo, generadas por código con aspecto natural: formas suaves
// deformadas con ruido, color variado por vértice, sombra de contacto en el
// suelo y luces que se encienden en el lado de noche del planeta.
// Cada pieza mide ~1 unidad de alto con la base en y=0; el planeta la escala.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeNoise3 } from '../lib/terrain.js';

const noise = makeNoise3(8080);

// ---------- Utilidades ----------

// Generador pseudoaleatorio con semilla: cada pieza colocada es un poco distinta.
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export function seedFrom(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const shared = new Map();
// Material compartido con color por vértice (el color real va en la geometría).
function vmat(opts = {}) {
  const key = JSON.stringify(opts);
  if (!shared.has(key)) shared.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, ...opts }));
  return shared.get(key);
}

// Pinta la geometría: color base con variación por ruido y oclusión hacia la base.
function paint(geo, hex, { vary = 0.12, freq = 3, ao = 0.35, seed = 0, top = null, topAmt = 0 } = {}) {
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const base = new THREE.Color(hex);
  const topC = top ? new THREE.Color(top) : null;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const span = Math.max(1e-4, max.y - min.y);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = noise(x * freq + seed, y * freq, z * freq - seed);
    const k = (y - min.y) / span;
    c.copy(base);
    if (topC) c.lerp(topC, Math.max(0, Math.min(1, (k - 0.5) * 2)) * topAmt);
    c.multiplyScalar((1 + n * vary) * (1 - ao + ao * Math.min(1, k * 1.4 + 0.15)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Geometría indexada (para sombreado suave) a partir de cualquier primitiva.
function smoothGeo(geo) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const g = mergeVertices(geo, 1e-4);
  g.computeVertexNormals();
  return g;
}

// Deforma radialmente con ruido: copas, rocas y matorrales irregulares.
function lumpy(radius, { detail = 3, amp = 0.25, freq = 2.2, seed = 0, squash = 1 } = {}) {
  const g = smoothGeo(new THREE.IcosahedronGeometry(radius, detail));
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = v.clone().normalize();
    const n = noise(d.x * freq + seed, d.y * freq + seed * 0.7, d.z * freq - seed) * 0.7
      + noise(d.x * freq * 2.7 - seed, d.y * freq * 2.7, d.z * freq * 2.7 + seed) * 0.3;
    v.multiplyScalar(1 + n * amp);
    v.y *= squash;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

// Tronco curvo y ahusado a lo largo de una curva.
function trunkTube(points, r0, r1, color, seed = 0, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const tubular = 12;
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  // Ajusta el radio a lo largo del tubo (ahusado).
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, center);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(center).multiplyScalar(r).add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  paint(geo, color, { vary: 0.25, freq: 14, ao: 0.3, seed });
  return geo;
}

// Revolución de un perfil (cuerpos de animales, torres, cúpulas).
function lathe(profile, segments = 24, steps = 1) {
  // Subdivide el perfil para poder pintar franjas y degradados a lo alto.
  const pts = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, y0] = profile[i], [x1, y1] = profile[i + 1];
    for (let k = 0; k < steps; k++) pts.push(new THREE.Vector2(x0 + (x1 - x0) * (k / steps), y0 + (y1 - y0) * (k / steps)));
  }
  pts.push(new THREE.Vector2(...profile[profile.length - 1]));
  return new THREE.LatheGeometry(pts, segments);
}

// ---------- Luces de noche ----------

let haloTex = null;
function haloTexture() {
  if (haloTex) return haloTex;
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,240,200,1)');
  g.addColorStop(0.25, 'rgba(255,214,150,0.55)');
  g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  haloTex = new THREE.CanvasTexture(cv);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  return haloTex;
}

// Material que brilla: tenue de día, encendido de noche.
function lightMat(group, color, { day = 0.15, night = 2.2, opts = {} } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.5, ...opts });
  (group.userData.glows ||= []).push({ mat: m, day, night });
  return m;
}

// Halo de luz que aparece al anochecer alrededor de una ventana o farol.
function halo(group, x, y, z, size = 0.5, color = '#ffd9a0') {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.position.set(x, y, z);
  sp.scale.setScalar(size);
  group.add(sp);
  (group.userData.halos ||= []).push(sp);
  return sp;
}

// Sombra de contacto: oscurece el suelo bajo la pieza para que no "flote".
let shadowTex = null;
function contactShadow(radius = 0.5, strength = 0.55) {
  if (!shadowTex) {
    const s = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    shadowTex = new THREE.CanvasTexture(cv);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({
    map: shadowTex, transparent: true, opacity: strength, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  m.renderOrder = 1;
  m.userData.isShadow = true;
  return m;
}

// ---------- Piezas ----------

function canopy(g, r, center, count, radius, colors, seed) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.8;
    const dist = i === 0 ? 0 : radius * (0.45 + r() * 0.4);
    const size = radius * (i === 0 ? 0.85 : 0.55 + r() * 0.25);
    const geo = lumpy(size, { detail: 2, amp: 0.28, freq: 2.6, seed: seed + i * 3.1, squash: 0.85 });
    paint(geo, colors[i % colors.length], { vary: 0.22, freq: 6, ao: 0.45, seed: seed + i, top: '#c8d88a', topAmt: 0.18 });
    g.add(mesh(geo, vmat(), center[0] + Math.cos(a) * dist, center[1] + (i === 0 ? 0 : (r() - 0.3) * radius * 0.6), center[2] + Math.sin(a) * dist));
  }
}

const builders = {
  arbol(r, seed) {
    const g = new THREE.Group();
    const lean = (r() - 0.5) * 0.08;
    g.add(mesh(trunkTube([[0, 0, 0], [lean, 0.25, 0], [lean * 2, 0.55, 0.02]], 0.07, 0.035, '#5b4332', seed), vmat()));
    for (let i = 0; i < 2; i++) {
      const a = r() * Math.PI * 2;
      g.add(mesh(trunkTube([[lean, 0.38, 0], [Math.cos(a) * 0.12, 0.52, Math.sin(a) * 0.12], [Math.cos(a) * 0.2, 0.62, Math.sin(a) * 0.2]], 0.025, 0.012, '#5b4332', seed + i, 6), vmat()));
    }
    canopy(g, r, [lean * 2, 0.74, 0], 6, 0.3, ['#3f6b2c', '#4d7a33', '#365f27'], seed);
    g.userData.shadow = 0.5;
    return g;
  },
  pino(r, seed) {
    const g = new THREE.Group();
    g.add(mesh(trunkTube([[0, 0, 0], [0, 0.5, 0], [0, 0.9, 0]], 0.05, 0.015, '#4e3a2c', seed), vmat()));
    const layers = 6;
    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      const rad = 0.36 * (1 - t * 0.8);
      const geo = smoothGeo(new THREE.ConeGeometry(rad, 0.3, 14, 3));
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        const ang = Math.atan2(z, x);
        // Borde dentado e irregular de las ramas.
        const jag = 1 + 0.18 * Math.sin(ang * 9 + seed + i) + noise(x * 8 + i, y * 8, z * 8) * 0.15;
        const edge = Math.max(0, -y / 0.15);
        p.setXYZ(k, x * (1 + (jag - 1) * edge), y - edge * 0.04 * (1 + Math.sin(ang * 9)), z * (1 + (jag - 1) * edge));
      }
      geo.computeVertexNormals();
      paint(geo, i % 2 ? '#35623d' : '#3e6e44', { vary: 0.2, freq: 9, ao: 0.32, seed: seed + i, top: '#6f9a5a', topAmt: 0.25 });
      g.add(mesh(geo, vmat(), 0, 0.3 + i * 0.12, 0));
    }
    g.userData.shadow = 0.42;
    return g;
  },
  abedul(r, seed) {
    const g = new THREE.Group();
    const geo = trunkTube([[0, 0, 0], [0.02, 0.4, 0], [0.0, 0.75, 0.02]], 0.04, 0.02, '#e9e4da', seed);
    // Marcas oscuras de la corteza.
    const p = geo.attributes.position, c = geo.attributes.color;
    for (let i = 0; i < p.count; i++) {
      if (noise(p.getX(i) * 40, p.getY(i) * 22, p.getZ(i) * 40) > 0.45) c.setXYZ(i, 0.06, 0.06, 0.06);
    }
    g.add(mesh(geo, vmat()));
    canopy(g, r, [0.0, 0.82, 0.02], 5, 0.22, ['#7d9a45', '#8ba650', '#6f8c3c'], seed);
    g.children.slice(1).forEach((m) => { m.scale.y = 1.35; });
    g.userData.shadow = 0.38;
    return g;
  },
  palmera(r, seed) {
    const g = new THREE.Group();
    const bend = 0.18 + r() * 0.1;
    const top = [bend, 0.95, 0];
    g.add(mesh(trunkTube([[0, 0, 0], [bend * 0.2, 0.4, 0], [bend * 0.7, 0.75, 0], top], 0.05, 0.03, '#8b6c4b', seed, 7), vmat()));
    // Hojas: tiras curvadas que se estrechan en la punta.
    const fronds = 8;
    for (let i = 0; i < fronds; i++) {
      const geo = new THREE.PlaneGeometry(0.55, 0.12, 10, 2);
      const pp = geo.attributes.position;
      for (let k = 0; k < pp.count; k++) {
        const x = pp.getX(k) + 0.275; // 0..0.55
        const t = x / 0.55;
        const w = pp.getY(k) * (1 - t * 0.85);
        pp.setXYZ(k, x, -t * t * 0.28, w);
      }
      geo.computeVertexNormals();
      paint(geo, '#4f7f35', { vary: 0.2, freq: 10, ao: 0, seed: seed + i });
      const leaf = mesh(geo, vmat({ side: THREE.DoubleSide }));
      leaf.rotation.y = (i / fronds) * Math.PI * 2 + r() * 0.3;
      leaf.rotation.z = 0.25 + r() * 0.2;
      leaf.position.set(...top);
      g.add(leaf);
    }
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), vmat(), top[0] + Math.cos(i * 2.1) * 0.04, top[1] - 0.04, Math.sin(i * 2.1) * 0.04));
    g.children.slice(-3).forEach((m) => paint(m.geometry, '#6b4f2e'));
    g.userData.shadow = 0.45;
    return g;
  },
  arbusto(r, seed) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const geo = lumpy(0.16 + r() * 0.06, { detail: 2, amp: 0.3, freq: 3, seed: seed + i, squash: 0.8 });
      paint(geo, ['#4a6f36', '#557a3b', '#3f6230'][i % 3], { vary: 0.25, freq: 8, ao: 0.5, seed });
      g.add(mesh(geo, vmat(), (r() - 0.5) * 0.3, 0.12 + r() * 0.05, (r() - 0.5) * 0.3));
    }
    g.userData.shadow = 0.36;
    return g;
  },
  flores(r, seed) {
    const g = new THREE.Group();
    const geo = lumpy(0.38, { detail: 3, amp: 0.1, freq: 3, seed, squash: 0.08 });
    paint(geo, '#5f8a3d', { vary: 0.25, freq: 9, ao: 0.2, seed });
    g.add(mesh(geo, vmat(), 0, 0.0, 0));
    const colors = ['#f2d16b', '#f0a1a8', '#fbfaf5', '#b9a1e6', '#f08a5d', '#e85d75'];
    const head = new THREE.SphereGeometry(0.03, 10, 8);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.32;
      const h = 0.06 + r() * 0.08;
      g.add(mesh(new THREE.CylinderGeometry(0.004, 0.006, h, 4), vmat(), Math.cos(a) * d, h / 2, Math.sin(a) * d));
      paint(g.children[g.children.length - 1].geometry, '#4f7a33');
      const fh = mesh(head, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.6 }), Math.cos(a) * d, h + 0.015, Math.sin(a) * d);
      fh.scale.y = 0.6;
      g.add(fh);
    }
    g.userData.shadow = 0;
    return g;
  },
  cactus(r, seed) {
    const g = new THREE.Group();
    const ribbed = (h, rad) => {
      const geo = smoothGeo(new THREE.CapsuleGeometry(rad, h, 6, 20));
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), z = p.getZ(k);
        const ang = Math.atan2(z, x);
        const f = 1 + 0.08 * Math.cos(ang * 10);
        p.setXYZ(k, x * f, p.getY(k), z * f);
      }
      geo.computeVertexNormals();
      return paint(geo, '#5d7f45', { vary: 0.15, freq: 10, ao: 0.35, seed });
    };
    g.add(mesh(ribbed(0.6, 0.09), vmat(), 0, 0.39, 0));
    [[1, 0.36, 0.22], [-1, 0.28, 0.18]].forEach(([s, y, h]) => {
      g.add(mesh(trunkTube([[0, y, 0], [s * 0.14, y, 0], [s * 0.17, y + 0.06, 0]], 0.055, 0.055, '#5d7f45', seed, 10), vmat()));
      g.add(mesh(ribbed(h, 0.055), vmat(), s * 0.17, y + 0.06 + h / 2, 0));
    });
    g.userData.shadow = 0.3;
    return g;
  },
  roca(r, seed) {
    const g = new THREE.Group();
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const size = i === 0 ? 0.24 : 0.1 + r() * 0.08;
      const geo = lumpy(size, { detail: 3, amp: 0.38, freq: 1.8, seed: seed + i * 7, squash: 0.65 });
      paint(geo, '#7d766e', { vary: 0.3, freq: 7, ao: 0.4, seed: seed + i, top: '#6f7f4a', topAmt: 0.45 });
      g.add(mesh(geo, vmat({ roughness: 0.95 }), i === 0 ? 0 : (r() - 0.5) * 0.5, size * 0.45, i === 0 ? 0 : (r() - 0.5) * 0.5));
    }
    g.userData.shadow = 0.42;
    return g;
  },
  cristal(r, seed) {
    const g = new THREE.Group();
    const base = lumpy(0.18, { detail: 2, amp: 0.3, freq: 2, seed, squash: 0.4 });
    paint(base, '#6f6a66', { vary: 0.3, freq: 6, seed });
    g.add(mesh(base, vmat(), 0, 0.04, 0));
    const m = lightMat(g, '#9fdcf0', { day: 0.35, night: 1.6, opts: { transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.1 } });
    for (let i = 0; i < 5; i++) {
      const h = 0.18 + r() * 0.3;
      const prism = new THREE.Group();
      prism.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, h, 6), m, 0, h / 2, 0));
      prism.add(mesh(new THREE.ConeGeometry(0.045, 0.08, 6), m, 0, h + 0.04, 0));
      prism.position.set((r() - 0.5) * 0.2, 0.02, (r() - 0.5) * 0.2);
      prism.rotation.set((r() - 0.5) * 0.7, r() * 3, (r() - 0.5) * 0.7);
      g.add(prism);
    }
    halo(g, 0, 0.3, 0, 0.9, '#a8e6ff');
    g.userData.shadow = 0.3;
    return g;
  },
  luciernagas(r, seed) {
    const g = builders.flores(r, seed);
    const flies = [];
    const m = lightMat(g, '#f6e27a', { day: 0.6, night: 3 });
    for (let i = 0; i < 10; i++) {
      const f = mesh(new THREE.SphereGeometry(0.018, 8, 6), m);
      f.userData.seed = i * 1.7 + seed * 0.001;
      const h = halo(f, 0, 0, 0, 0.12, '#fff2a0');
      (g.userData.halos ||= []).push(h);
      flies.push(f);
      g.add(f);
    }
    g.userData.tick = (t) => flies.forEach((f) => {
      const s = f.userData.seed;
      f.position.set(Math.cos(t * 0.5 + s) * 0.28, 0.25 + Math.sin(t * 0.9 + s * 2) * 0.12, Math.sin(t * 0.4 + s) * 0.28);
    });
    return g;
  },

  // ---------- Estructuras ----------
  cabana(r, seed) {
    const g = new THREE.Group();
    // Paredes de troncos.
    for (let i = 0; i < 6; i++) {
      [[0, 0.22, 0.56, 'x'], [0, -0.22, 0.56, 'x'], [0.27, 0, 0.46, 'z'], [-0.27, 0, 0.46, 'z']].forEach(([x, z, len, axis]) => {
        const log = mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8), vmat(), x, 0.03 + i * 0.055, z);
        paint(log.geometry, i % 2 ? '#8a6544' : '#7b5a3c', { vary: 0.2, freq: 20, seed: seed + i });
        if (axis === 'x') log.rotation.z = Math.PI / 2; else log.rotation.x = Math.PI / 2;
        g.add(log);
      });
    }
    // Tejado a dos aguas con alero.
    const shape = new THREE.Shape();
    shape.moveTo(-0.34, 0); shape.lineTo(0, 0.24); shape.lineTo(0.34, 0); shape.lineTo(-0.34, 0);
    const gable = new THREE.ExtrudeGeometry(shape, { depth: 0.44, bevelEnabled: false });
    gable.translate(0, 0, -0.22);
    paint(gable, '#c9b79a', { vary: 0.1, freq: 8, ao: 0 });
    g.add(mesh(gable, vmat(), 0, 0.33, 0));
    [-1, 1].forEach((s) => {
      const slab = mesh(new THREE.BoxGeometry(0.42, 0.025, 0.56), vmat(), s * 0.17, 0.455, 0);
      paint(slab.geometry, '#5a3a2e', { vary: 0.25, freq: 25, ao: 0, seed });
      slab.rotation.z = -s * 0.62;
      g.add(slab);
    });
    const chim = mesh(new THREE.BoxGeometry(0.07, 0.2, 0.07), vmat(), 0.14, 0.52, -0.1);
    paint(chim.geometry, '#8f857b', { vary: 0.3, freq: 30 });
    g.add(chim);
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.8 }), -0.06, 0.09, 0.235));
    const win = lightMat(g, '#ffcf7a');
    [[0.14, 0.2, 0.236], [-0.28, 0.2, 0.05]].forEach(([x, y, z], i) => {
      const w = mesh(new THREE.BoxGeometry(i ? 0.02 : 0.09, 0.08, i ? 0.09 : 0.02), win, x, y, z);
      g.add(w);
      halo(g, x, y, z + (i ? 0 : 0.03), 0.35);
    });
    g.userData.shadow = 0.55;
    return g;
  },
  hoguera(r, seed) {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const st = lumpy(0.045, { detail: 1, amp: 0.3, seed: seed + i });
      paint(st, '#8a8279', { vary: 0.3 });
      g.add(mesh(st, vmat(), Math.cos(a) * 0.2, 0.025, Math.sin(a) * 0.2));
    }
    for (let i = 0; i < 4; i++) {
      const log = mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.3, 8), vmat(), 0, 0.06, 0);
      paint(log.geometry, '#5d4130', { vary: 0.3, freq: 25 });
      log.rotation.z = Math.PI / 2 - 0.5;
      log.rotation.y = (i / 4) * Math.PI;
      const piv = new THREE.Group();
      piv.rotation.y = (i / 4) * Math.PI;
      piv.add(log);
      g.add(piv);
    }
    const outer = mesh(new THREE.ConeGeometry(0.09, 0.3, 12, 1, true), lightMat(g, '#ff8a3c', { day: 1.4, night: 2.6, opts: { transparent: true, opacity: 0.85, side: THREE.DoubleSide } }), 0, 0.22, 0);
    const inner = mesh(new THREE.ConeGeometry(0.05, 0.2, 10), lightMat(g, '#ffe08a', { day: 1.6, night: 3 }), 0, 0.17, 0);
    g.add(outer, inner);
    const h = halo(g, 0, 0.22, 0, 0.9, '#ffb070');
    g.userData.tick = (t) => {
      const f = 0.85 + Math.sin(t * 7) * 0.1 + Math.sin(t * 13.3) * 0.06;
      outer.scale.set(1, f, 1);
      inner.scale.set(1, 1.1 - (f - 0.85), 1);
      h.userData.flicker = f;
    };
    g.userData.shadow = 0.4;
    return g;
  },
  molino(r, seed) {
    const g = new THREE.Group();
    const tower = lathe([[0, 0], [0.2, 0], [0.19, 0.05], [0.13, 0.78], [0, 0.78]], 20);
    paint(tower, '#ddd3c2', { vary: 0.12, freq: 18, ao: 0.3, seed });
    g.add(mesh(tower, vmat()));
    const cap = lathe([[0, 0], [0.16, 0], [0.12, 0.1], [0.04, 0.18], [0, 0.2]], 20);
    paint(cap, '#6e4636', { vary: 0.15, freq: 12 });
    g.add(mesh(cap, vmat(), 0, 0.77, 0));
    const win = lightMat(g, '#ffcf7a');
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.07, 0.02), win, 0, 0.45, 0.165));
    halo(g, 0, 0.45, 0.19, 0.3);
    const hub = new THREE.Group();
    hub.position.set(0, 0.72, 0.17);
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5a3e', roughness: 0.8 });
    const cloth = new THREE.MeshStandardMaterial({ color: '#efe8da', roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * Math.PI * 2;
      arm.add(mesh(new THREE.BoxGeometry(0.018, 0.42, 0.018), wood, 0, 0.21, 0));
      arm.add(mesh(new THREE.PlaneGeometry(0.08, 0.32), cloth, 0.05, 0.25, 0.005));
      hub.add(arm);
    }
    hub.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), wood).rotateX(Math.PI / 2));
    g.add(hub);
    g.userData.tick = (t) => { hub.rotation.z = t * 0.7; };
    g.userData.shadow = 0.42;
    return g;
  },
  faro(r, seed) {
    const g = new THREE.Group();
    const base = lumpy(0.22, { detail: 2, amp: 0.25, seed, squash: 0.35 });
    paint(base, '#7a746c', { vary: 0.3, freq: 6 });
    g.add(mesh(base, vmat(), 0, 0.02, 0));
    const tower = lathe([[0, 0], [0.15, 0], [0.1, 0.72], [0, 0.72]], 24, 24);
    const pos = tower.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const red = new THREE.Color('#b9473a'), white = new THREE.Color('#f1ece2');
    for (let i = 0; i < pos.count; i++) {
      const cc = Math.floor((pos.getY(i) + 0.001) / 0.18) % 2 ? red : white;
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    tower.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.add(mesh(tower, vmat({ roughness: 0.6 }), 0, 0.05, 0));
    const metal = new THREE.MeshStandardMaterial({ color: '#2f3338', roughness: 0.5, metalness: 0.4 });
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 20), metal, 0, 0.78, 0));
    g.add(mesh(new THREE.TorusGeometry(0.14, 0.005, 6, 32), metal, 0, 0.82, 0).rotateX(Math.PI / 2));
    const lamp = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 16), lightMat(g, '#fff1b8', { day: 0.8, night: 3, opts: { transparent: true, opacity: 0.9 } }), 0, 0.85, 0);
    g.add(lamp);
    g.add(mesh(lathe([[0, 0], [0.095, 0], [0.06, 0.06], [0, 0.1]], 16), metal, 0, 0.91, 0));
    halo(g, 0, 0.85, 0, 1.1, '#fff0c0');
    const beam = mesh(new THREE.ConeGeometry(0.1, 1.0, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.rotation.z = Math.PI / 2;
    beam.position.x = 0.5;
    const pivot = new THREE.Group();
    pivot.position.y = 0.85;
    pivot.add(beam);
    g.add(pivot);
    (g.userData.beams ||= []).push(beam.material);
    g.userData.tick = (t) => { pivot.rotation.y = t * 0.7; };
    g.userData.shadow = 0.38;
    return g;
  },
  biblioteca(r, seed) {
    const g = new THREE.Group();
    const body = smoothGeo(new THREE.BoxGeometry(0.34, 0.9, 0.34, 2, 8, 2));
    paint(body, '#cbbfa9', { vary: 0.14, freq: 22, ao: 0.35, seed });
    g.add(mesh(body, vmat(), 0, 0.45, 0));
    const roof = new THREE.ConeGeometry(0.28, 0.28, 4);
    paint(roof, '#4e5a62', { vary: 0.15, freq: 15, ao: 0 });
    g.add(mesh(roof, vmat({ roughness: 0.6 }), 0, 1.04, 0).rotateY(Math.PI / 4));
    const win = lightMat(g, '#ffd795', { day: 0.12, night: 2.0 });
    for (let i = 0; i < 4; i++) {
      [[0, 0.172], [0, -0.172]].forEach(([x, z]) => {
        g.add(mesh(new THREE.BoxGeometry(0.07, 0.11, 0.01), win, -0.08, 0.18 + i * 0.2, z));
        g.add(mesh(new THREE.BoxGeometry(0.07, 0.11, 0.01), win, 0.08, 0.18 + i * 0.2, z));
      });
      halo(g, 0, 0.18 + i * 0.2, 0.2, 0.32);
      halo(g, 0, 0.18 + i * 0.2, -0.2, 0.32);
    }
    g.userData.shadow = 0.4;
    return g;
  },
  invernadero(r, seed) {
    const g = new THREE.Group();
    const base = mesh(new THREE.BoxGeometry(0.62, 0.05, 0.4), vmat(), 0, 0.025, 0);
    paint(base.geometry, '#8f857a', { vary: 0.2, freq: 20 });
    g.add(base);
    const frame = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.5, metalness: 0.2 });
    const glass = lightMat(g, '#d7efe6', { day: 0.02, night: 0.7, opts: { transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0 } });
    // Cuerpo de cristal con tejado a dos aguas.
    const shape = new THREE.Shape();
    shape.moveTo(-0.2, 0); shape.lineTo(-0.2, 0.18); shape.lineTo(0, 0.3); shape.lineTo(0.2, 0.18); shape.lineTo(0.2, 0); shape.lineTo(-0.2, 0);
    const body = new THREE.ExtrudeGeometry(shape, { depth: 0.58, bevelEnabled: false });
    body.translate(0, 0, -0.29);
    const bm = mesh(body, glass, 0, 0.05, 0);
    bm.rotation.y = Math.PI / 2;
    g.add(bm);
    for (let i = 0; i <= 4; i++) {
      const x = -0.29 + i * 0.145;
      [[-0.2, 0.09], [0.2, 0.09]].forEach(([z, y]) => g.add(mesh(new THREE.BoxGeometry(0.012, 0.18, 0.012), frame, x, 0.05 + y, z)));
      g.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.42), frame, x, 0.34, 0));
    }
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.012, 0.012), frame, 0, 0.35, 0));
    for (let i = 0; i < 6; i++) {
      const p = lumpy(0.05, { detail: 1, amp: 0.3, seed: seed + i });
      paint(p, '#4f8a3c', { vary: 0.3 });
      g.add(mesh(p, vmat(), -0.22 + i * 0.09, 0.1, (i % 2 ? 0.08 : -0.08)));
    }
    halo(g, 0, 0.2, 0, 0.8, '#e8ffd8');
    g.userData.shadow = 0.5;
    return g;
  },
  observatorio(r, seed) {
    const g = new THREE.Group();
    const base = lathe([[0, 0], [0.3, 0], [0.28, 0.32], [0, 0.32]], 28);
    paint(base, '#ddd5c7', { vary: 0.1, freq: 18, ao: 0.35, seed });
    g.add(mesh(base, vmat()));
    g.add(mesh(new THREE.SphereGeometry(0.27, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b8bec4', roughness: 0.3, metalness: 0.7 }), 0, 0.32, 0));
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.24, 0.03), lightMat(g, '#bcd6ff', { day: 0.1, night: 1.6 }), 0, 0.46, 0.2).rotateX(-0.6));
    halo(g, 0, 0.45, 0.24, 0.4, '#cfe0ff');
    const tube = mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.28, 12), new THREE.MeshStandardMaterial({ color: '#30343a', roughness: 0.4, metalness: 0.5 }), 0, 0.6, 0.12);
    tube.rotation.x = 0.7;
    g.add(tube);
    const win = lightMat(g, '#ffd795');
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.09, 0.01), win, 0.12, 0.16, 0.265));
    halo(g, 0.12, 0.16, 0.29, 0.3);
    g.userData.shadow = 0.5;
    return g;
  },
  cima(r, seed) {
    const g = new THREE.Group();
    const base = lumpy(0.34, { detail: 3, amp: 0.25, seed, squash: 0.35 });
    paint(base, '#8c847a', { vary: 0.3, freq: 6, top: '#6f7f4a', topAmt: 0.3 });
    g.add(mesh(base, vmat(), 0, 0.05, 0));
    const col = lathe([[0, 0], [0.12, 0], [0.12, 0.04], [0.09, 0.08], [0.07, 0.8], [0.1, 0.84], [0.1, 0.88], [0, 0.88]], 20);
    paint(col, '#e1d9ca', { vary: 0.1, freq: 20, ao: 0.3 });
    g.add(mesh(col, vmat(), 0, 0.1, 0));
    const gold = lightMat(g, '#e9c98a', { day: 0.3, night: 1.4, opts: { metalness: 0.6, roughness: 0.3 } });
    const ring1 = mesh(new THREE.TorusGeometry(0.22, 0.012, 10, 64), gold, 0, 0.75, 0);
    const ring2 = mesh(new THREE.TorusGeometry(0.16, 0.01, 10, 64), gold, 0, 0.92, 0);
    ring1.rotation.x = Math.PI / 2;
    ring2.rotation.x = Math.PI / 2;
    const light = mesh(new THREE.OctahedronGeometry(0.06, 0), lightMat(g, '#fff4d6', { day: 1.2, night: 3 }), 0, 1.12, 0);
    g.add(ring1, ring2, light);
    halo(g, 0, 1.12, 0, 0.9, '#fff0cc');
    g.userData.tick = (t) => { ring1.rotation.z = t * 0.3; ring2.rotation.z = -t * 0.4; light.position.y = 1.12 + Math.sin(t * 1.2) * 0.02; light.rotation.y = t; };
    g.userData.scale = 1.5;
    g.userData.shadow = 0.6;
    return g;
  },

  // ---------- Animales (viven en el agua, se mueven alrededor de su sitio) ----------
  ballena(r, seed) {
    const g = new THREE.Group();
    const body = new THREE.Group();
    const geo = lathe([[0, -0.6], [0.06, -0.55], [0.16, -0.35], [0.2, -0.1], [0.19, 0.15], [0.13, 0.4], [0.05, 0.55], [0, 0.6]], 24);
    geo.rotateZ(Math.PI / 2);
    // Lomo oscuro, vientre claro.
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const dark = new THREE.Color('#34495e'), light = new THREE.Color('#b9c4cc'), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      cc.copy(dark).lerp(light, Math.max(0, Math.min(1, -p.getY(i) / 0.15 + 0.3)));
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.scale(1, 0.75, 0.85);
    body.add(mesh(geo, vmat({ roughness: 0.45 })));
    const fluke = new THREE.Shape();
    fluke.moveTo(0, 0); fluke.quadraticCurveTo(-0.08, 0.16, -0.16, 0.2); fluke.quadraticCurveTo(-0.1, 0.06, -0.12, 0);
    fluke.quadraticCurveTo(-0.1, -0.06, -0.16, -0.2); fluke.quadraticCurveTo(-0.08, -0.16, 0, 0);
    const tail = mesh(new THREE.ExtrudeGeometry(fluke, { depth: 0.015, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#34495e', roughness: 0.45 }), -0.58, 0, 0);
    tail.rotation.x = Math.PI / 2;
    const tailPiv = new THREE.Group();
    tailPiv.position.x = -0.5;
    tail.position.x = -0.08;
    tailPiv.add(tail);
    body.add(tailPiv);
    [-1, 1].forEach((s) => {
      const fin = mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: '#2f4255', roughness: 0.5 }), 0.2, -0.08, s * 0.15);
      fin.scale.set(0.9, 0.12, 0.35);
      fin.rotation.y = s * 0.5;
      body.add(fin);
    });
    g.add(body);
    g.userData.tick = (t) => {
      const a = t * 0.22 + seed * 0.0001;
      body.position.set(Math.cos(a) * 0.7, 0.03 + Math.sin(t * 0.6) * 0.05, Math.sin(a) * 0.7);
      body.rotation.y = -a - Math.PI / 2 + Math.PI;
      body.rotation.z = Math.sin(t * 0.6) * 0.08;
      tailPiv.rotation.z = Math.sin(t * 1.6) * 0.25;
    };
    g.userData.scale = 1.4;
    return g;
  },
  delfin(r, seed) {
    const g = new THREE.Group();
    const make = () => {
      const d = new THREE.Group();
      const geo = lathe([[0, -0.3], [0.03, -0.26], [0.07, -0.1], [0.075, 0.05], [0.05, 0.18], [0.02, 0.26], [0.012, 0.32], [0, 0.34]], 16);
      geo.rotateZ(-Math.PI / 2);
      paint(geo, '#7c8b99', { vary: 0.08, ao: 0.3 });
      d.add(mesh(geo, vmat({ roughness: 0.35 })));
      const fin = mesh(new THREE.ConeGeometry(0.03, 0.09, 8), new THREE.MeshStandardMaterial({ color: '#6f7d8b', roughness: 0.4 }), -0.02, 0.09, 0);
      fin.rotation.z = 0.4;
      fin.scale.z = 0.3;
      const tl = mesh(new THREE.SphereGeometry(0.06, 10, 6), fin.material, -0.3, 0, 0);
      tl.scale.set(0.3, 0.1, 1);
      d.add(fin, tl);
      return d;
    };
    const pods = [0, Math.PI * 0.85].map((off) => { const d = make(); d.userData.off = off; g.add(d); return d; });
    g.userData.tick = (t) => pods.forEach((d) => {
      const p = (t * 0.35 + d.userData.off) % (Math.PI * 2);
      const jump = Math.max(0, Math.sin(p * 2));
      d.position.set(Math.cos(p) * 0.45, jump * 0.3 - 0.04, Math.sin(p) * 0.45);
      d.rotation.y = -p - Math.PI / 2;
      d.rotation.z = Math.cos(p * 2) * 0.7;
    });
    return g;
  },
  tortuga(r, seed) {
    const g = new THREE.Group();
    const t0 = new THREE.Group();
    const shell = lathe([[0, 0], [0.19, 0], [0.18, 0.04], [0.13, 0.1], [0.06, 0.13], [0, 0.135]], 20);
    const p = shell.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      // Placas del caparazón.
      const plate = Math.abs(Math.sin(Math.atan2(z, x) * 3)) * Math.abs(Math.sin(Math.hypot(x, z) * 30));
      cc.set('#5b6b3c').lerp(new THREE.Color('#8a7a45'), plate * 0.6);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    shell.setAttribute('color', new THREE.BufferAttribute(col, 3));
    shell.scale(1, 1, 0.8);
    t0.add(mesh(shell, vmat({ roughness: 0.5 })));
    const skin = new THREE.MeshStandardMaterial({ color: '#8f9a6c', roughness: 0.7 });
    const head = mesh(new THREE.SphereGeometry(0.05, 12, 8), skin, 0.22, 0.02, 0);
    head.scale.set(1.3, 0.8, 0.9);
    t0.add(head);
    const flips = [];
    [[0.09, 0.14], [0.09, -0.14], [-0.12, 0.1], [-0.12, -0.1]].forEach(([x, z], i) => {
      const f = mesh(new THREE.SphereGeometry(0.07, 10, 6), skin, x, 0, z);
      f.scale.set(0.9, 0.12, i < 2 ? 0.45 : 0.3);
      flips.push(f);
      t0.add(f);
    });
    g.add(t0);
    g.userData.tick = (t) => {
      const a = t * 0.12;
      t0.position.set(Math.cos(a) * 0.32, -0.02, Math.sin(a) * 0.32);
      t0.rotation.y = -a - Math.PI / 2;
      flips.forEach((f, i) => { f.rotation.y = Math.sin(t * 2 + i) * 0.4; });
    };
    return g;
  },
  peces(r, seed) {
    const g = new THREE.Group();
    const fishGeo = lathe([[0, -0.06], [0.018, -0.04], [0.022, 0.0], [0.014, 0.04], [0, 0.05]], 10);
    fishGeo.rotateZ(Math.PI / 2);
    fishGeo.scale(1, 1, 0.5);
    const mats = ['#f2a65a', '#e8e2d6', '#f0c060'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.2 }));
    const fish = [];
    for (let i = 0; i < 16; i++) {
      const w = new THREE.Group();
      const f = mesh(fishGeo, mats[i % 3]);
      const tail = mesh(new THREE.ConeGeometry(0.02, 0.03, 4), mats[i % 3], -0.07, 0, 0);
      tail.rotation.z = Math.PI / 2;
      tail.scale.z = 0.3;
      w.add(f, tail);
      w.userData.seed = i;
      fish.push(w);
      g.add(w);
    }
    g.userData.tick = (t) => fish.forEach((w) => {
      const s = w.userData.seed;
      const a = t * 0.6 + s * 0.22;
      const rr = 0.22 + (s % 4) * 0.035;
      w.position.set(Math.cos(a) * rr, -0.02 + (s % 3) * 0.02, Math.sin(a) * rr);
      w.rotation.y = -a + Math.PI;
    });
    return g;
  },
  medusa(r, seed) {
    const g = new THREE.Group();
    const bells = [];
    const bellGeo = lathe([[0, 0.1], [0.05, 0.095], [0.08, 0.06], [0.085, 0.02], [0.075, 0.0], [0.06, 0.012], [0, 0.03]], 20);
    for (let i = 0; i < 4; i++) {
      const jb = new THREE.Group();
      const m = lightMat(g, '#e7b8f0', { day: 0.4, night: 1.6, opts: { transparent: true, opacity: 0.7, roughness: 0.2 } });
      jb.add(mesh(bellGeo, m));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        jb.add(mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.14, 3), m, Math.cos(a) * 0.05, -0.06, Math.sin(a) * 0.05));
      }
      jb.position.set((i % 2) * 0.22 - 0.11, 0, Math.floor(i / 2) * 0.22 - 0.11);
      jb.userData.seed = i * 1.3;
      bells.push(jb);
      g.add(jb);
      halo(g, jb.position.x, 0.05, jb.position.z, 0.3, '#f0c8ff');
    }
    g.userData.tick = (t) => bells.forEach((b) => {
      const p = Math.sin(t * 1.5 + b.userData.seed);
      b.scale.set(1 + p * 0.1, 1 - p * 0.12, 1 + p * 0.1);
      b.position.y = 0.0 + Math.sin(t * 0.5 + b.userData.seed) * 0.04;
    });
    return g;
  },
  manta(r, seed) {
    const g = new THREE.Group();
    const m0 = new THREE.Group();
    const geo = new THREE.PlaneGeometry(0.6, 0.4, 16, 10);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const half = 0.2 * (1 - Math.pow(Math.abs(x) / 0.3, 1.6));
      const yy = Math.max(-half, Math.min(half, y)) * (x > 0 ? 1 : 0.75);
      p.setXYZ(i, x * (1 - Math.abs(yy) * 0.6), yy, -Math.abs(x) * 0.15 + (1 - Math.abs(yy) / 0.2) * 0.03);
    }
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(Math.PI / 2);
    geo.computeVertexNormals();
    paint(geo, '#33414f', { vary: 0.1, ao: 0 });
    const body = mesh(geo, vmat({ side: THREE.DoubleSide, roughness: 0.5 }));
    const tail = mesh(new THREE.CylinderGeometry(0.002, 0.008, 0.35, 4), new THREE.MeshStandardMaterial({ color: '#33414f' }), -0.35, 0, 0);
    tail.rotation.z = Math.PI / 2;
    m0.add(body, tail);
    g.add(m0);
    g.userData.tick = (t) => {
      const a = t * 0.2;
      m0.position.set(Math.cos(a) * 0.45, -0.03, Math.sin(a) * 0.45);
      m0.rotation.y = -a - Math.PI / 2;
      m0.rotation.x = Math.sin(t * 1.4) * 0.12;
      body.scale.y = 1 + Math.sin(t * 2.2) * 0.6;
    };
    return g;
  },

  // ---------- Gestas ----------
  raices(r, seed) {
    const g = new THREE.Group();
    g.add(mesh(trunkTube([[0, 0, 0], [0.03, 0.3, 0], [0, 0.6, 0.02]], 0.11, 0.06, '#4f3828', seed, 10), vmat()));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.3;
      g.add(mesh(trunkTube([[0, 0.12, 0], [Math.cos(a) * 0.15, 0.04, Math.sin(a) * 0.15], [Math.cos(a) * 0.32, 0.0, Math.sin(a) * 0.32]], 0.04, 0.01, '#4f3828', seed + i, 6), vmat()));
    }
    canopy(g, r, [0, 0.9, 0], 7, 0.42, ['#c98f34', '#d9a441', '#b87a2a'], seed);
    halo(g, 0, 0.9, 0, 1.2, '#ffd890');
    g.userData.scale = 1.3;
    g.userData.shadow = 0.7;
    return g;
  },
  farovoces(r, seed) {
    const g = builders.faro(r, seed);
    const coats = ['#c9874b', '#6f7f5f', '#5c7488', '#8f86a8', '#b5714f'];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const fig = new THREE.Group();
      fig.add(mesh(lathe([[0, 0], [0.035, 0], [0.03, 0.08], [0.02, 0.11], [0, 0.11]], 10), new THREE.MeshStandardMaterial({ color: coats[i], roughness: 0.8 })));
      fig.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshStandardMaterial({ color: '#e3c7a6', roughness: 0.7 }), 0, 0.135, 0));
      fig.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
      fig.rotation.y = -a + Math.PI / 2;
      g.add(fig);
    }
    halo(g, 0, 0.1, 0, 0.8, '#ffb070');
    g.userData.scale = 1.2;
    g.userData.shadow = 0.55;
    return g;
  },
  cumbre(r, seed) {
    const g = new THREE.Group();
    const rock = lumpy(0.3, { detail: 3, amp: 0.3, seed, squash: 0.55 });
    paint(rock, '#857c72', { vary: 0.3, freq: 6, top: '#f2f2f0', topAmt: 0.7 });
    g.add(mesh(rock, vmat(), 0, 0.12, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), new THREE.MeshStandardMaterial({ color: '#d8d4cc', metalness: 0.5, roughness: 0.4 }), 0, 0.55, 0));
    const flagGeo = new THREE.PlaneGeometry(0.2, 0.12, 8, 1);
    flagGeo.translate(0.1, 0, 0);
    const flag = mesh(flagGeo, new THREE.MeshStandardMaterial({ color: '#c4553f', roughness: 0.8, side: THREE.DoubleSide }), 0, 0.78, 0);
    g.add(flag);
    const fp = flagGeo.attributes.position;
    const orig = fp.array.slice();
    g.add(mesh(new THREE.OctahedronGeometry(0.04, 0), lightMat(g, '#f3d9a4', { day: 1, night: 3 }), 0, 0.87, 0));
    halo(g, 0, 0.87, 0, 0.6, '#ffe4b0');
    g.userData.tick = (t) => {
      for (let i = 0; i < fp.count; i++) {
        const x = orig[i * 3];
        fp.setZ(i, Math.sin(x * 25 - t * 4) * 0.015 * (x / 0.2));
      }
      fp.needsUpdate = true;
    };
    g.userData.scale = 1.3;
    g.userData.shadow = 0.5;
    return g;
  },
};

const WATER = new Set(['ballena', 'delfin', 'tortuga', 'peces', 'medusa', 'manta']);

export function buildItem(itemId, seed = 1) {
  const b = builders[itemId] || builders.roca;
  const r = rng(seed * 2654435761 + itemId.length);
  const g = b(r, (seed % 1000) * 0.37);
  g.userData.itemId = itemId;
  g.userData.glows ||= [];
  g.userData.halos ||= [];
  g.userData.beams ||= [];
  if (!WATER.has(itemId) && g.userData.shadow !== 0) g.add(contactShadow(g.userData.shadow || 0.45));
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// Ajusta las luces según la noche (0 = pleno día, 1 = noche cerrada).
export function setNightLights(g, night) {
  const u = g.userData;
  if (u.night !== undefined && Math.abs(u.night - night) < 0.01) return;
  u.night = night;
  u.glows.forEach(({ mat, day, night: n }) => { mat.emissiveIntensity = day + (n - day) * night; });
  u.halos.forEach((h) => { h.material.opacity = 0.05 + night * 0.85; });
  u.beams.forEach((m) => { m.opacity = night * 0.16; });
}

// Copia translúcida para la vista previa al colocar.
export function makeGhost(itemId, valid) {
  const g = buildItem(itemId, 1);
  g.traverse((o) => {
    if (o.isMesh && !o.userData.isShadow) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = Math.min(o.material.opacity, 0.7);
      o.material.depthWrite = false;
    }
  });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.75, 40),
    new THREE.MeshBasicMaterial({ color: valid ? '#7c9a6b' : '#d0705e', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(ring);
  g.userData.ring = ring;
  return g;
}
