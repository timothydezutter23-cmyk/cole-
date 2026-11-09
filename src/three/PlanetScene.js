// Escena del planeta: render, cámara, interacción (girar, acercar, tocar) y piezas.
import * as THREE from 'three';
import { skinById } from '../data/shop.js';
import { itemById } from '../data/shop.js';
import { heightAt, groundFactor } from '../lib/terrain.js';
import {
  buildTerrain, terrainMaterial, setTerrainLook, buildClouds, buildAtmosphere,
  buildStars, buildRings, buildAurora, buildRain, buildFog,
} from './planet.js';
import { buildItem, makeGhost } from './items.js';

export const ITEM_SCALE = 0.045; // altura de una pieza como fracción del radio del planeta
const UP = new THREE.Vector3(0, 1, 0);
const MIN_DIST = 1.7;
const MAX_DIST = 5.5;

export class PlanetScene {
  constructor(container, { interactive = true, autoSpin = true, distance = 3.4, transparent = true } = {}) {
    this.container = container;
    this.interactive = interactive;
    this.autoSpin = autoSpin;
    this.reduceMotion = false;
    this.distance = distance;
    this.onTap = null;
    this.onHover = null;
    this.objects = new Map(); // uid -> group
    this.selected = null;
    this.world = null;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: transparent, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.display = 'block';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
    this.camera.position.set(0, 0, distance);

    // Sol desde la izquierda y algo por delante: se ve el día, el atardecer y
    // una franja de noche en el borde derecho, como en una foto desde el espacio.
    this.sunDir = new THREE.Vector3(-0.78, 0.32, 0.54).normalize();
    this.sun = new THREE.DirectionalLight('#fff6ea', 3.0);
    this.sun.position.copy(this.sunDir).multiplyScalar(10);
    this.hemi = new THREE.HemisphereLight('#c9d8ff', '#1a1612', 0.12);
    this.ambient = new THREE.AmbientLight('#8fa3c8', 0.05);
    this.cloudRot = { value: 0 };
    this.fogRot = { value: 1.7 };
    this.scene.add(this.sun, this.hemi, this.ambient);

    this.planet = new THREE.Group();
    this.planet.rotation.set(0.35, -0.6, 0);
    this.scene.add(this.planet);
    this.objectLayer = new THREE.Group();
    this.planet.add(this.objectLayer);

    this.stars = buildStars(500);
    this.scene.add(this.stars);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointers = new Map();
    this.drag = null;
    this.lastInteraction = 0;

    this._resize = () => this.resize();
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(container);
    this.resize();

    if (interactive) this._bindPointer();
    this._visibility = () => { if (!document.hidden) this.clock.getDelta(); };
    document.addEventListener('visibilitychange', this._visibility);
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    // En pantallas estrechas alejamos la cámara para que quepa el planeta entero.
    this.fitFactor = Math.max(1, 1 / this.camera.aspect);
    this.camera.position.z = this.distance * this.fitFactor;
    this.camera.updateProjectionMatrix();
  }

  // ---------- Mundo ----------
  setWorld({ skinId, factors, latent = false, boosts = [], climateId = null, night = false }) {
    const key = JSON.stringify({ skinId, factors, latent, boosts, climateId, night });
    if (key === this._worldKey) return;
    const prevSkin = this.world?.skinId;
    this._worldKey = key;
    this.world = { skinId, factors, latent, boosts, climateId, night };
    const palette = skinById(skinId).palette;

    if (skinId !== prevSkin) {
      if (this.terrain) { this.planet.remove(this.terrain); this.terrain.geometry.dispose(); }
      if (!this.terrainMat) this.terrainMat = terrainMaterial(this.cloudRot);
      this.terrain = new THREE.Mesh(buildTerrain(palette), this.terrainMat);
      this.planet.add(this.terrain);
      if (!this.clouds) { this.clouds = buildClouds(this.cloudRot); this.planet.add(this.clouds); }
      if (this.atmo) this.scene.remove(this.atmo);
      this.atmo = buildAtmosphere(palette.atmosphere);
      this.atmo.userData.uniforms.uSun.value.copy(this.sunDir);
      this.scene.add(this.atmo);
      this.palette = palette;
      // Las piezas se reapoyan sobre el nuevo relieve.
      this.objects.forEach((g, uid) => this._positionObject(g, g.userData.placed));
    }
    setTerrainLook(this.terrainMat, palette, factors);

    this.clouds.material.opacity = Math.min(1, factors.air * palette.clouds * 1.15) * (latent ? 0.6 : 1);
    this.clouds.visible = factors.air > 0.01;
    this.atmo.userData.uniforms.uStrength.value = 0.15 + factors.air * 0.85;

    // Mejoras
    const wantRings = boosts.includes('anillos');
    if (wantRings && !this.rings) { this.rings = buildRings(); this.planet.add(this.rings); }
    if (this.rings) this.rings.visible = wantRings;
    const wantAurora = boosts.includes('aurora') || palette.aurora || climateId === 'aurora';
    if (wantAurora && !this.aurora) { this.aurora = buildAurora(palette.aurora ? '#b98cff' : '#6ff0c0'); this.planet.add(this.aurora); }
    if (this.aurora) this.aurora.visible = wantAurora;
    const starCount = boosts.includes('estrellas') ? 1800 : 500;
    if (this.stars.geometry.attributes.position.count !== starCount) {
      this.scene.remove(this.stars);
      this.stars = buildStars(starCount);
      this.scene.add(this.stars);
    }

    // Clima
    const wantRain = climateId === 'lluvia';
    if (wantRain && !this.rain) { this.rain = buildRain(); this.planet.add(this.rain); }
    if (this.rain) this.rain.visible = wantRain;
    const wantFog = climateId === 'niebla' || latent;
    if (wantFog && !this.fog) { this.fog = buildFog(this.fogRot); this.planet.add(this.fog); }
    if (this.fog) this.fog.visible = wantFog;

    // Penumbra y noche: solo cambia la luz, nunca lo construido.
    const dim = (latent ? 0.72 : 1) * (night ? 0.7 : 1) * (0.35 + 0.65 * factors.color);
    this.sun.intensity = 3.0 * dim;
    this.sun.color.set(night ? '#d6defa' : '#fff6ea');
    this.hemi.intensity = 0.12 * dim + (night ? 0.06 : 0);
    // Ambiente bajo: el lado de noche queda oscuro pero se intuye.
    this.ambient.intensity = 0.05 + (1 - factors.color) * 0.15;
  }

  // ---------- Piezas ----------
  _positionObject(g, placed) {
    const dir = new THREE.Vector3(...placed.dir).normalize();
    const it = itemById(placed.itemId);
    const h = heightAt([dir.x, dir.y, dir.z], this.palette?.sea ?? 0);
    const r = it?.place === 'water' ? Math.max(1.0, groundFactor(h)) : groundFactor(Math.max(h, 0)) - 0.001;
    g.position.copy(dir).multiplyScalar(r);
    g.quaternion.setFromUnitVectors(UP, dir);
    g.rotateY(placed.rot || 0);
    g.scale.setScalar(ITEM_SCALE * (g.userData.scale || 1));
  }

  setPlaced(list) {
    const seen = new Set();
    list.forEach((p) => {
      seen.add(p.uid);
      let g = this.objects.get(p.uid);
      const prev = g?.userData.placed;
      if (!g) {
        g = buildItem(p.itemId);
        g.userData.uid = p.uid;
        this.objects.set(p.uid, g);
        this.objectLayer.add(g);
      }
      if (!prev || prev.dir !== p.dir || prev.rot !== p.rot) {
        g.userData.placed = p;
        this._positionObject(g, p);
      }
    });
    this.objects.forEach((g, uid) => {
      if (!seen.has(uid)) { this.objectLayer.remove(g); this.objects.delete(uid); }
    });
    this._applySelection();
  }

  setSelected(uid) {
    this.selected = uid;
    this._applySelection();
  }

  _applySelection() {
    if (!this.selRing) {
      this.selRing = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.6, 40),
        new THREE.MeshBasicMaterial({ color: '#f4efe6', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
      );
      this.selRing.rotation.x = -Math.PI / 2;
      this.selRing.position.y = 0.03;
    }
    if (this.selRing.parent) this.selRing.parent.remove(this.selRing);
    const g = this.selected && this.objects.get(this.selected);
    if (g) g.add(this.selRing);
  }

  setGhost(ghost) {
    const key = ghost ? `${ghost.itemId}|${ghost.valid}` : null;
    if (key !== this._ghostKey) {
      if (this.ghost) this.planet.remove(this.ghost);
      this.ghost = ghost ? makeGhost(ghost.itemId, ghost.valid) : null;
      if (this.ghost) this.planet.add(this.ghost);
      this._ghostKey = key;
    }
    if (this.ghost && ghost.dir) {
      this.ghost.visible = true;
      this._positionObject(this.ghost, { itemId: ghost.itemId, dir: ghost.dir, rot: ghost.rot });
    } else if (this.ghost) {
      this.ghost.visible = false;
    }
  }

  // Gira el planeta para poner una dirección de frente a la cámara.
  focusDir(dir) {
    const d = new THREE.Vector3(...dir).normalize();
    const target = new THREE.Quaternion().setFromUnitVectors(d, new THREE.Vector3(0, 0, 1));
    this._focus = { from: this.planet.quaternion.clone(), to: target, t: 0 };
  }

  // ---------- Interacción ----------
  _bindPointer() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
      else this.drag = { ...this.drag, moved: true, pinch: this._pinchDist() };
      this.lastInteraction = performance.now();
      this._focus = null;
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) {
        if (e.pointerType === 'mouse' && this.onHover) this.onHover(this._pick(e));
        return;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.lastInteraction = performance.now();
      if (this.pointers.size >= 2) {
        const d = this._pinchDist();
        if (this.drag?.pinch) this._zoom(this.drag.pinch / d);
        this.drag.pinch = d;
        return;
      }
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (Math.hypot(e.clientX - this.drag.sx, e.clientY - this.drag.sy) > 6) this.drag.moved = true;
      if (this.drag.moved) this._rotate(dx, dy);
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      if (e.pointerType === 'mouse' && this.onHover) this.onHover(this._pick(e));
    });
    const end = (e) => {
      const wasTap = this.drag && !this.drag.moved && this.pointers.size === 1;
      this.pointers.delete(e.pointerId);
      if (wasTap && e.type === 'pointerup' && this.onTap) this.onTap(this._pick(e));
      if (this.pointers.size === 0) this.drag = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => { e.preventDefault(); this._zoom(1 + Math.sign(e.deltaY) * 0.08); this.lastInteraction = performance.now(); }, { passive: false });
  }

  _pinchDist() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  _zoom(f) {
    this.distance = Math.max(MIN_DIST, Math.min(MAX_DIST, this.distance * f));
    this.camera.position.z = this.distance * this.fitFactor;
  }

  // El planeta sigue al dedo como un globo terráqueo: arrastrar hacia abajo
  // baja la cara visible, arrastrar a la derecha la lleva a la derecha.
  _rotate(dx, dy) {
    const speed = (2.2 / (this.container.clientHeight || 400)) * (this.distance / 3.4);
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * speed);
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * speed);
    this.planet.quaternion.premultiply(qy).premultiply(qx);
  }

  _pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    let hitUid = null;
    const objHits = this.raycaster.intersectObjects([...this.objects.values()], true);
    if (objHits.length) {
      let o = objHits[0].object;
      while (o && !o.userData.uid) o = o.parent;
      hitUid = o?.userData.uid || null;
    }
    const hits = this.terrain ? this.raycaster.intersectObject(this.terrain, false) : [];
    let dir = null;
    if (hits.length) {
      const local = this.planet.worldToLocal(hits[0].point.clone()).normalize();
      dir = [local.x, local.y, local.z];
    }
    return { dir, uid: hitUid };
  }

  // ---------- Bucle ----------
  _loop() {
    this._raf = requestAnimationFrame(this._loop);
    if (document.hidden) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    const calm = this.reduceMotion;

    if (this._focus) {
      this._focus.t = Math.min(1, this._focus.t + dt * 1.8);
      const k = 1 - Math.pow(1 - this._focus.t, 3);
      this.planet.quaternion.slerpQuaternions(this._focus.from, this._focus.to, k);
      if (this._focus.t >= 1) this._focus = null;
    } else if (this.autoSpin && !calm && performance.now() - this.lastInteraction > 4000) {
      this.planet.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(UP, dt * 0.05));
    }
    if (!calm) {
      this.cloudRot.value += dt * 0.008;
      if (this.fog?.visible) this.fogRot.value -= dt * 0.012;
      if (this.rain?.visible) this.rain.userData.tick(dt);
      if (this.aurora?.visible) this.aurora.userData.material.uniforms.uTime.value = t;
      if (this.rings) this.rings.rotation.z += dt * 0.02;
      this.objects.forEach((g) => g.userData.tick && g.userData.tick(t));
      if (this.ghost?.userData.tick) this.ghost.userData.tick(t);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    document.removeEventListener('visibilitychange', this._visibility);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// Vista previa de una sola pieza girando sobre un pedestal (tienda).
export class ItemPreview {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(0, 1.3, 3.6);
    this.camera.lookAt(0, 0.45, 0);
    const sun = new THREE.DirectionalLight('#fff4e3', 2.4);
    sun.position.set(-3, 4, 4);
    this.scene.add(sun, new THREE.HemisphereLight('#e6eeff', '#3a3028', 0.8));
    this.stage = new THREE.Group();
    this.scene.add(this.stage);
    this.clock = new THREE.Clock();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(container);
    this.resize();
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  show(itemId) {
    this.stage.clear();
    const it = itemById(itemId);
    const water = it?.place === 'water';
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.15, 0.08, 48),
      new THREE.MeshStandardMaterial({ color: water ? '#3f7f9a' : '#8aa070', roughness: water ? 0.25 : 0.95, transparent: water, opacity: water ? 0.85 : 1 }),
    );
    base.position.y = -0.04;
    this.stage.add(base);
    this.item = buildItem(itemId);
    const s = water ? 0.85 : 1;
    this.item.scale.setScalar(s);
    this.stage.add(this.item);
  }

  _loop() {
    this._raf = requestAnimationFrame(this._loop);
    if (document.hidden) return;
    const t = this.clock.getElapsedTime();
    this.stage.rotation.y = t * 0.4;
    if (this.item?.userData.tick) this.item.userData.tick(t);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
