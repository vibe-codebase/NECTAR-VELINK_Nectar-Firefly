import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS, LEVELS, levelIndex, type Level } from './game/levels';
import { meadow, startGame, type Finish, type HudState } from './game/scene';
import { sound } from './audio/sound';
import { haptic, onNative, toNative } from './bridge';
import { freshSave, isUnlocked, loadSave, recordResult, totalStars, writeSave, type Save } from './state/save';
import { Postcard } from './ui/Postcard';
import * as I from './ui/icons';

type Screen = 'home' | 'shelf' | 'play' | 'settings';

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const [save, setSave] = useState<Save>(() => loadSave());
  const [screen, setScreen] = useState<Screen>('home');
  const [chapter, setChapter] = useState(0);
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [paused, setPaused] = useState(false);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [coach, setCoach] = useState(false);
  const [settingsFrom, setSettingsFrom] = useState<Screen>('home');
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!host.current) return;
    meadow.reducedMotion = save.settings.reducedMotion;
    return startGame(host.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { writeSave(save); }, [save]);
  useEffect(() => {
    sound.setVolumes(save.settings.music, save.settings.sfx);
    meadow.reducedMotion = save.settings.reducedMotion;
    document.documentElement.dataset.motion = save.settings.reducedMotion ? 'reduced' : 'full';
  }, [save.settings]);

  const buzz = useCallback((s: 'light' | 'medium' | 'success' | 'warning') => haptic(s, saveRef.current.settings.haptics), []);
  useEffect(() => {
    const unlock = () => { sound.unlock(); sound.startMusic(chapter); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [chapter]);

  const startLevel = useCallback((l: Level) => {
    sound.unlock(); sound.startMusic(l.chapter); sound.duck(true);
    setLevel(l); setChapter(l.chapter); setFinish(null); setPaused(false);
    setCoach(Boolean(l.hint) && !saveRef.current.seenHints.includes(l.id));
    setScreen('play');
    meadow.show('play', l);
  }, []);

  useEffect(() => {
    meadow.hooks = {
      onFinish: (f) => { setFinish(f); setSave((s) => recordResult(s, f.level.id, f.result.stars, f.result.taps)); },
      onFirstAction: () => { setCoach(false); setSave((s) => (s.seenHints.includes(level.id) ? s : { ...s, seenHints: [...s.seenHints, level.id] })); },
      onHaptic: buzz,
    };
  }, [buzz, level.id]);

  const showMenu = useCallback(() => { if (!meadow.scene?.isMenu()) meadow.show('menu', (LEVELS.find((l) => l.id === 'm8') ?? LEVELS[0])); }, []);
  const goHome = useCallback(() => { setScreen('home'); setFinish(null); setPaused(false); sound.duck(false); showMenu(); }, [showMenu]);
  const goShelf = useCallback(() => { setScreen('shelf'); setFinish(null); setPaused(false); sound.duck(false); showMenu(); }, [showMenu]);
  const pause = useCallback((p: boolean) => { setPaused(p); meadow.setPaused(p); }, []);

  useEffect(() => onNative((e) => {
    if (e.type === 'native.lifecycle') {
      if (e.state === 'background') { sound.suspend(); if (screen === 'play' && !finish) pause(true); }
      else sound.resume();
      return;
    }
    if (screen === 'play') { if (finish) goShelf(); else if (!paused) pause(true); else goShelf(); }
    else if (screen === 'shelf') goHome();
    else if (screen === 'settings') setScreen(settingsFrom);
    else toNative({ type: 'exit' });
  }), [screen, paused, finish, pause, goHome, goShelf, settingsFrom]);

  useEffect(() => {
    const vis = () => { if (document.hidden) { sound.suspend(); if (screen === 'play' && !finish) pause(true); } else sound.resume(); };
    document.addEventListener('visibilitychange', vis);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && screen === 'play' && !finish) pause(!paused); };
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('keydown', key); };
  }, [screen, paused, finish, pause]);

  const nextLevel = useMemo(() => { const i = levelIndex(level.id); return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null; }, [level]);
  const firstOpen = useMemo(() => { const i = LEVELS.findIndex((l, idx) => isUnlocked(save, idx) && !save.stars[l.id]); return LEVELS[i >= 0 ? i : 0]; }, [save]);

  return (
    <div className={`app ch-${chapter}`}>
      <div className="stage" ref={host} />
      {screen === 'home' && (
        <Home gold={totalStars(save)} done={Object.keys(save.stars).length} resume={save.stars[LEVELS[0].id] ? firstOpen : null} onPlay={() => startLevel(firstOpen)}
          onShelf={() => { setChapter(firstOpen.chapter); setScreen('shelf'); }}
          onSettings={() => { setSettingsFrom('home'); setScreen('settings'); }} />
      )}
      {screen === 'shelf' && <ShelfScreen save={save} chapter={chapter} onChapter={(c) => { setChapter(c); sound.startMusic(c); }} onPick={startLevel} onBack={goHome} />}
      {screen === 'play' && <Hud level={level} coach={coach} dim={paused || !!finish} onPause={() => pause(true)} />}
      {screen === 'play' && paused && !finish && (
        <PauseCard level={level} onResume={() => pause(false)} onRestart={() => startLevel(level)} onShelf={goShelf}
          onSettings={() => { setSettingsFrom('play'); setScreen('settings'); }} />
      )}
      {screen === 'play' && finish && (
        <ResultCard finish={finish} next={nextLevel && isUnlocked(save, levelIndex(nextLevel.id)) ? nextLevel : null}
          onNext={startLevel} onRetry={() => startLevel(level)} onShelf={goShelf} />
      )}
      {screen === 'settings' && (
        <Settings save={save} onChange={(st) => setSave((s) => ({ ...s, settings: st }))} onReset={() => setSave((s) => ({ ...freshSave(), settings: s.settings }))}
          onBack={() => { setScreen(settingsFrom); if (settingsFrom === 'play') pause(true); }} />
      )}
    </div>
  );
}

function Home({ gold, done, resume, onPlay, onShelf, onSettings }: { gold: number; done: number; resume: Level | null; onPlay: () => void; onShelf: () => void; onSettings: () => void }) {
  return (
    <div className="screen home">
      <header className="title">
        <h1><small>Nectar</small>Firefly</h1>
        <p>Show your lantern in time, and bring a meadow of fireflies to flash as one.</p>
      </header>
      <div className="home-actions">
        <button className="warm-btn" onClick={() => { sound.tap(); onPlay(); }} data-testid="play">
          <I.Lantern size={24} /> {resume ? <>Continue <small>{resume.name}</small></> : 'Into the meadow'}
        </button>
        <div className="row">
          <button className="mist-btn" onClick={() => { sound.tap(); onShelf(); }}><I.Moon /> Nights</button>
          <button className="mist-btn round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
        <div className="tally"><I.Glow size={18} /> {gold} / {LEVELS.length * 3} · {done} nights in step</div>
      </div>
    </div>
  );
}

function ShelfScreen({ save, chapter, onChapter, onPick, onBack }: { save: Save; chapter: number; onChapter: (c: number) => void; onPick: (l: Level) => void; onBack: () => void }) {
  const levels = LEVELS.filter((l) => l.chapter === chapter);
  const got = levels.reduce((a, l) => a + (save.stars[l.id] ?? 0), 0);
  const chapterOpen = (c: number) => isUnlocked(save, LEVELS.findIndex((l) => l.chapter === c));
  const avail = Math.min(window.innerHeight - 250, 720);
  const w = Math.floor(Math.max(56, Math.min(120, (Math.min(window.innerWidth, 600) - 36 - 3 * 10) / 4, (avail / 2 - 40) / 1.5)));
  return (
    <div className="screen shelf">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="eyebrow">nights · {got}/24</span><h2>{CHAPTERS[chapter].name}</h2></div>
        <span />
      </div>
      <div className="tabs" role="tablist">
        {CHAPTERS.map((c, i) => (
          <button key={c.name} role="tab" aria-selected={i === chapter} disabled={!chapterOpen(i)} className={`tab t${i} ${i === chapter ? 'on' : ''}`}
            aria-label={`${c.name}${chapterOpen(i) ? '' : ' (locked)'}`} onClick={() => { sound.tap(); onChapter(i); }}><i />{c.short}</button>
        ))}
      </div>
      <p className="blurb">{CHAPTERS[chapter].blurb}</p>
      <div className="cards">
        {levels.map((l) => {
          const idx = levelIndex(l.id), open = isUnlocked(save, idx), st = save.stars[l.id] ?? 0;
          return (
            <button key={l.id} className={`card-btn ${open ? '' : 'locked'}`} disabled={!open} onClick={() => { sound.tap(); onPick(l); }}
              aria-label={`${l.name}${open ? '' : ' (locked)'}`} data-testid={`level-${idx + 1}`}>
              <Postcard level={l} solved={st > 0} locked={!open} width={w} />
              <span className="card-name">{l.name}</span>
              <span className="marks">{[0, 1, 2].map((k) => <I.Glow key={k} size={15} on={k < st} />)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Hud({ level, coach, dim, onPause }: { level: Level; coach: boolean; dim: boolean; onPause: () => void }) {
  const [st, setSt] = useState<HudState | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    let sig = '', lastMsg = -1, timer = 0;
    const poll = window.setInterval(() => {
      const s = meadow.state(); const k = JSON.stringify(s); if (k !== sig) { sig = k; setSt(s); }
      if (s && s.msgId !== lastMsg) { if (lastMsg >= 0 && s.msg) { setToast({ text: s.msg, id: s.msgId }); clearTimeout(timer); timer = window.setTimeout(() => setToast(null), 2600); } lastMsg = s.msgId; }
    }, 60);
    return () => { clearInterval(poll); clearTimeout(timer); };
  }, []);
  const n = LEVELS.filter((l) => l.chapter === level.chapter).indexOf(level) + 1;
  return (
    <div className={`hud ${dim ? 'dim' : ''}`}>
      <div className="hud-top">
        <button className="icon-btn" aria-label="Pause" onClick={(e) => { e.stopPropagation(); sound.tap(); onPause(); }} data-testid="pause"><I.Pause /></button>
        <div className="hud-title"><span>{window.innerWidth < 360 ? CHAPTERS[level.chapter].short : CHAPTERS[level.chapter].name} · {n}/8</span><strong>{level.name}</strong></div>
        <div className="unisons" aria-label={`${st?.unisons ?? 0} of ${st?.need ?? 3} flashes together`}>{Array.from({ length: st?.need ?? 3 }, (_, i) => <I.Glow key={i} size={18} on={i < (st?.unisons ?? 0)} />)}</div>
      </div>
      <div className="hud-bottom night-bar">
        <div className="dawn" aria-label="Time until dawn"><i style={{ width: `${(1 - (st?.dawn ?? 0)) * 100}%` }} /><I.Moon size={16} /></div>
        <div className="need"><b>{st?.taps ?? 0} {st?.taps === 1 ? 'tap' : 'taps'}</b> · par {level.par}</div>
      </div>
      {toast && <div key={toast.id} className="toast" role="status">{toast.text}</div>}
      {coach && level.hint && <div className="coach" role="note"><I.Glow size={22} /><p>{level.hint}</p></div>}
    </div>
  );
}

function PauseCard({ level, onResume, onRestart, onShelf, onSettings }: { level: Level; onResume: () => void; onRestart: () => void; onShelf: () => void; onSettings: () => void }) {
  return (
    <div className="veil">
      <div className="card" role="dialog" aria-label="Paused">
        <span className="eyebrow">{level.name}</span>
        <h2>The meadow waits</h2>
        <button className="warm-btn" onClick={() => { sound.tap(); onResume(); }} data-testid="resume">Back to the meadow</button>
        <div className="row">
          <button className="mist-btn" onClick={() => { sound.tap(); onRestart(); }}><I.Restart /> Restart</button>
          <button className="mist-btn" onClick={() => { sound.tap(); onShelf(); }}><I.Moon /> Nights</button>
          <button className="mist-btn round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
      </div>
    </div>
  );
}

const TITLES = ['Dawn came first', 'In step', 'In step, and soon', 'One light'];
function ResultCard({ finish, next, onNext, onRetry, onShelf }: { finish: Finish; next: Level | null; onNext: (l: Level) => void; onRetry: () => void; onShelf: () => void }) {
  const r = finish.result;
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const t = [0, 1, 2].filter((i) => i < r.stars).map((i) => window.setTimeout(() => { setLit(i + 1); sound.star(i); }, 420 + i * 330));
    return () => t.forEach(clearTimeout);
  }, [r.stars]);
  const lv = finish.level;
  return (
    <div className="veil soft">
      <div className="card result" role="dialog" aria-label="Night over">
        <span className="eyebrow">{lv.name}</span>
        <h2>{TITLES[r.stars]}</h2>
        <div className="big-stars">{[0, 1, 2].map((i) => <span key={i} className={i < lit ? 'on' : ''}><I.Glow size={52} on={i < lit} /></span>)}</div>
        <p className="checks">{r.won ? <span className={r.taps <= r.par ? 'on' : ''}>{r.taps} {r.taps === 1 ? 'tap' : 'taps'} · par {r.par}</span> : <span>the meadow never flashed together three times</span>}</p>
        {!r.won && <p className="note-small">Tap a swarm just as the others flash. Watch for the beat, and tap on it.</p>}
        {r.won && r.stars < 3 && <p className="note-small">It can be done in {r.par} {r.par === 1 ? 'tap' : 'taps'}.</p>}
        {next && r.stars > 0 ? (
          <button className="warm-btn" onClick={() => { sound.tap(); onNext(next); }} data-testid="next">Next: {next.name} <I.Next size={18} /></button>
        ) : (
          <button className="warm-btn" onClick={() => { sound.tap(); onRetry(); }} data-testid="retry"><I.Restart size={18} /> {r.stars ? 'Play it again' : 'Try the night again'}</button>
        )}
        <div className="row">
          {next && r.stars > 0 && <button className="mist-btn" onClick={() => { sound.tap(); onRetry(); }}><I.Restart /> Again</button>}
          <button className="mist-btn" onClick={() => { sound.tap(); onShelf(); }}><I.Moon /> Nights</button>
        </div>
      </div>
    </div>
  );
}

function Settings({ save, onChange, onReset, onBack }: { save: Save; onChange: (s: Save['settings']) => void; onReset: () => void; onBack: () => void }) {
  const st = save.settings;
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen settings">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="eyebrow">settings</span><h2>Lantern</h2></div>
        <span />
      </div>
      <div className="card flat">
        <label className="slider">Music <input type="range" min={0} max={1} step={0.05} value={st.music} onChange={(e) => onChange({ ...st, music: +e.target.value })} /><output>{Math.round(st.music * 100)}</output></label>
        <label className="slider">Sounds <input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={(e) => onChange({ ...st, sfx: +e.target.value })} /><output>{Math.round(st.sfx * 100)}</output></label>
        <label className="toggle">Vibration <input type="checkbox" checked={st.haptics} onChange={(e) => onChange({ ...st, haptics: e.target.checked })} /><i /></label>
        <label className="toggle">Reduce motion <input type="checkbox" checked={st.reducedMotion} onChange={(e) => onChange({ ...st, reducedMotion: e.target.checked })} /><i /></label>
        <div className="reset">
          {confirm ? (
            <>
              <span>Forget every night?</span>
              <button className="mist-btn danger" onClick={() => { onReset(); setConfirm(false); }}>Reset</button>
              <button className="mist-btn" onClick={() => setConfirm(false)}>Keep</button>
            </>
          ) : <button className="mist-btn" onClick={() => setConfirm(true)}>Reset progress</button>}
        </div>
      </div>
      <p className="small-print">Plays fully offline. No ads, accounts or tracking.</p>
    </div>
  );
}
