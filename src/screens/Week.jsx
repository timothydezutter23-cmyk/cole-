import { useState } from 'react';
import { Button, Chip, Progress, TopBar } from '../components/ui.jsx';
import { useStore, setState, weekMinutes, weekHistory, GOALS, weekClaimable, claimWeek, climate } from '../lib/store.js';
import { CATEGORIES } from '../data/missions.js';
import { itemById } from '../data/shop.js';
import { formatMinutes, weekKey } from '../lib/time.js';

function narrative(hist, mins) {
  if (!hist.length) return 'Esta semana todavía no ha empezado fuera de la pantalla. No pasa nada: tu mundo espera sin prisa.';
  const counts = {};
  hist.forEach((h) => { counts[h.category] = (counts[h.category] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const feelings = hist.filter((h) => h.feeling === 'bien').length;
  const parts = [`Esta semana hiciste ${hist.length} ${hist.length === 1 ? 'misión' : 'misiones'} y recuperaste unas ${formatMinutes(mins)}.`];
  parts.push(`Lo que más hiciste fue de ${CATEGORIES[top].label.toLowerCase()}.`);
  if (feelings) parts.push(`${feelings === 1 ? 'Una vez' : `${feelings} veces`} terminaste sintiéndote bien.`);
  return parts.join(' ');
}

export default function Week() {
  const s = useStore();
  const [msg, setMsg] = useState(null);
  const mins = weekMinutes(s);
  const hist = weekHistory(s);
  const goal = GOALS[s.weekGoal];
  const claimed = s.weekClaims.includes(weekKey());
  const sky = climate(s);

  const claim = () => {
    const r = claimWeek();
    if (r) setMsg(`+${r.bonus} de luz.${r.feats.length ? ` Y una gesta: ${r.feats.map((f) => itemById(f).name).join(', ')}.` : ''}`);
  };

  return (
    <main className="screen">
      <TopBar title="Tu semana" />
      <section className="week-story">
        <p className="eyebrow">De lunes a domingo</p>
        <h1 className="display">{mins ? `${formatMinutes(mins)} recuperados` : 'Semana en calma'}</h1>
        <p className="lead">{narrative(hist, mins)}</p>
        <p className="muted">Clima de tu mundo: {sky.name.toLowerCase()}. {sky.line}</p>
      </section>

      <section className="panel">
        <p className="panel-title">Meta semanal</p>
        <div className="chips" role="radiogroup" aria-label="Ritmo de la meta">
          {Object.entries(GOALS).map(([id, g]) => (
            <Chip key={id} selected={s.weekGoal === id} onClick={() => setState({ weekGoal: id })}>{g.label} · {formatMinutes(g.minutes)}</Chip>
          ))}
        </div>
        <Progress value={Math.min(mins, goal.minutes)} max={goal.minutes} label="Progreso de la meta semanal" />
        <p className="muted small">
          {claimed ? 'Meta de esta semana cumplida y recogida.'
            : mins >= goal.minutes ? 'Meta cumplida.'
              : `Faltan ${formatMinutes(goal.minutes - mins)}. Sin prisa: si no llega, no pasa nada.`}
        </p>
        {weekClaimable(s) && <Button onClick={claim}>Recoger {goal.bonus} de luz</Button>}
        {msg && <p className="note" aria-live="polite">{msg}</p>}
      </section>
      <p className="muted small center">Aquí no hay gráficas. Solo lo que hiciste.</p>
    </main>
  );
}
