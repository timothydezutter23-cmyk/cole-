import { useRef, useState } from 'react';
import { Button, Chip, TopBar } from '../components/ui.jsx';
import { navigate } from '../lib/router.js';
import { useInstall, isStandalone, isIOS, canBeInstalled } from '../lib/install.js';
import { useStore, updateSettings, exportBackup, importBackup, resetAll, canStore, TEST_SECONDS } from '../lib/store.js';

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="toggle">
      <span><span className="toggle-label">{label}</span>{hint && <span className="muted small">{hint}</span>}</span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

export default function Settings() {
  const st = useStore((s) => s.settings);
  const [msg, setMsg] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);
  const install = useInstall();
  const site = 'https://timothydezutter23-cmyk.github.io/cole-/';

  const [backup, setBackup] = useState(null);
  const [paste, setPaste] = useState('');
  const showBackup = () => { setBackup(exportBackup()); setMsg(null); };
  const copyBackup = async () => {
    try { await navigator.clipboard.writeText(backup); setMsg('Copia en el portapapeles. Guárdala donde quieras.'); }
    catch { document.getElementById('backup-text')?.select(); setMsg('Selecciona el texto y cópialo a mano.'); }
  };
  const restorePaste = () => {
    try { importBackup(paste); setPaste(''); setMsg('Copia restaurada.'); } catch (err) { setMsg(err.message || 'No se pudo leer la copia.'); }
  };
  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { importBackup(await f.text()); setMsg('Copia restaurada.'); } catch (err) { setMsg(err.message || 'No se pudo leer la copia.'); }
    e.target.value = '';
  };

  return (
    <main className="screen">
      <TopBar title="Ajustes" right={<span />} />

      <section className="panel">
        <p className="panel-title">Tener Offgrid en el móvil</p>
        {isStandalone() ? (
          <p className="muted small">Ya la tienes instalada. Funciona también sin conexión.</p>
        ) : !canBeInstalled() ? (
          <>
            <p className="muted small">Desde aquí no se puede instalar. Abre la web de Offgrid en el navegador del móvil y añádela a la pantalla de inicio:</p>
            <p className="mono small selectable">{site}</p>
          </>
        ) : install.available ? (
          <Button variant="ghost" onClick={install.prompt}>Instalar Offgrid</Button>
        ) : isIOS() ? (
          <p className="muted small">En Safari, toca Compartir y luego «Añadir a pantalla de inicio».</p>
        ) : (
          <p className="muted small">Abre el menú del navegador y elige «Instalar app» o «Añadir a pantalla de inicio».</p>
        )}
      </section>

      <section className="panel">
        <p className="panel-title">Aspecto</p>
        <div className="chips">
          {[['light', 'Claro'], ['dark', 'Oscuro'], ['system', 'Como el sistema']].map(([id, l]) => (
            <Chip key={id} selected={st.theme === id} onClick={() => updateSettings({ theme: id })}>{l}</Chip>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="panel-title">Accesibilidad</p>
        <Toggle label="Texto grande" checked={st.largeText} onChange={(v) => updateSettings({ largeText: v })} />
        <Toggle label="Contraste alto" checked={st.highContrast} onChange={(v) => updateSettings({ highContrast: v })} />
        <p className="toggle-label">Movimiento</p>
        <div className="chips">
          {[['system', 'Como el sistema'], [true, 'Reducido'], [false, 'Normal']].map(([id, l]) => (
            <Chip key={String(id)} selected={st.reduceMotion === id} onClick={() => updateSettings({ reduceMotion: id })}>{l}</Chip>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="panel-title">Pruebas</p>
        <Toggle label={st.testMode ? 'Modo prueba: activado' : 'Modo prueba: desactivado'} hint={`Las misiones duran ${TEST_SECONDS} segundos, para ver crecer el mundo sin esperar. También acorta la que tengas en marcha.`} checked={st.testMode} onChange={(v) => updateSettings({ testMode: v })} />
      </section>

      <section className="panel">
        <p className="panel-title">Tus datos</p>
        <p className="muted small">Todo vive en este navegador. Nada sale de aquí. Si cambias de móvil o borras datos, usa una copia.</p>
        {!canStore() && <p className="note">Este navegador no deja guardar (¿modo privado?). Tu progreso se perderá al cerrar.</p>}
        <div className="row wrap">
          <Button variant="ghost" onClick={showBackup}>Exportar copia</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>Importar archivo</Button>
          <input ref={fileRef} id="backup-file" type="file" accept="application/json,.json,.txt" hidden onChange={upload} />
        </div>
        {backup && (
          <div className="stack">
            <textarea id="backup-text" className="backup" readOnly value={backup} rows={5} aria-label="Copia de tus datos" onFocus={(e) => e.target.select()} />
            <Button variant="ghost" onClick={copyBackup}>Copiar</Button>
          </div>
        )}
        <div className="stack">
          <textarea id="backup-paste" className="backup" rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="O pega aquí una copia para restaurarla" aria-label="Pegar copia" />
          {paste.trim() && <Button variant="ghost" onClick={restorePaste}>Restaurar esta copia</Button>}
        </div>
        {!confirmReset ? (
          <button type="button" className="link small" onClick={() => setConfirmReset(true)}>Empezar de cero</button>
        ) : (
          <div className="row">
            <Button variant="ghost" onClick={() => { resetAll(); navigate('/onboarding', { replace: true }); }}>Sí, borrar todo</Button>
            <Button variant="quiet" onClick={() => setConfirmReset(false)}>Mejor no</Button>
          </div>
        )}
        {msg && <p className="note" aria-live="polite">{msg}</p>}
      </section>

      <section className="panel about">
        <p className="panel-title">Sobre Offgrid</p>
        <p className="muted small">Sin anuncios. Sin venta de datos. Sin rachas que castigan. Si recaes, tu mundo se duerme; nunca se rompe. Esta app funciona mejor cerrada.</p>
      </section>
    </main>
  );
}
