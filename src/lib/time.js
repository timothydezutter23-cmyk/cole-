export const DAY = 24 * 60 * 60 * 1000;

export const pad = (n) => String(n).padStart(2, '0');

export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Semana natural de lunes a domingo. Clave = fecha del lunes.
export function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}
export const weekKey = (ts = Date.now()) => dayKey(weekStart(ts));

export function slotOf(ts = Date.now()) {
  const h = new Date(ts).getHours();
  if (h >= 6 && h < 12) return 'manana';
  if (h >= 12 && h < 16) return 'mediodia';
  if (h >= 16 && h < 21) return 'tarde';
  return 'noche';
}

export const SLOT_LABEL = { manana: 'Mañana', mediodia: 'Mediodía', tarde: 'Tarde', noche: 'Noche' };

export function formatMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function formatClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h ? `${h}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export function formatHour(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
