import { useMemo, useRef, useState } from 'react';
import Planet from '../components/Planet.jsx';
import { Button, Icon, Progress, TopBar } from '../components/ui.jsx';
import { navigate } from '../lib/router.js';
import {
  useStore, worldStage, totalMinutes, climate, isLatent, canPlaceAt, placeItem, movePlaced, rotatePlaced,
  pickUp, scatterInventory, WORLD_STAGES,
} from '../lib/store.js';
import { itemById } from '../data/shop.js';
import { formatMinutes } from '../lib/time.js';

const STEP = Math.PI / 6;

export default function World() {
  const s = useStore();
  const sceneRef = useRef(null);
  const [placing, setPlacing] = useState(null); // {invUid?, placedUid?, itemId, dir, rot}
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);

  const mins = totalMinutes(s);
  const stage = worldStage(mins);
  const sky = climate(s);
  const latent = isLatent(s);

  const groups = useMemo(() => {
    const g = new Map();
    s.inventory.forEach((inv) => {
      if (!g.has(inv.itemId)) g.set(inv.itemId, []);
      g.get(inv.itemId).push(inv.uid);
    });
    return [...g.entries()];
  }, [s.inventory]);

  const valid = placing?.dir ? canPlaceAt(placing.itemId, placing.dir) : false;
  const ghost = placing ? { itemId: placing.itemId, dir: placing.dir, rot: placing.rot, valid } : null;
  const ruleText = (itemId) => (itemById(itemId).place === 'water' ? 'Los animales viven en el agua.' : 'Esto va en tierra firme.');

  const onTap = ({ dir, uid }) => {
    setMsg(null);
    if (placing) {
      if (dir) setPlacing((p) => ({ ...p, dir }));
      return;
    }
    setSelected(uid || null);
  };
  const onHover = ({ dir }) => { if (placing && dir) setPlacing((p) => ({ ...p, dir })); };

  const startPlacing = (itemId, invUid) => {
    setSelected(null);
    setMsg(null);
    setPlacing({ itemId, invUid, dir: null, rot: 0 });
  };
  const confirm = () => {
    if (!placing?.dir) return;
    if (!valid) { setMsg(ruleText(placing.itemId)); return; }
    const ok = placing.placedUid
      ? movePlaced(placing.placedUid, placing.dir, placing.rot)
      : placeItem(placing.invUid, placing.dir, placing.rot);
    if (ok) {
      setMsg(s.inventory.length <= 1 && !placing.placedUid ? 'Colocado. Ya puedes irte.' : 'Colocado.');
      setPlacing(null);
    }
  };

  const sel = selected && s.placed.find((p) => p.uid === selected);

  return (
    <main className="screen world">
      <TopBar title="Tu mundo" />
      <div className="world-planet">
        <Planet sceneRef={sceneRef} ghost={ghost} selected={selected} onTap={onTap} onHover={onHover} autoSpin={!placing && !selected} distance={3.4}
          label={`Planeta en etapa ${stage.name}. ${s.placed.length} piezas colocadas.`} />
        {placing && (
          <div className="world-hint" aria-live="polite">
            {!placing.dir ? 'Toca el planeta donde quieras ponerlo.' : valid ? 'Así quedará. ¿Lo dejas aquí?' : ruleText(placing.itemId)}
          </div>
        )}
      </div>

      {placing ? (
        <section className="panel">
          <p className="panel-title">{itemById(placing.itemId).name}</p>
          <div className="row">
            <Button variant="ghost" onClick={() => setPlacing((p) => ({ ...p, rot: p.rot + STEP }))} aria-label="Girar"><Icon name="rotate" /> Girar</Button>
            <Button onClick={confirm} disabled={!placing.dir || !valid}><Icon name="check" /> Colocar aquí</Button>
          </div>
          <button type="button" className="link" onClick={() => setPlacing(null)}>Cancelar</button>
        </section>
      ) : sel ? (
        <section className="panel">
          <p className="panel-title">{itemById(sel.itemId).name}</p>
          <div className="row wrap">
            <Button variant="ghost" onClick={() => rotatePlaced(sel.uid, STEP)}><Icon name="rotate" /> Girar</Button>
            <Button variant="ghost" onClick={() => { setPlacing({ itemId: sel.itemId, placedUid: sel.uid, dir: sel.dir, rot: sel.rot }); setSelected(null); }}><Icon name="move" /> Mover</Button>
            <Button variant="ghost" onClick={() => { pickUp(sel.uid); setSelected(null); }}><Icon name="pickup" /> Recoger</Button>
          </div>
          <button type="button" className="link" onClick={() => setSelected(null)}>Listo</button>
        </section>
      ) : (
        <>
          {msg && <p className="note center">{msg}</p>}
          {groups.length > 0 ? (
            <section className="panel">
              <div className="panel-head">
                <p className="panel-title">Sin colocar</p>
                <button type="button" className="link small" onClick={scatterInventory}><Icon name="shuffle" size={16} /> Repartir al azar</button>
              </div>
              <div className="tray">
                {groups.map(([itemId, uids]) => (
                  <button type="button" key={itemId} className="tray-item" onClick={() => startPlacing(itemId, uids[0])}>
                    <span>{itemById(itemId).name}</span>
                    {uids.length > 1 && <span className="count mono">×{uids.length}</span>}
                  </button>
                ))}
              </div>
              <p className="muted small">Toca una pieza y luego el planeta. Lo de tierra va en tierra; los animales, al agua.</p>
            </section>
          ) : (
            <p className="muted small center">Toca cualquier pieza del planeta para girarla, moverla o recogerla.</p>
          )}

          <section className="panel">
            <div className="panel-head">
              <p className="panel-title">{latent ? 'En penumbra' : stage.name}</p>
              <span className="muted small">{sky.name}</span>
            </div>
            <p className="muted">{latent ? 'Tu mundo descansa. Nada se ha perdido; con la próxima misión vuelve la luz.' : stage.line}</p>
            {stage.next ? (
              <>
                <Progress value={mins - stage.at} max={stage.next.at - stage.at} label="Progreso hacia la siguiente etapa" />
                <p className="muted small">Faltan {formatMinutes(stage.toNext)} fuera del móvil para: {stage.next.name}.</p>
              </>
            ) : (
              <p className="muted small">Has recorrido las {WORLD_STAGES.length} etapas.</p>
            )}
            <p className="muted small">{sky.line}</p>
          </section>
          <div className="row center">
            <Button variant="quiet" onClick={() => navigate('/tienda')}><Icon name="shop" /> Tienda</Button>
          </div>
        </>
      )}
    </main>
  );
}
