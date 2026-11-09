import { useEffect, useState } from 'react';
import { useStore } from './store.js';

function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const h = () => setMatch(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [query]);
  return !!match;
}

// Respeta "reducir movimiento" del sistema salvo que el usuario elija otra cosa.
export function useReducedMotion() {
  const pref = useStore((s) => s.settings.reduceMotion);
  const system = useMedia('(prefers-reduced-motion: reduce)');
  return pref === 'system' ? system : !!pref;
}

// Tema elegido por el visor que aloja la página (si lo hay), vía data-theme.
function useHostTheme() {
  const read = () => document.documentElement.getAttribute('data-theme');
  const [host, setHost] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setHost(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return host;
}

export function useDarkTheme() {
  const theme = useStore((s) => s.settings.theme);
  const system = useMedia('(prefers-color-scheme: dark)');
  const host = useHostTheme();
  if (theme !== 'system') return theme === 'dark';
  if (host === 'dark' || host === 'light') return host === 'dark';
  return system;
}
