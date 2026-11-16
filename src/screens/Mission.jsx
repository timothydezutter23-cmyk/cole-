import { useEffect, useState } from 'react';
import { Button, Chip, Icon, TopBar } from '../components/ui.jsx';
import { navigate } from '../lib/router.js';
import {
  useStore, currentSuggestion, changeSuggestion, postponeSuggestion, startMission, cancelMission, completeMission,
  changesLeft, missionById, setFeeling, LIGHT_PER_MIN, TEST_SECONDS,
  addCustomMission, removeCustomMission, CUSTOM_MAX_MINUTES,
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
        {mission.custom && <p className="tag">Propuesta por ti</p>}
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
        <button type="button" className="link" onClick={() => navigate('/mision/nueva')}><Icon name="spark" size={16} /> Proponer una misión</button>
      </div>
    </main>
  );
}

const MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90];
const SLOT_OPTIONS = [['cualquiera', 'Cuando sea'], ['manana', 'Mañana'], ['mediodia', 'Mediodía'], ['tarde', 'Tarde'], ['noche', 'Noche']];

// Proponer misiones propias: luego salen entre las sugerencias.
export function MissionNew() {
  const s = useStore();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('manos');
  const [minutes, setMinutes] = useState(15);
  const [slot, setSlot] = useState('cualquiera');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const mine = s.customMissions || [];

  const save = (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Escribe qué vas a hacer, aunque sea en pocas palabras.'); return; }
    const m = addCustomMission({ title, category, minutes, slot, note });
    if (m) { setSaved(m); setTitle(''); setNote(''); setError(null); }
  };

  return (
    <main className="screen">
      <TopBar title="Tu misión" back="/mision" />
      <section className="mission-card">
        <h1 className="display">Propón una misión</h1>
        <p className="lead">Algo que te apetezca hacer lejos de la pantalla. Te saldrá entre las sugerencias.</p>
      </section>

      {saved ? (
        <section className="panel" aria-live="polite">
          <p className="panel-title">Guardada: {saved.title}</p>
          <p className="muted small">{CATEGORIES[saved.category].label} · {saved.minutes} min · {Math.round(saved.minutes * LIGHT_PER_MIN)} de luz al terminarla.</p>
          <div className="row wrap">
            <Button disabled={!!s.active} onClick={() => { startMission(saved.id); navigate('/mision/activa'); }}>Hacerla ahora</Button>
            <Button variant="ghost" onClick={() => setSaved(null)}>Proponer otra</Button>
          </div>
          {s.active && <p className="muted small">Ya tienes una misión en curso. Esta te saldrá más adelante.</p>}
        </section>
      ) : (
        <form className="panel form" onSubmit={save}>
          <label className="field" htmlFor="mission-title">
            <span className="toggle-label">¿Qué vas a hacer?</span>
            <input id="mission-title" className="input" value={title} maxLength={70} placeholder="Ej.: Practicar guitarra" onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="field">
            <span className="toggle-label">Tipo</span>
            <div className="chips">
              {Object.entries(CATEGORIES).map(([id, c]) => <Chip key={id} selected={category === id} onClick={() => setCategory(id)}>{c.label}</Chip>)}
            </div>
            <span className="muted small">{CATEGORIES[category].hint}</span>
          </div>
          <div className="field">
            <span className="toggle-label">Duración</span>
            <div className="chips">
              {MINUTE_OPTIONS.filter((n) => n <= CUSTOM_MAX_MINUTES).map((n) => <Chip key={n} selected={minutes === n} onClick={() => setMinutes(n)}>{n} min</Chip>)}
            </div>
          </div>
          <div className="field">
            <span className="toggle-label">¿Cuándo te va mejor?</span>
            <div className="chips">
              {SLOT_OPTIONS.map(([id, l]) => <Chip key={id} selected={slot === id} onClick={() => setSlot(id)}>{l}</Chip>)}
            </div>
          </div>
          <label className="field" htmlFor="mission-note">
            <span className="toggle-label">Una nota para ti <span className="muted small">(opcional)</span></span>
            <input id="mission-note" className="input" value={note} maxLength={120} placeholder="Ej.: Aunque sean tres acordes" onChange={(e) => setNote(e.target.value)} />
          </label>
          {error && <p className="note small">{error}</p>}
          <Button type="submit">Guardar misión</Button>
        </form>
      )}

      {mine.length > 0 && (
        <section className="panel">
          <p className="panel-title">Tus misiones</p>
          <ul className="mine-list">
            {mine.map((m) => (
              <li key={m.id}>
                <span className="mine-text"><span>{m.title}</span><span className="muted small">{CATEGORIES[m.category].label} · {m.minutes} min</span></span>
                <button type="button" className="link small" disabled={s.active?.missionId === m.id} onClick={() => removeCustomMission(m.id)} aria-label={`Quitar ${m.title}`}>Quitar</button>
              </li>
            ))}
          </ul>
        </section>
      )}
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
