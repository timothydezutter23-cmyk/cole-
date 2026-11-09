import { useState } from 'react';
import { Button, Chip } from '../components/ui.jsx';
import Planet from '../components/Planet.jsx';
import { SKINS } from '../data/shop.js';
import { finishOnboarding } from '../lib/store.js';
import { navigate } from '../lib/router.js';

const APPS = ['Instagram', 'TikTok', 'YouTube', 'X / Twitter', 'WhatsApp', 'Reddit', 'Juegos', 'Noticias', 'Correo', 'Otras'];
const TIMES = [['manana', 'Al despertar'], ['mediodia', 'Mediodía'], ['tarde', 'Por la tarde'], ['noche', 'Antes de dormir']];
const INTERESTS = [['caminar', 'Caminar'], ['leer', 'Leer'], ['musica', 'Música'], ['gente', 'Ver gente'], ['deporte', 'Deporte'], ['cocinar', 'Cocinar'], ['dibujar', 'Dibujar'], ['plantas', 'Plantas']];
const FULL = { color: 1, water: 1, air: 1, life: 1 };

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [hookApps, setApps] = useState([]);
  const [hookTimes, setTimes] = useState([]);
  const [interests, setInterests] = useState([]);
  const [skin, setSkin] = useState('tierra');
  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const starters = SKINS.filter((s) => s.starter);
  const total = 5;

  const next = () => setStep((s) => s + 1);
  const done = () => { finishOnboarding({ profile: { hookApps, hookTimes, interests }, skin }); navigate('/', { replace: true }); };

  return (
    <main className="screen onboarding">
      <div className="dots" aria-label={`Paso ${step + 1} de ${total}`}>
        {Array.from({ length: total }).map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}
      </div>

      {step === 0 && (
        <section className="ob-step">
          <p className="eyebrow">Offgrid</p>
          <h1 className="display">Una app diseñada<br />para que la cierres.</h1>
          <p className="lead">Te propone cosas que hacer lejos de la pantalla. Lo que hagas fuera hace crecer un mundo que es solo tuyo. Sin culpa, sin rachas que castigan, sin cuentas.</p>
          <p className="muted">Dos minutos de preguntas y te dejamos en paz.</p>
          <Button onClick={next}>Empezar</Button>
        </section>
      )}

      {step === 1 && (
        <section className="ob-step">
          <h2 className="title">¿Qué apps te enganchan más?</h2>
          <p className="muted">Solo para entenderte. No las vamos a vigilar.</p>
          <div className="chips">{APPS.map((a) => <Chip key={a} selected={hookApps.includes(a)} onClick={() => toggle(hookApps, setApps, a)}>{a}</Chip>)}</div>
          <h2 className="title small">¿Y cuándo suele pasar?</h2>
          <div className="chips">{TIMES.map(([id, l]) => <Chip key={id} selected={hookTimes.includes(id)} onClick={() => toggle(hookTimes, setTimes, id)}>{l}</Chip>)}</div>
          <Button onClick={next}>Seguir</Button>
        </section>
      )}

      {step === 2 && (
        <section className="ob-step">
          <h2 className="title">¿Qué te gustaría hacer más?</h2>
          <p className="muted">Las misiones se inclinarán hacia esto, sin olvidar el resto.</p>
          <div className="chips">{INTERESTS.map(([id, l]) => <Chip key={id} selected={interests.includes(id)} onClick={() => toggle(interests, setInterests, id)}>{l}</Chip>)}</div>
          <Button onClick={next}>Seguir</Button>
        </section>
      )}

      {step === 3 && (
        <section className="ob-step">
          <h2 className="title">Elige tu mundo</h2>
          <p className="muted">Así será cuando despierte. Empieza a oscuras y se recupera con el tiempo que pases fuera.</p>
          <div className="ob-planet"><Planet override={{ skinId: skin, factors: FULL, boosts: [] }} showObjects={false} interactive={false} distance={3.2} label={`Vista previa de ${skin}`} /></div>
          <div className="skin-grid">
            {starters.map((sk) => (
              <button type="button" key={sk.id} className={`skin-card ${skin === sk.id ? 'is-on' : ''}`} onClick={() => setSkin(sk.id)} aria-pressed={skin === sk.id}>
                <span className="swatch" style={{ background: `linear-gradient(135deg, ${sk.palette.deep}, ${sk.palette.shallow} 45%, ${sk.palette.grass} 55%, ${sk.palette.dry})` }} />
                <span className="skin-name">{sk.name}</span>
                <span className="skin-desc">{sk.desc}</span>
              </button>
            ))}
          </div>
          <Button onClick={next}>Este</Button>
        </section>
      )}

      {step === 4 && (
        <section className="ob-step">
          <h2 className="title">Sobre permisos, con honestidad</h2>
          <ul className="honest">
            <li><strong>Todo se queda en tu dispositivo.</strong> Sin cuenta, sin servidor, sin anuncios. Nunca.</li>
            <li><strong>Esta versión web no puede leer tu tiempo de uso.</strong> Cuenta el tiempo de las misiones que haces con el temporizador. No inventamos números.</li>
            <li><strong>En la versión nativa</strong> te pediremos el permiso de tiempo de uso del sistema, solo para saber que el móvil descansó. Podrás decir que no.</li>
          </ul>
          <Button onClick={done}>Entendido</Button>
        </section>
      )}

      {step > 0 && <button type="button" className="link" onClick={() => setStep(step - 1)}>Atrás</button>}
    </main>
  );
}
