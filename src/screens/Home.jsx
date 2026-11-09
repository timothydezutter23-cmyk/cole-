import { useEffect, useState } from 'react';
import Planet from '../components/Planet.jsx';
import { Button, Icon, LightBadge } from '../components/ui.jsx';
import { navigate } from '../lib/router.js';
import {
  useStore, weekMinutes, isLatent, worldStage, totalMinutes, missionById, missionReady, isPostponed, climate,
} from '../lib/store.js';
import { formatMinutes, formatClock, formatHour } from '../lib/time.js';
import { skinById } from '../data/shop.js';

const GREETINGS = [
  'Otra vez tú. Vale, pero que sea rápido.',
  'Esta interfaz está diseñada para que la cierres.',
  'Hola. Entra, elige, sal. Ese es el trato.',
  'Ya que estás aquí, que sirva para algo.',
];

export default function Home() {
  const s = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  const latent = isLatent(s);
  const stage = worldStage(totalMinutes(s));
  const week = weekMinutes(s);
  const active = s.active && missionById(s.active.missionId);
  const ready = missionReady(s);
  const sky = climate(s);

  return (
    <main className="screen home">
      <header className="home-top">
        <div>
          <p className="eyebrow">{skinById(s.skin).name} · {latent ? 'en penumbra' : stage.name}</p>
        </div>
        <div className="home-actions">
          <LightBadge />
          <button type="button" className="icon-btn" onClick={() => navigate('/ajustes')} aria-label="Ajustes"><Icon name="settings" /></button>
        </div>
      </header>

      <div className="home-planet">
        <Planet distance={4} label={`Tu planeta: ${stage.name}, ${sky.name}`} />
        <button type="button" className="craving-fab" onClick={() => navigate('/antojo')} aria-label="Modo antojo: tengo ganas de abrir otra app">
          <Icon name="wave" /><span>Antojo</span>
        </button>
      </div>

      <section className="home-panel">
        {latent && !active && <p className="note">Hoy tu mundo descansa en penumbra. Con la próxima misión vuelve a brillar.</p>}
        {!latent && <p className="greeting">{greeting}</p>}

        <div className="stat">
          <span className="stat-label">Tiempo recuperado esta semana</span>
          <span className="stat-value">{week ? formatMinutes(week) : '—'}</span>
        </div>

        {active ? (
          <button type="button" className={`active-card ${ready ? 'is-ready' : ''}`} onClick={() => navigate('/mision/activa')}>
            <span className="eyebrow">{ready ? 'Misión lista' : 'Misión en curso'}</span>
            <span className="active-title">{active.title}</span>
            <span className="mono">{ready ? 'Toca para cerrarla' : formatClock(s.active.endsAt - now)}</span>
          </button>
        ) : (
          <Button onClick={() => navigate('/mision')}>¿Qué misión toca ahora?</Button>
        )}
        {!active && isPostponed() && <p className="muted small center">Pospuesta hasta las {formatHour(s.postponed.until)}. Si quieres otra, pídela.</p>}

        <nav className="home-nav" aria-label="Secciones">
          <button type="button" onClick={() => navigate('/mundo')}><Icon name="globe" /><span>Mundo</span></button>
          <button type="button" onClick={() => navigate('/tienda')}><Icon name="shop" /><span>Tienda</span></button>
          <button type="button" onClick={() => navigate('/semana')}><Icon name="week" /><span>Semana</span></button>
        </nav>
      </section>

    </main>
  );
}
