// Estado de Offgrid. Vive entero en el dispositivo (localStorage), sin cuentas.
import { useSyncExternalStore } from 'react';
import { MISSIONS, MICRO_MISSIONS, CATEGORIES, missionById } from '../data/missions.js';
import { SKINS, BOOSTS, itemById, skinById } from '../data/shop.js';
import { DAY, dayKey, weekKey, weekStart, slotOf } from './time.js';
import { heightAt } from './terrain.js';

const KEY = 'offgrid.v1';
export const TEST_SECONDS = 5;
export const LIGHT_PER_MIN = 4.5;
export const STARTER_LIGHT = 150;
export const GOALS = {
  suave: { label: 'Suave', minutes: 60, bonus: 120 },
  normal: { label: 'Normal', minutes: 120, bonus: 200 },
  amplia: { label: 'Amplia', minutes: 240, bonus: 360 },
};
export const MAX_CHANGES = 2;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function defaultState() {
  return {
    version: 1,
    onboarded: false,
    onboardedAt: null,
    profile: { hookApps: [], hookTimes: [], interests: [] },
    settings: { theme: 'system', largeText: false, highContrast: false, reduceMotion: 'system', testMode: false },
    light: STARTER_LIGHT,
    skin: 'tierra',
    ownedSkins: ['tierra'],
    boosts: [],
    inventory: [], // [{uid, itemId}] sin colocar
    placed: [], // [{uid, itemId, dir:[x,y,z], rot}]
    history: [], // misiones completadas
    active: null,
    suggestion: null,
    changes: { day: null, count: 0 },
    postponed: { until: 0, ids: [] },
    weekGoal: 'normal',
    weekClaims: [],
    feats: {},
    cravings: [],
    lastResult: null,
  };
}

let storageOk = true;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings }, profile: { ...base.profile, ...parsed.profile } };
  } catch {
    storageOk = false;
    return defaultState();
  }
}

let state = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater;
  state = { ...state, ...next };
  save();
  listeners.forEach((l) => l());
}

export const getState = () => state;
export const canStore = () => storageOk;

export function useStore(selector = (s) => s) {
  return selector(useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state));
}

// ---------- Derivados ----------

export const totalMinutes = (s = state) => s.history.reduce((a, h) => a + h.minutes, 0);

export function weekMinutes(s = state, ts = Date.now()) {
  const start = weekStart(ts);
  const end = start + 7 * DAY;
  return s.history.filter((h) => h.endedAt >= start && h.endedAt < end).reduce((a, h) => a + h.minutes, 0);
}

export function weekHistory(s = state, ts = Date.now()) {
  const start = weekStart(ts);
  return s.history.filter((h) => h.endedAt >= start && h.endedAt < start + 7 * DAY);
}

// Estados del mundo: empieza negro y se recupera con el tiempo fuera.
export const WORLD_STAGES = [
  { at: 0, name: 'Roca dormida', line: 'Un mundo a oscuras. Solo brilla lo que pones tú.' },
  { at: 30, name: 'Roca despierta', line: 'La piedra recupera su color.' },
  { at: 90, name: 'Mares', line: 'Los océanos empiezan a llenarse.' },
  { at: 180, name: 'Aire', line: 'Llegan las primeras nubes.' },
  { at: 300, name: 'Vida', line: 'Hierba y bosque cubren la tierra.' },
  { at: 480, name: 'Mundo pleno', line: 'Tu planeta está completo. Y sigue siendo tuyo.' },
];

export function worldStage(min = totalMinutes()) {
  let idx = 0;
  WORLD_STAGES.forEach((st, i) => { if (min >= st.at) idx = i; });
  const next = WORLD_STAGES[idx + 1];
  return { index: idx, ...WORLD_STAGES[idx], next, toNext: next ? next.at - min : 0 };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export function worldFactors(min = totalMinutes()) {
  return {
    color: clamp01(min / 30),
    water: clamp01((min - 30) / 60),
    air: clamp01((min - 90) / 90),
    life: clamp01((min - 180) / 120) * 0.75 + clamp01((min - 300) / 180) * 0.25,
  };
}

export function isLatent(s = state, now = Date.now()) {
  const days = s.boosts.includes('amanecer') ? 6 : 3;
  const last = s.history.length ? s.history[s.history.length - 1].endedAt : s.onboardedAt || now;
  return now - last > days * DAY;
}

export function climate(s = state) {
  const wh = weekHistory(s);
  const goal = GOALS[s.weekGoal];
  const mins = wh.reduce((a, h) => a + h.minutes, 0);
  if (wh.length === 0) return { id: 'niebla', name: 'Niebla baja', line: 'Semana tranquila. La niebla se irá sola.' };
  if (mins >= goal.minutes || wh.length >= 6) return { id: 'aurora', name: 'Aurora', line: 'Una semana luminosa. El cielo lo celebra.' };
  if (wh.length <= 2) return { id: 'lluvia', name: 'Lluvia suave', line: 'Llueve un poco. Le viene bien a la tierra.' };
  return { id: 'despejado', name: 'Cielo despejado', line: 'Buen tiempo en tu mundo.' };
}

export function streakDays(s = state, now = Date.now()) {
  const days = new Set(s.history.map((h) => dayKey(h.endedAt)));
  let n = 0;
  let t = now;
  if (!days.has(dayKey(t))) t -= DAY; // si hoy aún no, cuenta desde ayer
  while (days.has(dayKey(t))) { n++; t -= DAY; }
  return n;
}

export function featProgress(s = state) {
  const gente = s.history.filter((h) => h.category === 'gente').length;
  const goalMet = s.weekClaims.length > 0 || weekMinutes(s) >= GOALS[s.weekGoal].minutes;
  return {
    raices: { value: Math.min(7, streakDays(s)), max: 7 },
    farovoces: { value: Math.min(3, gente), max: 3 },
    cumbre: { value: goalMet ? 1 : 0, max: 1 },
  };
}

// ---------- Motor de misiones ----------

export function changesLeft(s = state) {
  return s.changes.day === dayKey() ? Math.max(0, MAX_CHANGES - s.changes.count) : MAX_CHANGES;
}

export function pickMission({ exclude = [], micro = false } = {}) {
  const s = state;
  const pool = micro ? MICRO_MISSIONS : MISSIONS;
  const slot = slotOf();
  const recent = s.history.slice(-14).map((h) => h.missionId);
  const lastCat = s.history.length ? s.history[s.history.length - 1].category : null;
  const interests = s.profile.interests || [];
  const avoid = new Set([...exclude, ...recent, ...(Date.now() < s.postponed.until ? s.postponed.ids : [])]);
  let candidates = pool.filter((m) => !avoid.has(m.id) && (micro || m.slot === slot || m.slot === 'cualquiera'));
  if (candidates.length === 0) candidates = pool.filter((m) => !exclude.includes(m.id));
  const weighted = candidates.map((m) => {
    let w = 1;
    if (m.slot === slot) w += 1;
    if (CATEGORIES[m.category].interests.some((i) => interests.includes(i))) w += 1.5;
    if (m.category === lastCat) w *= 0.4;
    return [m, w];
  });
  const total = weighted.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [mm, w] of weighted) { r -= w; if (r <= 0) return mm; }
  return weighted[0][0];
}

export function currentSuggestion() {
  const s = state;
  const today = dayKey();
  const slot = slotOf();
  if (s.suggestion && s.suggestion.day === today && s.suggestion.slot === slot && missionById(s.suggestion.missionId)) {
    return missionById(s.suggestion.missionId);
  }
  const m = pickMission();
  setState({ suggestion: { missionId: m.id, day: today, slot } });
  return m;
}

export function changeSuggestion() {
  if (changesLeft() <= 0) return null;
  const cur = state.suggestion?.missionId;
  const m = pickMission({ exclude: cur ? [cur] : [] });
  const today = dayKey();
  const count = state.changes.day === today ? state.changes.count + 1 : 1;
  setState({ suggestion: { missionId: m.id, day: today, slot: slotOf() }, changes: { day: today, count } });
  return m;
}

// Posponer silencia la sugerencia automática 3 h y la próxima vez propone otra.
export function postponeSuggestion() {
  const cur = state.suggestion?.missionId;
  const ids = Date.now() < state.postponed.until ? state.postponed.ids : [];
  setState({ postponed: { until: Date.now() + 3 * 60 * 60 * 1000, ids: cur ? [...ids, cur] : ids }, suggestion: null });
}

export const isPostponed = () => Date.now() < state.postponed.until;

export function startMission(missionId, { micro = false } = {}) {
  const m = missionById(missionId);
  const now = Date.now();
  const durMs = state.settings.testMode ? TEST_SECONDS * 1000 : m.minutes * 60 * 1000;
  setState({ active: { missionId, startedAt: now, endsAt: now + durMs, micro }, suggestion: null });
}

export function cancelMission() {
  setState({ active: null });
}

export const missionReady = (s = state) => !!s.active && Date.now() >= s.active.endsAt;

function grantFeats(s) {
  const prog = featProgress(s);
  const granted = [];
  const feats = { ...s.feats };
  const inventory = [...s.inventory];
  Object.entries(prog).forEach(([id, p]) => {
    if (!feats[id] && p.value >= p.max) {
      feats[id] = Date.now();
      inventory.push({ uid: uid(), itemId: id });
      granted.push(id);
    }
  });
  return { feats, inventory, granted };
}

export function completeMission() {
  const s = state;
  if (!s.active) return null;
  const m = missionById(s.active.missionId);
  const light = Math.round(m.minutes * LIGHT_PER_MIN);
  const wasLatent = isLatent(s);
  const stageBefore = worldStage(totalMinutes(s)).index;
  const entry = {
    id: uid(), missionId: m.id, category: m.category, minutes: m.minutes,
    startedAt: s.active.startedAt, endedAt: Date.now(), feeling: null, light,
  };
  const mid = { ...s, history: [...s.history, entry] };
  const { feats, inventory, granted } = grantFeats(mid);
  const stageAfter = worldStage(totalMinutes(mid)).index;
  const result = { entryId: entry.id, missionId: m.id, light, feats: granted, wasLatent, newStage: stageAfter > stageBefore ? stageAfter : null };
  setState({ history: mid.history, light: s.light + light, active: null, feats, inventory, lastResult: result });
  return result;
}

export function setFeeling(entryId, feeling) {
  setState((s) => ({ history: s.history.map((h) => (h.id === entryId ? { ...h, feeling } : h)) }));
}

export function logCraving(action) {
  setState((s) => ({ cravings: [...s.cravings.slice(-200), { ts: Date.now(), action }] }));
}

// ---------- Semana ----------

export function weekClaimable(s = state) {
  return weekMinutes(s) >= GOALS[s.weekGoal].minutes && !s.weekClaims.includes(weekKey());
}

export function claimWeek() {
  if (!weekClaimable()) return false;
  const bonus = GOALS[state.weekGoal].bonus;
  const mid = { ...state, weekClaims: [...state.weekClaims, weekKey()] };
  const { feats, inventory, granted } = grantFeats(mid);
  setState({ weekClaims: mid.weekClaims, light: state.light + bonus, feats, inventory });
  return { bonus, feats: granted };
}

// ---------- Tienda y mundo ----------

export function buyItem(itemId) {
  const it = itemById(itemId);
  if (!it || it.price == null || state.light < it.price) return false;
  setState((s) => ({ light: s.light - it.price, inventory: [...s.inventory, { uid: uid(), itemId }] }));
  return true;
}

export function buySkin(skinId) {
  const sk = SKINS.find((x) => x.id === skinId);
  if (!sk || state.ownedSkins.includes(skinId) || state.light < sk.price) return false;
  setState((s) => ({ light: s.light - sk.price, ownedSkins: [...s.ownedSkins, skinId], skin: skinId }));
  return true;
}

export function buyBoost(boostId) {
  const b = BOOSTS.find((x) => x.id === boostId);
  if (!b || state.boosts.includes(boostId) || state.light < b.price) return false;
  setState((s) => ({ light: s.light - b.price, boosts: [...s.boosts, boostId] }));
  return true;
}

export function selectSkin(skinId) {
  if (state.ownedSkins.includes(skinId)) setState({ skin: skinId });
}

export function canPlaceAt(itemId, dir, skinId = state.skin) {
  const it = itemById(itemId);
  // Un pequeño margen en la orilla para que nada quede a medias entre tierra y mar.
  const h = heightAt(dir, skinById(skinId).palette.sea);
  if (it.place === 'water') return h < -0.015 && Math.abs(dir[1]) < 0.82;
  if (it.place === 'land') return h > 0.015;
  return true;
}

export function placeItem(invUid, dir, rot = 0) {
  const inv = state.inventory.find((i) => i.uid === invUid);
  if (!inv || !canPlaceAt(inv.itemId, dir)) return false;
  setState((s) => ({
    inventory: s.inventory.filter((i) => i.uid !== invUid),
    placed: [...s.placed, { uid: inv.uid, itemId: inv.itemId, dir, rot }],
  }));
  return true;
}

export function movePlaced(placedUid, dir, rot) {
  const p = state.placed.find((x) => x.uid === placedUid);
  if (!p || !canPlaceAt(p.itemId, dir)) return false;
  setState((s) => ({ placed: s.placed.map((x) => (x.uid === placedUid ? { ...x, dir, rot } : x)) }));
  return true;
}

export function rotatePlaced(placedUid, delta) {
  setState((s) => ({ placed: s.placed.map((x) => (x.uid === placedUid ? { ...x, rot: (x.rot + delta) % (Math.PI * 2) } : x)) }));
}

export function pickUp(placedUid) {
  const p = state.placed.find((x) => x.uid === placedUid);
  if (!p) return;
  setState((s) => ({ placed: s.placed.filter((x) => x.uid !== placedUid), inventory: [...s.inventory, { uid: p.uid, itemId: p.itemId }] }));
}

function randomDir() {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(t), u, r * Math.sin(t)];
}

export function randomValidDir(itemId, skinId = state.skin) {
  for (let i = 0; i < 400; i++) {
    const d = randomDir();
    if (Math.abs(d[1]) > 0.86) continue; // evita los casquetes polares
    if (canPlaceAt(itemId, d, skinId)) return d;
  }
  return null;
}

export function scatterInventory() {
  const placed = [...state.placed];
  const inventory = [];
  state.inventory.forEach((inv) => {
    const d = randomValidDir(inv.itemId);
    if (d) placed.push({ uid: inv.uid, itemId: inv.itemId, dir: d, rot: Math.random() * Math.PI * 2 });
    else inventory.push(inv);
  });
  setState({ placed, inventory });
}

// ---------- Onboarding, ajustes, copia ----------

export function finishOnboarding({ profile, skin }) {
  const starter = ['arbol', 'arbol', 'arbol', 'roca', 'roca', 'luciernagas'];
  const placed = [];
  starter.forEach((itemId) => {
    const d = randomValidDir(itemId, skin);
    if (d) placed.push({ uid: uid(), itemId, dir: d, rot: Math.random() * Math.PI * 2 });
  });
  setState({ onboarded: true, onboardedAt: Date.now(), profile, skin, ownedSkins: [...new Set(['tierra', skin])], placed });
}

export function updateSettings(patch) {
  setState((s) => {
    const next = { settings: { ...s.settings, ...patch } };
    // Al activar el modo prueba, la misión que ya esté en marcha también se acorta.
    if (patch.testMode && s.active) {
      const soon = Date.now() + TEST_SECONDS * 1000;
      if (s.active.endsAt > soon) next.active = { ...s.active, endsAt: soon, startedAt: Math.min(s.active.startedAt, soon - 1000) };
    }
    return next;
  });
}

export const exportBackup = () => JSON.stringify({ app: 'offgrid', exportedAt: new Date().toISOString(), state }, null, 2);

export function importBackup(text) {
  const parsed = JSON.parse(text);
  if (parsed?.app !== 'offgrid' || !parsed.state) throw new Error('No parece una copia de Offgrid.');
  setState({ ...defaultState(), ...parsed.state });
}

export function resetAll() {
  state = defaultState();
  save();
  listeners.forEach((l) => l());
}

export { missionById, itemById, skinById };
