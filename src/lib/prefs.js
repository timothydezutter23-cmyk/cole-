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

export function useDarkTheme() {
  const theme = useStore((s) => s.settings.theme);
  const system = useMedia('(prefers-color-scheme: dark)');
  return theme === 'system' ? system : theme === 'dark';
}
