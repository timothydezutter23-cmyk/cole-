import { useEffect, useState } from 'react';
import Planet from '../components/Planet.jsx';
import { Button, Icon, TopBar } from '../components/ui.jsx';
import { navigate } from '../lib/router.js';
import { useStore, logCraving, pickMission, startMission, TEST_SECONDS } from '../lib/store.js';
import { formatClock } from '../lib/time.js';

function Countdown({ seconds, onDone, children }) {
  const [end] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => { if (now >= end) onDone(); }, [now, end, onDone]);
  return children(Math.max(0, end - now));
}

export default function Craving() {
  const test = useStore((s) => s.settings.testMode);
  const active = useStore((s) => s.active);
  const [mode, setMode] = useState(null); // breathe | wait | done
  const [micro, setMicro] = useState(null);

  const choose = (m) => {
    logCraving(m);
    if (m === 'micro') setMicro(pickMission({ micro: true }));
    else setMode(m);
  };

  if (mode === 'breathe') {
    return (
      <main className="screen craving-run">
        <Countdown seconds={test ? TEST_SECONDS : 60} onDone={() => setMode('done')}>
          {(left) => (
            <>
              <div className="breath" aria-hidden="true"><span /></div>
              <p className="lead center">Dentro cuatro. Fuera seis.</p>
              <p className="mono muted center">{formatClock(left)}</p>
            </>
          )}
        </Countdown>
        <button type="button" className="link" onClick={() => navigate('/')}>Salir</button>
      </main>
    );
  }

  if (mode === 'wait') {
    return (
      <main className="screen craving-wait">
        <div className="wait-planet"><Planet interactive={false} distance={3.6} /></div>
        <Countdown seconds={test ? TEST_SECONDS : 600} onDone={() => setMode('done')}>
          {(left) => (
            <div className="wait-panel">
              <p className="mono clock">{formatClock(left)}</p>
              <p className="lead center">Diez minutos. Si sigues con ganas después, al menos habrá sido decisión tuya.</p>
            </div>
          )}
        </Countdown>
        <button type="button" className="link" onClick={() => navigate('/')}>Salir</button>
      </main>
    );
  }

  if (mode === 'done') {
    return (
      <main className="screen craving-run">
        <h1 className="display center">Ya está.</h1>
        <p className="lead center">¿Se ha ido el antojo? Si no, tampoco pasa nada. Lo has mirado de frente.</p>
        <Button onClick={() => navigate('/')}>Volver</Button>
      </main>
    );
  }

  return (
    <main className="screen">
      <TopBar title="Antojo" />
      <section className="craving-head">
        <h1 className="display">¿Ganas de abrir otra app?</h1>
        <p className="lead">Normal. Pasa. Elige una de estas y luego haz lo que quieras.</p>
      </section>

      {micro ? (
        <section className="panel">
          <p className="eyebrow">Micro-misión · {micro.minutes} min</p>
          <p className="panel-title big">{micro.title}</p>
          <p className="muted">{micro.note}</p>
          <div className="row">
            <Button disabled={!!active} onClick={() => { startMission(micro.id, { micro: true }); navigate('/mision/activa'); }}>Vamos</Button>
            <Button variant="ghost" onClick={() => setMicro(pickMission({ micro: true, exclude: [micro.id] }))}>Otra</Button>
          </div>
          {active && <p className="muted small">Ya tienes una misión en curso. Esa cuenta igual.</p>}
        </section>
      ) : (
        <ul className="craving-options">
          <li><button type="button" onClick={() => choose('breathe')}><Icon name="breath" size={24} /><span><strong>Respirar 1 minuto</strong><small>Solo eso.</small></span></button></li>
          <li><button type="button" onClick={() => choose('micro')}><Icon name="spark" size={24} /><span><strong>Micro-misión</strong><small>De 2 a 5 minutos, con luz para tu mundo.</small></span></button></li>
          <li><button type="button" onClick={() => choose('wait')}><Icon name="hourglass" size={24} /><span><strong>Esperar 10 minutos</strong><small>Con tu mundo de fondo.</small></span></button></li>
        </ul>
      )}
    </main>
  );
}
