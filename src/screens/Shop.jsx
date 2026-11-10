import { useEffect, useRef, useState } from 'react';
import Planet from '../components/Planet.jsx';
import { Button, Icon, Progress, TopBar } from '../components/ui.jsx';
import { ItemPreview } from '../three/PlanetScene.js';
import { navigate } from '../lib/router.js';
import { useStore, buyItem, buySkin, buyBoost, selectSkin, featProgress } from '../lib/store.js';
import { SKINS, BOOSTS, ITEMS, FEATS, SHOP_SECTIONS, itemById } from '../data/shop.js';

const FULL = { color: 1, water: 1, air: 1, life: 1 };

function ItemStage({ itemId }) {
  const ref = useRef(null);
  const prev = useRef(null);
  useEffect(() => {
    prev.current = new ItemPreview(ref.current);
    return () => prev.current.dispose();
  }, []);
  useEffect(() => { prev.current?.show(itemId); }, [itemId]);
  return <div ref={ref} className="planet" role="img" aria-label={`Vista previa: ${itemById(itemId)?.name}`} />;
}

export default function Shop() {
  const s = useStore();
  const [section, setSection] = useState('naturaleza');
  const [sel, setSel] = useState({ type: 'item', id: 'arbol' });
  const [msg, setMsg] = useState(null);
  const feats = featProgress(s);

  const pickSection = (id) => {
    setSection(id);
    setMsg(null);
    if (id === 'pieles') setSel({ type: 'skin', id: s.skin });
    else if (id === 'mejoras') setSel({ type: 'boost', id: BOOSTS[0].id });
    else if (id === 'gestas') setSel({ type: 'item', id: FEATS[0].id });
    else setSel({ type: 'item', id: ITEMS.find((i) => i.kind === id).id });
  };

  const say = (ok, text) => setMsg(ok ? text : 'Te falta luz. Una misión y vuelves.');

  let preview;
  if (sel.type === 'skin') preview = <Planet key="skin" override={{ skinId: sel.id, factors: FULL, boosts: s.boosts }} showObjects={false} interactive={false} distance={3.3} label="Vista previa de la piel" />;
  else if (sel.type === 'boost') preview = <Planet key="boost" override={{ skinId: s.skin, factors: FULL, boosts: [...new Set([...s.boosts, sel.id])] }} interactive={false} distance={4.2} label="Vista previa de la mejora" />;
  else preview = <ItemStage itemId={sel.id} />;

  const card = (key, active, onSelect, name, desc, right) => (
    <li key={key}>
      <button type="button" className={`shop-card ${active ? 'is-on' : ''}`} onClick={onSelect} aria-pressed={active}>
        <span className="shop-text"><span className="shop-name">{name}</span><span className="shop-desc">{desc}</span></span>
        <span className="shop-right">{right}</span>
      </button>
    </li>
  );

  return (
    <main className="screen shop">
      <TopBar title="Tienda" />
      <div className="shop-preview">{preview}</div>

      <div className="tabs" role="tablist">
        {SHOP_SECTIONS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={section === t.id} className={section === t.id ? 'is-on' : ''} onClick={() => pickSection(t.id)}>{t.label}</button>
        ))}
      </div>

      {msg && <p className="note center" aria-live="polite">{msg}</p>}

      <ul className="shop-list">
        {section === 'pieles' && SKINS.map((sk) => {
          const owned = s.ownedSkins.includes(sk.id);
          const using = s.skin === sk.id;
          return card(sk.id, sel.id === sk.id, () => setSel({ type: 'skin', id: sk.id }), sk.name, sk.desc,
            using ? <span className="tag">En uso</span>
              : owned ? <Button variant="ghost" onClick={(e) => { e.stopPropagation(); selectSkin(sk.id); setMsg(`Ahora tu mundo es ${sk.name}.`); }}>Usar</Button>
                : <Button variant="ghost" disabled={s.light < sk.price} onClick={(e) => { e.stopPropagation(); say(buySkin(sk.id), `${sk.name} es tuya.`); }}><Icon name="light" size={14} /> {sk.price}</Button>);
        })}

        {section === 'mejoras' && BOOSTS.map((b) => {
          const owned = s.boosts.includes(b.id);
          return card(b.id, sel.id === b.id, () => setSel({ type: 'boost', id: b.id }), b.name, b.desc,
            owned ? <span className="tag">Activa</span>
              : <Button variant="ghost" disabled={s.light < b.price} onClick={(e) => { e.stopPropagation(); say(buyBoost(b.id), `${b.name} activada.`); }}><Icon name="light" size={14} /> {b.price}</Button>);
        })}

        {['naturaleza', 'estructuras', 'animales'].includes(section) && ITEMS.filter((i) => i.kind === section).map((it) => {
          const have = s.inventory.filter((x) => x.itemId === it.id).length + s.placed.filter((x) => x.itemId === it.id).length;
          return card(it.id, sel.id === it.id, () => setSel({ type: 'item', id: it.id }), it.name,
            `${it.desc}${have ? ` · Tienes ${have}` : ''}`,
            <Button variant="ghost" disabled={s.light < it.price} onClick={(e) => { e.stopPropagation(); say(buyItem(it.id), `${it.name} comprado. Está en tu mundo, sin colocar.`); }}><Icon name="light" size={14} /> {it.price}</Button>);
        })}

        {section === 'gestas' && FEATS.map((f) => {
          const p = feats[f.id];
          const got = !!s.feats[f.id];
          return card(f.id, sel.id === f.id, () => setSel({ type: 'item', id: f.id }), f.name, f.desc,
            got ? <span className="tag">Conseguida</span> : <span className="feat-prog"><Progress value={p.value} max={p.max} label={f.name} /><span className="mono small">{p.value}/{p.max}</span></span>);
        })}
      </ul>

      {section === 'mejoras' && <p className="muted small center">Las mejoras cambian cómo se ve tu planeta, nunca lo que ganas.</p>}
      {section === 'gestas' && <p className="muted small center">Las gestas no se compran. Llegan solas haciendo cosas fuera.</p>}
      <p className="muted small center">Sin ofertas, sin cuentas atrás, sin sorpresas. Nada caduca.</p>
      <div className="row center"><Button variant="quiet" onClick={() => navigate('/mundo')}><Icon name="globe" /> Colocar en tu mundo</Button></div>
    </main>
  );
}
