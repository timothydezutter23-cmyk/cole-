import { useEffect, useState } from 'react';
import { Button, Icon, TopBar } from '../components/ui.jsx';
import { navigate } from '../lib/router.js';
import {
  useStore, currentSuggestion, changeSuggestion, postponeSuggestion, startMission, cancelMission, completeMission,
  changesLeft, missionById, setFeeling, LIGHT_PER_MIN, TEST_SECONDS,
} from '../lib/store.js';
import { CATEGORIES } from '../data/missions.js';
import { itemById } from '../data/shop.js';
import { formatClock, SLOT_LABEL, slotOf } from '../lib/time.js';

export function MissionPick() {
  const s = useStore();
  const [mission, setMission] = useState(null);
  const [leftMsg, setLeftMsg] = useState(null);

  useEffect(() => {
    if (s.active) { navigate('/mision/activa', { replace: true }); return; }
    setMission(currentSuggestion());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mission) return null;
  const left = changesLeft(s);
  const cat = CATEGORIES[mission.category];

  const change = () => {
    const m = changeSuggestion();
    if (m) setMission(m);
    else setLeftMsg('Ya cambiaste dos veces hoy. Esta también está bien, palabra.');
  };
  const postpone = () => { postponeSuggestion(); navigate('/'); };
  const accept = () => { startMission(mission.id); navigate('/mision/activa'); };

  return (
    <main className="screen">
      <TopBar title={SLOT_LABEL[slotOf()]} />
      <section className="mission-card">
        <p className="eyebrow cat" data-cat={mission.category}>{cat.label} · {mission.minutes} min</p>
        <h1 className="display">{mission.title}</h1>
        <p className="lead">{mission.note}</p>
        <p className="muted small">Al volver: {Math.round(mission.minutes * LIGHT_PER_MIN)} de luz para tu mundo.</p>
        {s.settings.testMode && <p className="note small">Modo prueba activo: esta misión durará {TEST_SECONDS} segundos.</p>}
      </section>
      <div className="stack">
        <Button onClick={accept}>Acepto</Button>
        <div className="row">
          <Button variant="ghost" onClick={change} disabled={left === 0}>Cambiar ({left})</Button>
          <Button variant="ghost" onClick={postpone}>Para luego</Button>
        </div>
        {leftMsg && <p className="muted small center">{leftMsg}</p>}
      </div>
    </main>
  );
}

const LINES = [
  'Puedes cerrar la app. El tiempo sigue contando.',
  'Esto es contigo. Nadie lo comprueba.',
  'Si te olvidas del móvil, mejor que mejor.',
];

export function MissionActive() {
  const s = useStore();
  const [now, setNow] = useState(Date.now());
  const [line] = useState(() => LINES[Math.floor(Math.random() * LINES.length)]);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!s.active) navigate('/', { replace: true });
  }, [s.active]);
  useEffect(() => {
    if (s.active && now >= s.active.endsAt) {
      completeMission();
      navigate('/mision/hecha', { replace: true });
    }
  }, [now, s.active]);

  if (!s.active) return null;
  const m = missionById(s.active.missionId);
  const total = s.active.endsAt - s.active.startedAt;
  const left = Math.max(0, s.active.endsAt - now);
  const frac = 1 - left / total;
  const R = 110;
  const C = 2 * Math.PI * R;

  return (
    <main className="screen active-screen">
      <div className="ring-wrap">
        <svg viewBox="0 0 260 260" className="ring" aria-hidden="true">
          <circle cx="130" cy="130" r={R} className="ring-bg" />
          <circle cx="130" cy="130" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 130 130)" />
        </svg>
        <div className="ring-center">
          <span className="clock mono" role="timer" aria-live="off">{formatClock(left)}</span>
          <span className="muted small">{m.title}</span>
        </div>
      </div>
      <p className="lead center">{line}</p>
      {s.settings.testMode && <p className="muted small center">Modo prueba: {TEST_SECONDS} s.</p>}
      {!confirm ? (
        <button type="button" className="link" onClick={() => setConfirm(true)}>Dejarlo por hoy</button>
      ) : (
        <div className="row center">
          <Button variant="ghost" onClick={() => { cancelMission(); navigate('/'); }}>Sí, dejarlo</Button>
          <Button variant="quiet" onClick={() => setConfirm(false)}>Sigo</Button>
        </div>
      )}
    </main>
  );
}

const FEELINGS = [['bien', 'feelUp', 'Bien'], ['igual', 'feelFlat', 'Igual'], ['cansado', 'feelLow', 'Cansado']];

export function MissionDone() {
  const s = useStore();
  const r = s.lastResult;
  const [feeling, setF] = useState(null);
  useEffect(() => { if (!r) navigate('/', { replace: true }); }, [r]);
  if (!r) return null;
  const m = missionById(r.missionId);
  const pick = (f) => { setF(f); setFeeling(r.entryId, f); };

  return (
    <main className="screen done-screen">
      <section className="done-head">
        <p className="eyebrow">Hecho</p>
        <h1 className="display">{m.title}</h1>
        <p className="lead">+{r.light} de luz. {r.wasLatent ? 'Tu mundo vuelve a brillar.' : 'Tu mundo lo nota.'}</p>
        {r.newStage != null && <p className="note">Tu planeta ha cambiado de etapa. Échale un ojo.</p>}
        {r.feats.map((f) => (
          <p key={f} className="note feat"><Icon name="spark" size={16} /> Gesta conseguida: <strong>{itemById(f).name}</strong>. Ya puedes colocarla.</p>
        ))}
      </section>

      <section className="feel">
        <p className="muted">¿Cómo te sentiste? <span className="small">(opcional)</span></p>
        <div className="feel-row" role="group" aria-label="Cómo te sentiste">
          {FEELINGS.map(([id, icon, label]) => (
            <button key={id} type="button" className={`feel-btn ${feeling === id ? 'is-on' : ''}`} onClick={() => pick(id)} aria-pressed={feeling === id}>
              <Icon name={icon} size={30} /><span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="stack">
        <Button onClick={() => navigate('/tienda')}>Gastar la luz</Button>
        <Button variant="ghost" onClick={() => navigate('/mision')}>Buscar otra misión</Button>
        <button type="button" className="link" onClick={() => navigate('/mundo')}>Ver tu mundo</button>
      </div>
      <p className="muted small center">O mejor: cierra la app. Ya está.</p>
    </main>
  );
}
