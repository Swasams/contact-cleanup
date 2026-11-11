import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GIFT_PROMPTS } from './prompts.js';
import { linksFor } from './contact.js';
import { initials, colorFor } from './Card.jsx';

// Confetti pieces, laid out in a ring with a bit of scatter.
const COLORS = ['var(--coral)', 'var(--peach)', 'var(--pink)', 'var(--leaf)', 'var(--violet)', 'var(--cream)'];
const PIECES = Array.from({ length: 30 }, (_, i) => {
  const angle = (i / 30) * Math.PI * 2 + (i % 3) * 0.25;
  const reach = 130 + ((i * 37) % 120);
  return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach - 50, spin: ((i * 73) % 360) - 180, color: COLORS[i % COLORS.length], size: 9 + ((i * 5) % 9), round: i % 4 === 0 };
});

// A jagged comic-book burst, as points for an SVG polygon.
const BURST = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2 - Math.PI / 2;
  const r = i % 2 ? 72 + ((i * 7) % 9) : 100;
  return `${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`;
}).join(' ');

const firstName = (c) => (c.realName || c.name).trim().split(/\s+/)[0];
const list = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const rise = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 24 } } };
const pop = { hidden: { opacity: 0, scale: 0.6, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 18 } } };

// The bonus round: a gift pops open, then a prompt and three favorites appear.
// Pick one and they take over the screen with the right ways to reach them.
export default function Bonus({ level, people, onClose }) {
  const [phase, setPhase] = useState('intro'); // 'intro' -> 'pick'
  const [pickedId, setPickedId] = useState(null);
  const prompt = GIFT_PROMPTS[Math.min(level, GIFT_PROMPTS.length) - 1];
  const person = people.find((p) => p.id === pickedId) || null;
  const [before, after] = prompt.text.split('{name}');
  const links = person ? linksFor(prompt.actions, person) : [];

  useEffect(() => {
    const t = setTimeout(() => setPhase('pick'), 2300);
    return () => clearTimeout(t);
  }, []);

  if (phase === 'intro') {
    return (
      <motion.div key="intro" className="bonus bonus-intro" role="dialog" aria-modal="true" aria-label="Bonus round" onClick={() => setPhase('pick')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="gift-stage" aria-hidden="true">
          {PIECES.map((p, i) => (
            <motion.span
              key={i}
              className="confetti"
              style={{ width: p.size, height: p.round ? p.size : p.size * 1.6, background: p.color, borderRadius: p.round ? '50%' : 3 }}
              initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 90], scale: [0, 1, 1], rotate: p.spin, opacity: [0, 1, 1, 0] }}
              transition={{ delay: 1.05 + (i % 6) * 0.02, duration: 1.15, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            className="gift"
            initial={{ y: -420, rotate: -10 }}
            animate={{ y: 0, rotate: [-10, 0, -7, 7, -5, 5, 0] }}
            transition={{ y: { type: 'spring', stiffness: 260, damping: 13 }, rotate: { delay: 0.45, duration: 0.6 } }}
          >
            <motion.div className="gift-lid" animate={{ y: [0, 0, -150], rotate: [0, 0, 28], opacity: [1, 1, 0] }} transition={{ delay: 0.95, duration: 0.55, times: [0, 0.1, 1], ease: 'easeOut' }}>
              <span className="gift-bow" />
            </motion.div>
            <div className="gift-box"><span className="gift-ribbon" /></div>
          </motion.div>
        </div>
        <motion.div className="burst-wrap" initial={{ scale: 0, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: -4, opacity: 1 }} transition={{ delay: 1.15, type: 'spring', stiffness: 420, damping: 14 }}>
          <svg className="burst" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true"><polygon points={BURST} /></svg>
          <h2 className="bonus-title">Bonus<br />round!</h2>
        </motion.div>
        <motion.p className="bonus-sub" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.45 }}>
          {level * 10} contacts done today
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div key="pick" className="bonus" role="dialog" aria-modal="true" aria-label="Bonus round" variants={list} initial="hidden" animate="show" exit={{ opacity: 0 }}>
      <motion.p className="bonus-count" variants={rise}>Bonus round {level} of {GIFT_PROMPTS.length}</motion.p>
      <motion.h2 className="bonus-prompt" variants={pop}>
        {before}
        <span className={`blank ${person ? 'is-filled' : ''}`}>{person ? firstName(person) : ''}</span>
        {after}
      </motion.h2>

      {people.length === 0 ? (
        <motion.p className="bonus-none" variants={rise}>
          You have no favorites yet. Tap the star on the people you love, and your next bonus round will have someone to reach out to.
        </motion.p>
      ) : !person ? (
        <>
          <motion.p className="bonus-hint" variants={rise}>Pick a favorite</motion.p>
          <div className="bonus-people">
            {people.map((p) => (
              <motion.button key={p.id} layoutId={`fav-${p.id}`} className="fav-card" variants={pop} whileTap={{ scale: 0.95 }} onClick={() => setPickedId(p.id)}>
                <span className="fav-avatar" style={{ background: colorFor(p.id)[0], color: colorFor(p.id)[1] }}>
                  {p.photo ? <img src={p.photo} alt="" referrerPolicy="no-referrer" /> : initials(p.name)}
                </span>
                <span className="fav-name">{p.name}</span>
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <>
          <motion.div layoutId={`fav-${person.id}`} className="fav-card fav-focus">
            <span className="fav-avatar" style={{ background: colorFor(person.id)[0], color: colorFor(person.id)[1] }}>
              {person.photo ? <img src={person.photo} alt="" referrerPolicy="no-referrer" /> : initials(person.name)}
            </span>
            <span className="fav-name">{person.name}</span>
          </motion.div>
          <motion.div className="reach bonus-links" variants={list} initial="hidden" animate="show">
            {links.map((o) => (
              <motion.a key={o.key} variants={rise} className={`reach-row reach-${o.key}`} href={o.href} target="_blank" rel="noreferrer">
                <span className="reach-dot" aria-hidden="true" />
                <span className="reach-label">{o.label}</span>
                <span className="reach-detail">{o.detail}</span>
                <span className="reach-go" aria-hidden="true">›</span>
              </motion.a>
            ))}
            {links.length === 0 && <motion.p className="bonus-none" variants={rise}>No phone number or email saved for {firstName(person)}, so this one is up to you.</motion.p>}
          </motion.div>
          <motion.button className="btn btn-primary" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} onClick={() => onClose(true)}>Done</motion.button>
          {people.length > 1 && <button className="linkish bonus-link" onClick={() => setPickedId(null)}>Pick someone else</button>}
        </>
      )}

      {people.length === 0 ? (
        <motion.button className="btn btn-primary" variants={rise} onClick={() => onClose(false)}>Got it</motion.button>
      ) : (
        <motion.button className="linkish bonus-link" variants={rise} onClick={() => onClose(false)}>Skip this one</motion.button>
      )}
    </motion.div>
  );
}
