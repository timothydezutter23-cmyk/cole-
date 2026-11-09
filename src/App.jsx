import { useEffect } from 'react';
import { useRoute, navigate } from './lib/router.js';
import { useStore } from './lib/store.js';
import { useDarkTheme, useReducedMotion } from './lib/prefs.js';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import { MissionPick, MissionActive, MissionDone } from './screens/Mission.jsx';
import World from './screens/World.jsx';
import Shop from './screens/Shop.jsx';
import Week from './screens/Week.jsx';
import Craving from './screens/Craving.jsx';
import Settings from './screens/Settings.jsx';

const ROUTES = {
  '/': Home,
  '/onboarding': Onboarding,
  '/mision': MissionPick,
  '/mision/activa': MissionActive,
  '/mision/hecha': MissionDone,
  '/mundo': World,
  '/tienda': Shop,
  '/semana': Week,
  '/antojo': Craving,
  '/ajustes': Settings,
};

export default function App() {
  const route = useRoute();
  const onboarded = useStore((s) => s.onboarded);
  const settings = useStore((s) => s.settings);
  const dark = useDarkTheme();
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.classList.toggle('large-text', !!settings.largeText);
    root.classList.toggle('high-contrast', !!settings.highContrast);
    root.classList.toggle('reduce-motion', reduce);
  }, [dark, settings.largeText, settings.highContrast, reduce]);

  useEffect(() => {
    if (!onboarded && route !== '/onboarding') navigate('/onboarding', { replace: true });
    if (onboarded && route === '/onboarding') navigate('/', { replace: true });
  }, [onboarded, route]);

  useEffect(() => { window.scrollTo(0, 0); }, [route]);

  const Screen = ROUTES[route] || Home;
  if (!onboarded && route !== '/onboarding') return null;
  return <div className="app" key={route}><Screen /></div>;
}
