import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Card from './Card.jsx';
import { demoContacts } from './demo.js';
import { DAILY, DAILY_CAP, newState, reconcile, dealForToday, dealMore, swipe, undoSwipe, progress } from './bag.js';
import { CLIENT_ID, AuthError, consumeRedirect, isSignedIn, startSignIn, signOut, fetchAllContacts, deleteContact, redirectUri } from './google.js';

const UNDO_WINDOW_MS = 5000; // how long a delete can be undone before it is sent to Google

const load = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export default function App() {
  const [mode, setMode] = useState(null); // 'demo' | 'google'
  const [screen, setScreen] = useState('welcome'); // 'welcome' | 'loading' | 'deck'
  const [loadCount, setLoadCount] = useState(0);
  const [contacts, setContacts] = useState([]);
  const [bag, setBag] = useState(null);
  const [last, setLast] = useState(null); // last swipe, for undo: { contact, action }
  const [exitDir, setExitDir] = useState(1);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const pending = useRef(null); // a delete waiting out its undo window
  const modeRef = useRef(null);
  const idsRef = useRef([]);
  const booted = useRef(false);

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  idsRef.current = contacts.map((c) => c.id);
  modeRef.current = mode;

  const begin = useCallback((modeName, list) => {
    const ids = list.map((c) => c.id);
    let s = reconcile(load(`cc.bag.${modeName}`) || newState(), ids);
    s = dealForToday(s, ids);
    setContacts(list);
    setBag(s);
    setMode(modeName);
    setLast(null);
    setScreen('deck');
    save('cc.mode', modeName);
  }, []);

  const startDemo = useCallback(() => {
    const gone = new Set(load('cc.demo.deleted') || []);
    begin('demo', demoContacts.filter((c) => !gone.has(c.id)));
  }, [begin]);

  const startGoogle = useCallback(async () => {
    setScreen('loading');
    setLoadCount(0);
    try {
      const list = await fetchAllContacts((n) => setLoadCount(n));
      begin('google', list);
    } catch (err) {
      setNotice(err.message || 'Could not load your contacts.');
      setScreen('welcome');
    }
  }, [begin]);

  // On first load: finish a Google sign-in redirect, or resume where we left off.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const result = consumeRedirect();
    if (result?.error) setNotice(result.error);
    if (isSignedIn()) startGoogle();
    else if (load('cc.mode') === 'demo') startDemo();
  }, [startDemo, startGoogle]);

  // Save progress after every change.
  useEffect(() => {
    if (mode && bag) save(`cc.bag.${mode}`, bag);
  }, [mode, bag]);

  // Actually delete a contact whose undo window has passed.
  const commitPending = useCallback((leaving = false) => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setLast((l) => (l && l.contact.id === p.contact.id ? null : l));
    if (modeRef.current === 'demo') {
      save('cc.demo.deleted', [...(load('cc.demo.deleted') || []), p.contact.id]);
      return;
    }
    deleteContact(p.contact.id, { keepalive: leaving }).catch((err) => {
      setNotice(
        err instanceof AuthError
          ? `${err.message} "${p.contact.name}" was not deleted.`
          : `Could not delete "${p.contact.name}", so it is still in your contacts. (${err.message})`
      );
    });
  }, []);

  // Leaving the app: send any waiting delete now. Coming back: check for a new day.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') commitPending(true);
      else setBag((b) => (b ? dealForToday(b, idsRef.current) : b));
    };
    const onHide = () => commitPending(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [commitPending]);

  const act = useCallback(
    (action) => {
      const top = bag && byId.get(bag.hand[0]);
      if (!top) return;
      commitPending(); // only one delete can be waiting at a time
      setExitDir(action === 'keep' ? 1 : -1);
      setBag((b) => swipe(b, top.id, action));
      setLast({ contact: top, action });
      if (action === 'delete') {
        setContacts((cs) => cs.filter((c) => c.id !== top.id));
        pending.current = { contact: top, timer: setTimeout(() => commitPending(), UNDO_WINDOW_MS) };
      }
    },
    [bag, byId, commitPending]
  );

  const undo = useCallback(() => {
    if (!last) return;
    if (last.action === 'delete') {
      if (!pending.current) return;
      clearTimeout(pending.current.timer);
      pending.current = null;
      setContacts((cs) => [...cs, last.contact]);
    }
    setBag((b) => undoSwipe(b, last.contact.id, last.action));
    setLast(null);
  }, [last]);

  // "+10 more", never going past the daily cap.
  const more = () =>
    setBag((b) => {
      const room = DAILY_CAP - (b.done + b.hand.length);
      return room > 0 ? dealMore(b, idsRef.current, Math.min(DAILY, room)) : b;
    });

  const leave = () => {
    commitPending();
    if (mode === 'google') signOut();
    localStorage.removeItem('cc.mode');
    setMenuOpen(false);
    setMode(null);
    setBag(null);
    setContacts([]);
    setScreen('welcome');
  };

  const resetDemo = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    localStorage.removeItem('cc.demo.deleted');
    localStorage.removeItem('cc.bag.demo');
    setMenuOpen(false);
    begin('demo', demoContacts);
  };

  // ---------- screens ----------

  if (screen === 'welcome') {
    return (
      <main className="screen welcome">
        <div className="welcome-art" aria-hidden="true">
          <div className="mini mini-back" />
          <div className="mini mini-front">
            <span className="mini-dot" />
            <span className="mini-line" />
            <span className="mini-line short" />
          </div>
        </div>
        <h1 className="title">Who Dis?</h1>
        <p className="lede">
          Swipe through your contacts, {DAILY} a day. Left to delete, right to keep.
        </p>
        {notice && <p className="notice" role="alert">{notice}</p>}
        <button className="btn btn-primary" onClick={startSignIn} disabled={!CLIENT_ID}>
          Connect Google Contacts
        </button>
        {!CLIENT_ID && (
          <p className="setup-note">
            Google sign-in is not set up in this copy yet. Add a client ID (README, step 2) with this redirect address:
            <code>{redirectUri()}</code>
          </p>
        )}
        <button className="btn" onClick={startDemo}>Try the demo</button>
        <p className="fineprint">
          Your contacts stay between this browser and Google. Nothing is sent anywhere else.
        </p>
      </main>
    );
  }

  if (screen === 'loading' || !bag) {
    return (
      <main className="screen center">
        <div className="spinner" aria-hidden="true" />
        <p className="lede">{loadCount ? `Loading contacts… ${loadCount}` : 'Loading contacts…'}</p>
      </main>
    );
  }

  const p = progress(bag, contacts.length);
  const hand = bag.hand.map((id) => byId.get(id)).filter(Boolean);
  const visible = hand.slice(0, 2).reverse(); // top card is last so it draws on top
  const canUndo = !!last && (last.action === 'keep' || !!pending.current);
  const deckEmpty = hand.length === 0;

  return (
    <main className="screen deck">
      <header className="bar">
        <div className="progress">
          <div className="progress-top">
            <strong>Today {p.todayDone}/{p.todayTotal}</strong>
            <span>Cycle {p.cycle}: {p.seen} of {p.total} seen</span>
          </div>
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={p.todayTotal} aria-valuenow={p.todayDone}>
            <div className="meter-fill" style={{ width: `${p.todayTotal ? (p.todayDone / p.todayTotal) * 100 : 0}%` }} />
          </div>
        </div>
        <button className="icon-btn" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <span /><span /><span />
        </button>
        {menuOpen && (
          <div className="menu" role="menu">
            <p className="menu-label">{mode === 'demo' ? 'Demo mode (made-up contacts)' : 'Google Contacts'}</p>
            {mode === 'demo' && <button role="menuitem" onClick={resetDemo}>Reset demo</button>}
            <button role="menuitem" onClick={leave}>{mode === 'demo' ? 'Exit demo' : 'Sign out'}</button>
          </div>
        )}
      </header>

      {notice && (
        <p className="notice" role="alert" onClick={() => setNotice('')}>{notice}</p>
      )}

      <section className="stack">
        <AnimatePresence custom={exitDir}>
          {visible.map((c) => (
            <Card key={c.id} contact={c} isTop={c.id === hand[0].id} exitDir={exitDir} onSwipe={act} />
          ))}
        </AnimatePresence>

        {deckEmpty && (
          <div className="done">
            {contacts.length === 0 ? (
              <>
                <h2 className="done-title">No contacts here</h2>
                <p>This account has no contacts to go through.</p>
              </>
            ) : p.capReached ? (
              <>
                <h2 className="done-title">That's {DAILY_CAP}. Stop for today!</h2>
                <p>
                  Seriously, put the phone down.
                  <br />
                  So far: {bag.kept} kept, {bag.deleted} deleted.
                </p>
                <p className="done-cycle">Your next {DAILY} will be here tomorrow.</p>
              </>
            ) : (
              <>
                <h2 className="done-title">Done for today!</h2>
                <p>
                  You went through {p.todayDone} {p.todayDone === 1 ? 'contact' : 'contacts'} today.
                  <br />
                  So far: {bag.kept} kept, {bag.deleted} deleted.
                </p>
                {p.cycleComplete && (
                  <p className="done-cycle">You have now seen everyone once. The next deal starts cycle {p.cycle + 1}.</p>
                )}
                <button className="btn btn-primary" onClick={more}>+{DAILY} more</button>
                <p className="fineprint">Or come back tomorrow for your next {DAILY}.</p>
              </>
            )}
          </div>
        )}
      </section>

      <div className="toast-slot" aria-live="polite">
        {last?.action === 'delete' && pending.current && (
          <div className="toast">
            <span>Deleted {last.contact.name}</span>
            <button onClick={undo}>Undo</button>
          </div>
        )}
      </div>

      <footer className="actions">
        <button className="round round-delete" aria-label="Delete" onClick={() => act('delete')} disabled={deckEmpty}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <button className="round round-undo" aria-label="Undo last swipe" onClick={undo} disabled={!canUndo}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 12" transform="translate(0 -3)" /></svg>
        </button>
        <button className="round round-keep" aria-label="Keep" onClick={() => act('keep')} disabled={deckEmpty}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      </footer>
    </main>
  );
}
