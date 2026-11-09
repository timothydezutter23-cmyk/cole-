import { useSyncExternalStore } from 'react';

const getPath = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0];

export function useRoute() {
  return useSyncExternalStore((cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); }, getPath);
}

export function navigate(path, { replace = false } = {}) {
  const url = `#${path}`;
  if (replace) {
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
}
