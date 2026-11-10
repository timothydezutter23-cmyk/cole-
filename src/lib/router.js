import { useSyncExternalStore } from 'react';

// Las rutas internas son '/mision/activa', pero en la dirección se guardan como
// nombres simples (#mision-activa): funcionan igual en cualquier alojamiento.
const toHash = (path) => path.replace(/^\//, '').replace(/\//g, '-');
const getPath = () => {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return h ? `/${h.replace(/-/g, '/')}` : '/';
};

export function useRoute() {
  return useSyncExternalStore((cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); }, getPath);
}

export function navigate(path, { replace = false } = {}) {
  const hash = toHash(path);
  if (replace) {
    window.history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}
