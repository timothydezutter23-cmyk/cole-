// Terreno procedural del planeta. La misma función se usa para pintar,
// para apoyar objetos en el relieve y para decidir si un punto es tierra o agua.

// --- Ruido simplex 3D (Stefan Gustavson, dominio público) ---
const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1],
  [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

function makePerm(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0 || 1;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

export function makeNoise3(seed) {
  const perm = makePerm(seed);
  const F3 = 1 / 3, G3 = 1 / 6;
  return function noise(x, y, z) {
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0;
    const corner = (gx, x_, y_, z_) => {
      let tt = 0.6 - x_ * x_ - y_ * y_ - z_ * z_;
      if (tt < 0) return 0;
      const g = grad3[gx % 12];
      tt *= tt;
      return tt * tt * (g[0] * x_ + g[1] * y_ + g[2] * z_);
    };
    n += corner(perm[ii + perm[jj + perm[kk]]], x0, y0, z0);
    n += corner(perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1);
    n += corner(perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2);
    n += corner(perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3);
    return 32 * n; // aprox. [-1, 1]
  };
}

const noise = makeNoise3(20261109);
const warpN = makeNoise3(7331);

function fbm(x, y, z, oct = 5) {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += a * noise(x * f, y * f, z * f);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

function ridged(x, y, z, oct = 4) {
  let a = 0.5, f = 1, sum = 0, norm = 0, prev = 1;
  for (let o = 0; o < oct; o++) {
    let n = 1 - Math.abs(noise(x * f + 11.3, y * f - 4.1, z * f + 2.7));
    n *= n;
    sum += n * a * prev;
    prev = n;
    norm += a;
    a *= 0.5;
    f *= 2.1;
  }
  return sum / norm;
}

// Altura en [-1, 1]: <0 agua, >0 tierra (antes de aplicar el nivel del mar de la piel).
export function rawHeight(x, y, z) {
  // Deformación de dominio para que los continentes no se repitan.
  const wx = x + 0.45 * warpN(x * 1.3, y * 1.3, z * 1.3);
  const wy = y + 0.45 * warpN(x * 1.3 + 5, y * 1.3 + 5, z * 1.3 + 5);
  const wz = z + 0.45 * warpN(x * 1.3 - 5, y * 1.3 - 5, z * 1.3 - 5);
  const continents = fbm(wx * 1.15, wy * 1.15, wz * 1.15, 5);
  const mountains = ridged(wx * 2.6, wy * 2.6, wz * 2.6, 4);
  const detail = fbm(x * 7, y * 7, z * 7, 3) * 0.06;
  const landMask = Math.max(0, continents + 0.05) * 2.2;
  return continents + mountains * landMask * 0.55 + detail;
}

// Nivel 0 = costa. sea > 0 sube el mar (más agua), sea < 0 lo baja (más tierra).
export function heightAt(dir, sea = 0) {
  return rawHeight(dir[0], dir[1], dir[2]) - (0.23 + sea);
}

export function isLand(dir, palette) {
  return heightAt(dir, palette.sea) > 0.005;
}

export const RELIEF = 0.03; // altura máxima de montaña como fracción del radio
export const WATER_LEVEL = 1.0; // la superficie del mar está en r = R

// Radio relativo (1 = nivel del mar) del suelo en esa dirección.
export function groundFactor(h) {
  if (h <= 0) return 1; // el mar es una superficie lisa a nivel 1
  return 1 + Math.pow(h, 1.25) * RELIEF;
}
