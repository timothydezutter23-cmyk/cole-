import { navigate } from '../lib/router.js';
import { useStore } from '../lib/store.js';

// Iconos de línea propios (1.5px). Nada de emojis para el progreso.
const paths = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 13a7.5 7.5 0 000-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 00-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 00-1.7 1l-2.3-.9-2 3.4L6.6 11a7.5 7.5 0 000 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.7 1l.4 2.5h4l.4-2.5c.6-.2 1.2-.6 1.7-1l2.3.9 2-3.4z',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z',
  shop: 'M4 8h16l-1.2 11.2a1 1 0 01-1 .8H6.2a1 1 0 01-1-.8L4 8zM8.5 8V6.5a3.5 3.5 0 017 0V8',
  week: 'M4 6.5h16v13H4zM4 10.5h16M8.5 4v4M15.5 4v4',
  wave: 'M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0',
  rotate: 'M20 12a8 8 0 11-2.3-5.6M20 4v4.5h-4.5',
  move: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  pickup: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3M4 17h3c1.7 0 2.8-1.1 3.7-2.6M14 9.6C14.9 8.1 16 7 17.7 7H20M17 4l3 3-3 3M17 14l3 3-3 3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  light: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l-1.4-1.4M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 16a4 4 0 100-8 4 4 0 000 8z',
  breath: 'M12 20a8 8 0 100-16 8 8 0 000 16zM12 15a3 3 0 100-6 3 3 0 000 6z',
  hourglass: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9',
  spark: 'M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z',
  // Sensaciones (sin emojis): bien / igual / cansado
  feelUp: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 14c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2M9 9.5h.01M15 9.5h.01',
  feelFlat: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 15h7M9 9.5h.01M15 9.5h.01',
  feelLow: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 15.5h7M8 10h2.5M13.5 10H16',
};

export function Icon({ name, size = 20, className = '', label }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      <path d={paths[name]} />
    </svg>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button type="button" className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

export function Chip({ selected, children, ...props }) {
  return <button type="button" className={`chip ${selected ? 'is-on' : ''}`} aria-pressed={!!selected} {...props}>{children}</button>;
}

export function LightBadge() {
  const light = useStore((s) => s.light);
  return (
    <span className="light-badge" aria-label={`${light} de luz`}>
      <Icon name="light" size={16} />
      <span className="mono">{light}</span>
    </span>
  );
}

export function TopBar({ title, back = '/', right }) {
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={() => navigate(back)} aria-label="Volver">
        <Icon name="back" />
      </button>
      <span className="topbar-title">{title}</span>
      <span className="topbar-right">{right ?? <LightBadge />}</span>
    </header>
  );
}

export function Progress({ value, max = 1, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
