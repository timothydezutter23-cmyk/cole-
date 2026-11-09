// Piezas del mundo, generadas con geometría simple (low-poly).
// Cada pieza mide ~1 unidad de alto con base en y=0; se escala según el planeta.
import * as THREE from 'three';

const mats = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts }));
  }
  return mats.get(key);
}
const glow = (color, intensity = 1.4) => mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

const trunk = (h = 0.45, r = 0.06, color = '#6b4a32') => mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 6), mat(color), 0, h / 2, 0);

const builders = {
  arbol() {
    const g = new THREE.Group();
    g.add(trunk(0.45));
    g.add(mesh(new THREE.IcosahedronGeometry(0.32, 0), mat('#4f7f3a'), 0, 0.68, 0));
    g.add(mesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#5f9145'), 0.14, 0.86, 0.05));
    return g;
  },
  pino() {
    const g = new THREE.Group();
    g.add(trunk(0.25, 0.05));
    [[0.34, 0.42, 0.38], [0.27, 0.36, 0.6], [0.18, 0.3, 0.82]].forEach(([r, h, y]) => g.add(mesh(new THREE.ConeGeometry(r, h, 7), mat('#2f5a3a'), 0, y, 0)));
    return g;
  },
  abedul() {
    const g = new THREE.Group();
    g.add(trunk(0.6, 0.04, '#e8e2d6'));
    const c = mesh(new THREE.IcosahedronGeometry(0.24, 0), mat('#8fb05a'), 0, 0.78, 0);
    c.scale.set(0.9, 1.4, 0.9);
    g.add(c);
    return g;
  },
  palmera() {
    const g = new THREE.Group();
    let y = 0, x = 0;
    for (let i = 0; i < 5; i++) {
      const seg = mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.17, 6), mat('#8a6a48'), x, y + 0.085, 0);
      seg.rotation.z = -0.08 * i;
      g.add(seg);
      y += 0.16; x += 0.02 * i;
    }
    for (let i = 0; i < 6; i++) {
      const leaf = mesh(new THREE.BoxGeometry(0.42, 0.015, 0.09), mat('#4f8f3e'), x, y, 0);
      leaf.geometry.translate(0.21, 0, 0);
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      leaf.rotation.z = -0.45;
      g.add(leaf);
    }
    return g;
  },
  arbusto() {
    const g = new THREE.Group();
    [[0, 0.16, 0, 0.2], [0.16, 0.12, 0.05, 0.15], [-0.13, 0.11, -0.06, 0.14]].forEach(([x, y, z, r]) => g.add(mesh(new THREE.IcosahedronGeometry(r, 0), mat('#58834a'), x, y, z)));
    g.scale.setScalar(0.8);
    return g;
  },
  flores() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.03, 9), mat('#6f9a4a'), 0, 0.015, 0));
    const colors = ['#e9c46a', '#f4a6a0', '#ffffff', '#b8a1e3', '#f28c6b'];
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, r = 0.08 + (i % 5) * 0.06;
      g.add(mesh(new THREE.SphereGeometry(0.045, 6, 4), mat(colors[i % colors.length]), Math.cos(a) * r, 0.1, Math.sin(a) * r));
    }
    return g;
  },
  cactus() {
    const g = new THREE.Group();
    const green = mat('#6c8f4e');
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.7, 7), green, 0, 0.35, 0));
    const a1 = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6), green, 0.16, 0.45, 0);
    const a2 = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 6), green, -0.15, 0.36, 0);
    g.add(a1, a2, mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), green, 0.1, 0.34, 0), mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), green, -0.09, 0.27, 0));
    return g;
  },
  roca() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.DodecahedronGeometry(0.22, 0), mat('#857c72'), 0, 0.12, 0));
    g.add(mesh(new THREE.DodecahedronGeometry(0.14, 0), mat('#978e84'), 0.22, 0.07, 0.08));
    g.children[0].scale.set(1.2, 0.8, 1);
    return g;
  },
  cristal() {
    const g = new THREE.Group();
    const m = glow('#9fdcf0', 0.6);
    [[0, 0.32, 0, 0.13, 2.4, 0], [0.14, 0.2, 0.05, 0.09, 2, 0.4], [-0.12, 0.18, -0.04, 0.08, 2, -0.35]].forEach(([x, y, z, r, s, tilt]) => {
      const o = mesh(new THREE.OctahedronGeometry(r, 0), m, x, y, z);
      o.scale.y = s;
      o.rotation.z = tilt;
      g.add(o);
    });
    return g;
  },
  luciernagas() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.02, 8), mat('#5a7f45'), 0, 0.01, 0));
    const flies = [];
    for (let i = 0; i < 9; i++) {
      const f = mesh(new THREE.SphereGeometry(0.03, 6, 4), glow('#f6e27a', 2.2), 0, 0, 0);
      f.userData.seed = i * 1.7;
      flies.push(f);
      g.add(f);
    }
    g.userData.tick = (t) => flies.forEach((f) => {
      const s = f.userData.seed;
      f.position.set(Math.cos(t * 0.5 + s) * 0.25, 0.25 + Math.sin(t * 0.9 + s * 2) * 0.12, Math.sin(t * 0.4 + s) * 0.25);
    });
    return g;
  },
  cabana() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.36, 0.42), mat('#b08a63'), 0, 0.18, 0));
    const roof = mesh(new THREE.ConeGeometry(0.42, 0.3, 4), mat('#7b4b3a'), 0, 0.51, 0);
    roof.rotation.y = Math.PI / 4;
    g.add(roof, mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), mat('#5a3b28'), 0, 0.09, 0.215));
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.08, 0.02), glow('#ffd58a', 0.8), 0.15, 0.22, 0.215));
    return g;
  },
  hoguera() {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(mesh(new THREE.DodecahedronGeometry(0.05, 0), mat('#8a8279'), Math.cos(a) * 0.2, 0.03, Math.sin(a) * 0.2));
    }
    for (let i = 0; i < 3; i++) {
      const log = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 5), mat('#6b4a32'), 0, 0.05, 0);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 3) * Math.PI;
      g.add(log);
    }
    const flame = mesh(new THREE.ConeGeometry(0.09, 0.28, 6), glow('#ffb35c', 1.8), 0, 0.2, 0);
    g.add(flame);
    g.userData.tick = (t) => { flame.scale.set(1, 0.85 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13) * 0.05, 1); };
    return g;
  },
  molino() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.8, 8), mat('#e6dccb'), 0, 0.4, 0));
    g.add(mesh(new THREE.ConeGeometry(0.15, 0.18, 8), mat('#8b5a44'), 0, 0.89, 0));
    const hub = new THREE.Group();
    hub.position.set(0, 0.72, 0.15);
    for (let i = 0; i < 4; i++) {
      const b = mesh(new THREE.BoxGeometry(0.06, 0.38, 0.015), mat('#f5efe4'), 0, 0.19, 0);
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * Math.PI * 2;
      arm.add(b);
      hub.add(arm);
    }
    g.add(hub);
    g.userData.tick = (t) => { hub.rotation.z = t * 0.8; };
    return g;
  },
  faro() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const r0 = 0.16 - i * 0.02;
      g.add(mesh(new THREE.CylinderGeometry(r0 - 0.02, r0, 0.2, 10), mat(i % 2 ? '#c4553f' : '#f2ede4'), 0, 0.1 + i * 0.2, 0));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), glow('#fff1b8', 1.6), 0, 0.86, 0));
    g.add(mesh(new THREE.ConeGeometry(0.12, 0.14, 10), mat('#3a3d42'), 0, 0.99, 0));
    const beam = mesh(new THREE.ConeGeometry(0.08, 0.7, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0);
    beam.rotation.z = Math.PI / 2;
    beam.position.x = 0.35;
    const pivot = new THREE.Group();
    pivot.position.y = 0.86;
    pivot.add(beam);
    g.add(pivot);
    g.userData.tick = (t) => { pivot.rotation.y = t * 0.7; };
    return g;
  },
  biblioteca() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.34, 1.0, 0.34), mat('#cfc6b6'), 0, 0.5, 0));
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), mat('#8a7e6e'), 0, 1.02, 0));
    for (let i = 0; i < 4; i++) {
      [0.172, -0.172].forEach((z) => g.add(mesh(new THREE.BoxGeometry(0.2, 0.09, 0.01), glow('#ffdca0', 0.7), 0, 0.2 + i * 0.22, z)));
    }
    return g;
  },
  invernadero() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.04, 0.4), mat('#8a7e6e'), 0, 0.02, 0));
    const glass = new THREE.MeshStandardMaterial({ color: '#d8efe9', transparent: true, opacity: 0.35, roughness: 0.1 });
    const body = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 12, 1, false, 0, Math.PI), glass, 0, 0.04, 0);
    body.rotation.z = Math.PI / 2;
    body.rotation.y = Math.PI / 2;
    body.rotation.order = 'YZX';
    g.add(body);
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.IcosahedronGeometry(0.05, 0), mat('#5f9145'), -0.22 + i * 0.11, 0.09, 0));
    return g;
  },
  observatorio() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.32, 12), mat('#e2dbcf'), 0, 0.16, 0));
    g.add(mesh(new THREE.SphereGeometry(0.26, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#b9c0c6', { metalness: 0.3, roughness: 0.5 }), 0, 0.32, 0));
    const tube = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8), mat('#3a3d42'), 0.08, 0.5, 0);
    tube.rotation.z = -0.7;
    g.add(tube);
    return g;
  },
  cima() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.14, 8), mat('#9a9188'), 0, 0.07, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.9, 8), mat('#d9d2c5'), 0, 0.59, 0));
    const ring1 = mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 40), glow('#f3d9a4', 0.9), 0, 0.75, 0);
    const ring2 = mesh(new THREE.TorusGeometry(0.16, 0.01, 6, 40), glow('#f3d9a4', 0.9), 0, 0.92, 0);
    ring1.rotation.x = Math.PI / 2;
    ring2.rotation.x = Math.PI / 2;
    const light = mesh(new THREE.OctahedronGeometry(0.07, 0), glow('#fff4d6', 2), 0, 1.12, 0);
    g.add(ring1, ring2, light);
    g.userData.tick = (t) => { ring1.rotation.z = t * 0.3; ring2.rotation.z = -t * 0.4; light.position.y = 1.12 + Math.sin(t * 1.2) * 0.02; };
    g.userData.scale = 1.5;
    return g;
  },
  // Animales: viven en el agua y se mueven alrededor de donde los pones.
  ballena() {
    const g = new THREE.Group();
    const body = new THREE.Group();
    const b = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat('#5f7d99', { emissive: '#3a6f9a', emissiveIntensity: 0.25 }), 0, 0, 0);
    b.scale.set(2.2, 0.8, 0.9);
    const tail = mesh(new THREE.ConeGeometry(0.12, 0.3, 4), mat('#5f7d99'), -0.55, 0.02, 0);
    tail.rotation.z = Math.PI / 2;
    tail.scale.set(1, 1, 0.3);
    body.add(b, tail);
    body.position.y = 0.04;
    g.add(body);
    g.userData.tick = (t) => {
      const a = t * 0.25;
      body.position.set(Math.cos(a) * 0.6, 0.02 + Math.sin(t * 0.8) * 0.03, Math.sin(a) * 0.6);
      body.rotation.y = -a - Math.PI / 2 + Math.PI;
      tail.rotation.y = Math.sin(t * 2) * 0.3;
    };
    g.userData.scale = 1.4;
    return g;
  },
  delfin() {
    const g = new THREE.Group();
    const pods = [0, Math.PI].map((off) => {
      const d = new THREE.Group();
      const b = mesh(new THREE.SphereGeometry(0.1, 8, 6), mat('#8a9aab'), 0, 0, 0);
      b.scale.set(2.2, 0.8, 0.7);
      const fin = mesh(new THREE.ConeGeometry(0.04, 0.1, 4), mat('#7a8a9b'), 0, 0.08, 0);
      d.add(b, fin);
      d.userData.off = off;
      g.add(d);
      return d;
    });
    g.userData.tick = (t) => pods.forEach((d) => {
      const p = (t * 0.35 + d.userData.off) % (Math.PI * 2);
      const jump = Math.max(0, Math.sin(p * 2));
      d.position.set(Math.cos(p) * 0.4, jump * 0.25 - 0.02, Math.sin(p) * 0.4);
      d.rotation.y = -p;
      d.rotation.z = Math.cos(p * 2) * 0.6;
    });
    return g;
  },
  tortuga() {
    const g = new THREE.Group();
    const t0 = new THREE.Group();
    const shell = mesh(new THREE.SphereGeometry(0.18, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat('#5e7a4a'), 0, 0, 0);
    shell.scale.y = 0.6;
    t0.add(shell, mesh(new THREE.SphereGeometry(0.06, 6, 4), mat('#8fa06a'), 0.2, 0.02, 0));
    [[0.1, 0.12], [0.1, -0.12], [-0.1, 0.12], [-0.1, -0.12]].forEach(([x, z]) => t0.add(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.05), mat('#8fa06a'), x, 0, z)));
    g.add(t0);
    g.userData.tick = (t) => { const a = t * 0.12; t0.position.set(Math.cos(a) * 0.3, 0.01, Math.sin(a) * 0.3); t0.rotation.y = -a - Math.PI / 2; };
    return g;
  },
  peces() {
    const g = new THREE.Group();
    const fish = [];
    for (let i = 0; i < 12; i++) {
      const f = mesh(new THREE.ConeGeometry(0.03, 0.1, 4), mat(i % 3 ? '#f2a65a' : '#e8e2d6'), 0, 0, 0);
      f.rotation.z = Math.PI / 2;
      const w = new THREE.Group();
      w.add(f);
      w.userData.seed = i;
      fish.push(w);
      g.add(w);
    }
    g.userData.tick = (t) => fish.forEach((w) => {
      const s = w.userData.seed;
      const a = t * 0.6 + s * 0.25;
      const r = 0.22 + (s % 4) * 0.03;
      w.position.set(Math.cos(a) * r, 0.02 + (s % 3) * 0.02, Math.sin(a) * r);
      w.rotation.y = -a + Math.PI;
    });
    return g;
  },
  medusa() {
    const g = new THREE.Group();
    const bells = [];
    for (let i = 0; i < 4; i++) {
      const bell = mesh(new THREE.SphereGeometry(0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e7b8f0', emissive: '#d38be6', emissiveIntensity: 1, transparent: true, opacity: 0.75 }), (i % 2) * 0.2 - 0.1, 0, Math.floor(i / 2) * 0.2 - 0.1);
      bell.userData.seed = i * 1.3;
      bells.push(bell);
      g.add(bell);
    }
    g.userData.tick = (t) => bells.forEach((b) => {
      const p = Math.sin(t * 1.5 + b.userData.seed);
      b.scale.set(1 + p * 0.12, 1 - p * 0.15, 1 + p * 0.12);
      b.position.y = 0.04 + Math.sin(t * 0.5 + b.userData.seed) * 0.04;
    });
    return g;
  },
  manta() {
    const g = new THREE.Group();
    const m0 = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0.22, 0); shape.lineTo(0, 0.3); shape.lineTo(-0.16, 0); shape.lineTo(0, -0.3); shape.closePath();
    const body = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), mat('#3d4f63'), 0, 0, 0);
    body.rotation.x = -Math.PI / 2;
    const tail = mesh(new THREE.CylinderGeometry(0.005, 0.01, 0.3, 4), mat('#3d4f63'), -0.3, 0, 0);
    tail.rotation.z = Math.PI / 2;
    m0.add(body, tail);
    g.add(m0);
    g.userData.tick = (t) => {
      const a = t * 0.2;
      m0.position.set(Math.cos(a) * 0.45, 0.02, Math.sin(a) * 0.45);
      m0.rotation.y = -a - Math.PI / 2;
      m0.rotation.x = Math.sin(t * 1.4) * 0.15;
    };
    return g;
  },
  // Gestas
  raices() {
    const g = new THREE.Group();
    g.add(trunk(0.55, 0.09, '#5d4130'));
    for (let i = 0; i < 6; i++) {
      const root = mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.3, 5), mat('#5d4130'), 0, 0.04, 0);
      root.geometry.translate(0, 0.15, 0);
      root.rotation.z = Math.PI / 2.4;
      const piv = new THREE.Group();
      piv.rotation.y = (i / 6) * Math.PI * 2;
      piv.add(root);
      g.add(piv);
    }
    g.add(mesh(new THREE.IcosahedronGeometry(0.4, 1), mat('#d9a441', { emissive: '#b5782a', emissiveIntensity: 0.25 }), 0, 0.85, 0));
    g.userData.scale = 1.3;
    return g;
  },
  farovoces() {
    const g = builders.faro();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const fig = new THREE.Group();
      fig.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), mat('#c9874b'), 0, 0.06, 0));
      fig.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), mat('#e8d4bc'), 0, 0.15, 0));
      fig.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
      g.add(fig);
    }
    g.userData.scale = 1.2;
    return g;
  },
  cumbre() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.DodecahedronGeometry(0.3, 0), mat('#8a8178'), 0, 0.15, 0));
    g.children[0].scale.set(1, 0.6, 1);
    const ob = mesh(new THREE.CylinderGeometry(0.03, 0.09, 0.7, 4), mat('#ece6da'), 0, 0.6, 0);
    g.add(ob);
    g.add(mesh(new THREE.OctahedronGeometry(0.06, 0), glow('#f3d9a4', 1.6), 0, 1.0, 0));
    const flag = mesh(new THREE.BoxGeometry(0.18, 0.1, 0.005), mat('#c4553f'), 0.1, 0.85, 0);
    g.add(flag);
    g.userData.tick = (t) => { flag.rotation.y = Math.sin(t * 2) * 0.25; };
    g.userData.scale = 1.3;
    return g;
  },
};

export function buildItem(itemId) {
  const b = builders[itemId] || builders.roca;
  const g = b();
  g.userData.itemId = itemId;
  return g;
}

// Copia translúcida para la vista previa al colocar.
export function makeGhost(itemId, valid) {
  const g = buildItem(itemId);
  g.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.7;
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
