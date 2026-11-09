import { useEffect, useRef } from 'react';
import { PlanetScene } from '../three/PlanetScene.js';
import { useStore, worldFactors, totalMinutes, isLatent, climate } from '../lib/store.js';
import { useReducedMotion } from '../lib/prefs.js';

const isNight = () => { const h = new Date().getHours(); return h >= 21 || h < 7; };

// Planeta conectado al estado. `override` permite previsualizar pieles o mejoras.
export default function Planet({
  className = '', interactive = true, autoSpin = true, distance = 3.4,
  override = null, ghost = null, selected = null, onTap, onHover, sceneRef, showObjects = true, label,
}) {
  const hostRef = useRef(null);
  const sceneObj = useRef(null);
  const s = useStore();
  const reduce = useReducedMotion();

  useEffect(() => {
    const sc = new PlanetScene(hostRef.current, { interactive, autoSpin, distance });
    sceneObj.current = sc;
    if (sceneRef) sceneRef.current = sc;
    return () => { sc.dispose(); sceneObj.current = null; if (sceneRef) sceneRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mins = totalMinutes(s);
  const factors = override?.factors || worldFactors(mins);
  const world = {
    skinId: override?.skinId || s.skin,
    factors,
    latent: override ? false : isLatent(s),
    boosts: override?.boosts || s.boosts,
    climateId: override ? null : climate(s).id,
    night: isNight(),
  };

  useEffect(() => { sceneObj.current?.setWorld(world); });
  useEffect(() => { if (sceneObj.current) sceneObj.current.reduceMotion = reduce; }, [reduce]);
  useEffect(() => { sceneObj.current?.setPlaced(showObjects ? s.placed : []); }, [s.placed, showObjects]);
  useEffect(() => { sceneObj.current?.setGhost(ghost); }, [ghost?.itemId, ghost?.valid, ghost?.dir, ghost?.rot]);
  useEffect(() => { sceneObj.current?.setSelected(selected); }, [selected]);
  useEffect(() => {
    if (!sceneObj.current) return;
    sceneObj.current.onTap = onTap || null;
    sceneObj.current.onHover = onHover || null;
  });

  return <div ref={hostRef} className={`planet ${className}`} role="img" aria-label={label || 'Tu planeta'} />;
}
