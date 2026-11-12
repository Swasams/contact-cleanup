import { useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { tagsOf } from './contact.js';

const SWIPE_DISTANCE = 110; // px the card must travel to count as a swipe
const SWIPE_VELOCITY = 700; // or a fast flick
const UP_DISTANCE = 80; // px upward to open details

// Avatar colours from the creator palette: [background, text]
const COLORS = [
  ['#FFB35C', '#2B2A4C'], // peach
  ['#E9584C', '#2B2A4C'], // coral
  ['#EB5682', '#2B2A4C'], // pink
  ['#63A442', '#2B2A4C'], // leaf green
  ['#724FB8', '#FFFBF3'], // violet
];

export function initials(name) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

export function colorFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function birthdayText(b) {
  if (!b || !b.month || !b.day) return '';
  const date = `${MONTHS[b.month - 1]} ${b.day}`;
  if (!b.year) return date;
  const now = new Date();
  let age = now.getFullYear() - b.year;
  if (now.getMonth() + 1 < b.month || (now.getMonth() + 1 === b.month && now.getDate() < b.day)) age -= 1;
  return `${age} years old · ${date}`;
}

const variants = {
  enter: { scale: 0.9, y: 24, opacity: 0 },
  top: { scale: 1, y: 0, opacity: 1 },
  behind: { scale: 0.94, y: 16, opacity: 1 },
  // travel far enough to leave the window, however wide it is
  exit: (dir) => ({ x: dir * (window.innerWidth / 2 + 320), opacity: 0, transition: { duration: 0.3 } }),
};

export default function Card({ contact, isTop, exitDir, onSwipe, onTap, onDetails, isOn }) {
  const dragged = useRef(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const keepOpacity = useTransform(x, [30, 120], [0, 1]);
  const deleteOpacity = useTransform(x, [-120, -30], [1, 0]);

  // Rows on the card follow the field switches in Settings.
  const work = [isOn('title') && contact.title, isOn('org') && contact.org].filter((v) => v && v !== contact.name).join(', ');
  const met = isOn('howMet') ? tagsOf(contact.howMet).join(', ') : '';
  const rows = [
    ['Phone', isOn('phone') && contact.phones[0], contact.phones.length - 1],
    ['Email', isOn('email') && contact.emails[0], contact.emails.length - 1],
    ['Work', work, 0],
    ['Birthday', isOn('birthday') && birthdayText(contact.birthday), 0],
    ['Met', met, 0],
  ].filter(([, value]) => value);

  return (
    <motion.article
      className={`card ${isTop ? 'is-top' : ''}`}
      style={{ x, rotate }}
      drag={isTop}
      dragDirectionLock
      dragSnapToOrigin
      dragConstraints={{ top: -120, bottom: 0 }}
      dragElastic={{ top: 0.25, bottom: 0.08 }}
      onPointerDown={() => { dragged.current = false; }}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        const { offset, velocity } = info;
        const sideways = Math.abs(offset.x) > Math.abs(offset.y);
        if (sideways && (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY)) onSwipe('keep');
        else if (sideways && (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY)) onSwipe('delete');
        else if (!sideways && (offset.y < -UP_DISTANCE || velocity.y < -SWIPE_VELOCITY)) onDetails();
      }}
      onClick={() => { if (isTop && !dragged.current) onTap(); }}
      variants={variants}
      custom={exitDir}
      initial="enter"
      animate={isTop ? 'top' : 'behind'}
      exit="exit"
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      aria-hidden={!isTop}
    >
      <motion.div className="stamp stamp-keep" style={{ opacity: keepOpacity }}>KEEP</motion.div>
      <motion.div className="stamp stamp-delete" style={{ opacity: deleteOpacity }}>DELETE</motion.div>

      {contact.starred && (
        <div className="fav" aria-label="Favorite">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" /></svg>
        </div>
      )}

      <div className="avatar" style={{ background: colorFor(contact.id)[0], color: colorFor(contact.id)[1] }}>
        {contact.photo ? (
          <img src={contact.photo} alt="" draggable="false" referrerPolicy="no-referrer" />
        ) : (
          <span>{contact.hasName || contact.org ? initials(contact.name) : '?'}</span>
        )}
      </div>

      <h2 className="card-name">{contact.name}</h2>
      {!contact.hasName && <p className="tag">No name saved</p>}

      <dl className="rows">
        {rows.map(([label, value, extra]) => (
          <div className="row" key={label}>
            <dt>{label}</dt>
            <dd>
              {value}
              {extra > 0 && <span className="extra"> +{extra}</span>}
            </dd>
          </div>
        ))}
        {rows.length === 0 && <p className="empty-rows">No other details saved.</p>}
      </dl>

      {isTop && (
        <button className="card-hint" onClick={(e) => { e.stopPropagation(); onDetails(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6" /></svg>
          Swipe up for details
        </button>
      )}
    </motion.article>
  );
}
