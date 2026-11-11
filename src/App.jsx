import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Card from './Card.jsx';
import Modal from './Modal.jsx';
import Instructions from './Instructions.jsx';
import AuthorsNote, { REPO_URL } from './AuthorsNote.jsx';
import { demoContacts } from './demo.js';
import { DAILY, DAILY_CAP, newState, reconcile, dealForToday, dealMore, swipe, undoSwipe, progress } from './bag.js';
import { CLIENT_ID, AuthError, consumeRedirect, isSignedIn, startSignIn, signOut, fetchAllContacts, deleteContact, setStarred, redirectUri } from './google.js';

const UNDO_DEPTH = 3; // how many recent swipes can be undone

// Welcome screen entrance: each piece fades up, one after another.
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const rise = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } } };
const dealBack = { hidden: { opacity: 0, y: -60, x: '-30%', rotate: 40 }, show: { opacity: 1, y: 0, x: '-30%', rotate: 9, transition: { type: 'spring', stiffness: 260, damping: 18 } } };
const dealFront = { hidden: { opacity: 0, y: -60, x: '-62%', rotate: -40 }, show: { opacity: 1, y: 0, x: '-62%', rotate: -7, transition: { type: 'spring', stiffness: 260, damping: 18, delay: 0.12 } } };

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
  const [history, setHistoryState] = useState([]); // recent swipes, newest last: { contact, action }
  const [exitDir, setExitDir] = useState(1);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [popup, setPopup] = useState(null); // 'help' | 'note'
  const closePopup = useCallback(() => setPopup(null), []);

  const historyRef = useRef([]);
  const modeRef = useRef(null);
  const idsRef = useRef([]);
  const booted = useRef(false);

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  idsRef.current = contacts.map((c) => c.id);
  modeRef.current = mode;

  // A delete is only sent to Google once it can no longer be undone. Until
  // then it waits in the undo history, and its ID is also written to storage
  // so it still goes through if the app is closed without warning.
  const setHistory = useCallback((next, modeName = modeRef.current) => {
    historyRef.current = next;
    setHistoryState(next);
    if (modeName) save(`cc.pending.${modeName}`, next.filter((h) => h.action === 'delete').map((h) => h.contact.id));
  }, []);

  const commitDelete = useCallback((contact, leaving = false) => {
    if (modeRef.current === 'demo') {
      save('cc.demo.deleted', [...new Set([...(load('cc.demo.deleted') || []), contact.id])]);
      return;
    }
    deleteContact(contact.id, { keepalive: leaving }).catch((err) => {
      setNotice(
        err instanceof AuthError
          ? `${err.message} "${contact.name}" was not deleted.`
          : `Could not delete "${contact.name}", so it is still in your contacts. (${err.message})`
      );
    });
  }, []);

  // Make every delete still waiting in the undo history final.
  const flushDeletes = useCallback(
    (leaving = false) => {
      const h = historyRef.current;
      if (!h.some((e) => e.action === 'delete')) return;
      h.filter((e) => e.action === 'delete').forEach((e) => commitDelete(e.contact, leaving));
      setHistory(h.filter((e) => e.action !== 'delete'));
    },
    [commitDelete, setHistory]
  );

  const begin = useCallback(
    (modeName, list) => {
      const ids = list.map((c) => c.id);
      let s = reconcile(load(`cc.bag.${modeName}`) || newState(), ids);
      s = dealForToday(s, ids);
      modeRef.current = modeName;
      setContacts(list);
      setBag(s);
      setMode(modeName);
      setHistory([], modeName);
      setScreen('deck');
      save('cc.mode', modeName);
    },
    [setHistory]
  );

  const startDemo = useCallback(() => {
    // Finish any deletes left waiting when the app was last closed.
    const gone = new Set([...(load('cc.demo.deleted') || []), ...(load('cc.pending.demo') || [])]);
    save('cc.demo.deleted', [...gone]);
    const starred = new Set(load('cc.demo.starred') || []);
    begin('demo', demoContacts.filter((c) => !gone.has(c.id)).map((c) => ({ ...c, starred: starred.has(c.id) })));
  }, [begin]);

  const startGoogle = useCallback(async () => {
    setScreen('loading');
    setLoadCount(0);
    try {
      let list = await fetchAllContacts((n) => setLoadCount(n));
      // Finish any deletes left waiting when the app was last closed.
      const waiting = new Set(load('cc.pending.google') || []);
      if (waiting.size) {
        modeRef.current = 'google';
        list.filter((c) => waiting.has(c.id)).forEach((c) => commitDelete(c));
        list = list.filter((c) => !waiting.has(c.id));
      }
      begin('google', list);
    } catch (err) {
      setNotice(err.message || 'Could not load your contacts.');
      setScreen('welcome');
    }
  }, [begin, commitDelete]);

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

  // Leaving the app: waiting deletes become final. Coming back: check for a new day.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushDeletes(true);
      else setBag((b) => (b ? dealForToday(b, idsRef.current) : b));
    };
    const onHide = () => flushDeletes(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flushDeletes]);

  const act = useCallback(
    (action) => {
      const top = bag && byId.get(bag.hand[0]);
      if (!top) return;
      setExitDir(action === 'keep' ? 1 : -1);
      setBag((b) => swipe(b, top.id, action));
      if (action === 'delete') setContacts((cs) => cs.filter((c) => c.id !== top.id));
      // Remember the swipe. Anything older than the last few can no longer be
      // undone, so an old delete becomes final at this point.
      const next = [...historyRef.current, { contact: top, action }];
      while (next.length > UNDO_DEPTH) {
        const old = next.shift();
        if (old.action === 'delete') commitDelete(old.contact);
      }
      setHistory(next);
    },
    [bag, byId, commitDelete, setHistory]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) return;
    const last = h[h.length - 1];
    setHistory(h.slice(0, -1));
    if (last.action === 'delete') setContacts((cs) => [...cs, last.contact]);
    setBag((b) => undoSwipe(b, last.contact.id, last.action));
  }, [setHistory]);

  // Star = favorite. In Google Contacts this is the "Starred" group.
  const toggleStar = useCallback(async () => {
    const top = bag && byId.get(bag.hand[0]);
    if (!top) return;
    const want = !top.starred;
    const apply = (value) => setContacts((cs) => cs.map((c) => (c.id === top.id ? { ...c, starred: value } : c)));
    apply(want);
    if (modeRef.current === 'demo') {
      const set = new Set(load('cc.demo.starred') || []);
      want ? set.add(top.id) : set.delete(top.id);
      save('cc.demo.starred', [...set]);
      return;
    }
    try {
      await setStarred(top.id, want);
    } catch (err) {
      apply(!want);
      setNotice(`Could not ${want ? 'star' : 'unstar'} "${top.name}". (${err.message})`);
    }
  }, [bag, byId]);

  // "+10", never going past the daily cap.
  const more = useCallback(() => {
    setBag((b) => {
      const room = DAILY_CAP - (b.done + b.hand.length);
      return room > 0 ? dealMore(b, idsRef.current, Math.min(DAILY, room)) : b;
    });
  }, []);

  // On a computer: arrow keys swipe, Backspace or Ctrl/Cmd+Z undoes.
  useEffect(() => {
    if (screen !== 'deck' || popup) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') act('keep');
      else if (e.key === 'ArrowLeft') act('delete');
      else if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, popup, act, undo]);

  const leave = () => {
    flushDeletes();
    if (mode === 'google') signOut();
    localStorage.removeItem('cc.mode');
    setMenuOpen(false);
    setMode(null);
    setBag(null);
    setContacts([]);
    setScreen('welcome');
  };

  const resetDemo = () => {
    ['cc.demo.deleted', 'cc.demo.starred', 'cc.bag.demo', 'cc.pending.demo'].forEach((k) => localStorage.removeItem(k));
    setMenuOpen(false);
    begin('demo', demoContacts.map((c) => ({ ...c, starred: false })));
  };

  // ---------- screens ----------

  const popups = (
    <AnimatePresence>
      {popup === 'help' && (
        <Modal key="help" title="Instructions" onClose={closePopup}>
          <Instructions />
        </Modal>
      )}
      {popup === 'note' && (
        <Modal key="note" title="Author's note" onClose={closePopup}>
          <AuthorsNote />
        </Modal>
      )}
    </AnimatePresence>
  );

  if (screen === 'welcome') {
    return (
      <MotionConfig reducedMotion="user">
        <motion.main className="screen welcome" variants={stagger} initial="hidden" animate="show">
          <div className="welcome-art" aria-hidden="true">
            <motion.div className="mini mini-back" variants={dealBack} />
            <motion.div className="mini mini-front" variants={dealFront}>
              <span className="mini-dot" />
              <span className="mini-line" />
              <span className="mini-line short" />
            </motion.div>
          </div>
          <motion.h1 className="title" variants={rise}>Who Dis?</motion.h1>
          <motion.p className="lede" variants={rise}>
            Swipe through your contacts, {DAILY} a day. Left to delete, right to keep.
          </motion.p>
          {notice && <p className="notice" role="alert">{notice}</p>}
          <motion.button className="btn btn-primary" variants={rise} onClick={startSignIn} disabled={!CLIENT_ID}>
            Connect Google Contacts
          </motion.button>
          {!CLIENT_ID && (
            <motion.p className="setup-note" variants={rise}>
              Google sign-in is not set up in this copy yet. Add a client ID (README, step 2) with this redirect address:
              <code>{redirectUri()}</code>
            </motion.p>
          )}
          <motion.button className="btn" variants={rise} onClick={startDemo}>Try the demo</motion.button>
          <motion.div className="btn-row" variants={rise}>
            <button className="btn btn-small" onClick={() => setPopup('help')}>Instructions</button>
            <button className="btn btn-small" onClick={() => setPopup('note')}>Author's note</button>
          </motion.div>
          <motion.div className="fineprint" variants={rise}>
            <p>Your contacts stay between this browser and Google. Nothing is sent anywhere else.</p>
            <p>
              I'm not saving anything, but I'm also not well versed in security. I did my best to make sure that
              anything that is saved stays locally on your device. If you know this stuff and see I messed up, please{' '}
              <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">let me know</a>.
            </p>
          </motion.div>
        </motion.main>
        {popups}
      </MotionConfig>
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
  const top = hand[0];
  const deckEmpty = hand.length === 0;
  const canMore = !p.capReached && contacts.length > 0;

  return (
    <MotionConfig reducedMotion="user">
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
            <button role="menuitem" onClick={() => { setMenuOpen(false); setPopup('help'); }}>Instructions</button>
            <button role="menuitem" onClick={() => { setMenuOpen(false); setPopup('note'); }}>Author's note</button>
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
            <Card key={c.id} contact={c} isTop={c.id === top.id} exitDir={exitDir} onSwipe={act} />
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

      <footer className="actions">
        <button
          className={`round round-small round-star ${top?.starred ? 'is-on' : ''}`}
          aria-label={top?.starred ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={!!top?.starred}
          onClick={toggleStar}
          disabled={deckEmpty}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" /></svg>
        </button>
        <button className="round round-delete" aria-label="Delete" onClick={() => act('delete')} disabled={deckEmpty}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <button className="round round-small round-undo" aria-label="Undo last swipe" onClick={undo} disabled={history.length === 0}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 12" transform="translate(0 -3)" /></svg>
        </button>
        <button className="round round-keep" aria-label="Keep" onClick={() => act('keep')} disabled={deckEmpty}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
        <button className="round round-small round-more" aria-label={`Deal ${DAILY} more`} onClick={more} disabled={!canMore}>
          +{DAILY}
        </button>
      </footer>
    </main>
    {popups}
    </MotionConfig>
  );
}
