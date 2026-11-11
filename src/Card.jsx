import { motion, useMotionValue, useTransform } from 'framer-motion';

const SWIPE_DISTANCE = 110; // px the card must travel to count as a swipe
const SWIPE_VELOCITY = 700; // or a fast flick

const COLORS = ['#FFD23F', '#FF8A5B', '#5B8DEF', '#3DBE7B', '#C792EA', '#FF6B9D'];

function initials(name) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

function colorFor(id) {
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

export default function Card({ contact, isTop, exitDir, onSwipe }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const keepOpacity = useTransform(x, [30, 120], [0, 1]);
  const deleteOpacity = useTransform(x, [-120, -30], [1, 0]);

  const rows = [
    ['Phone', contact.phones[0], contact.phones.length - 1],
    ['Email', contact.emails[0], contact.emails.length - 1],
    ['Work', [contact.title, contact.org].filter((v) => v && v !== contact.name).join(', '), 0],
    ['Birthday', birthdayText(contact.birthday), 0],
  ].filter(([, value]) => value);

  return (
    <motion.article
      className={`card ${isTop ? 'is-top' : ''}`}
      style={{ x, rotate }}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipe('keep');
        else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipe('delete');
      }}
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

      <div className="avatar" style={{ background: colorFor(contact.id) }}>
        {contact.photo ? (
          <img src={contact.photo} alt="" draggable="false" referrerPolicy="no-referrer" />
        ) : (
          <span>{initials(contact.name)}</span>
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
    </motion.article>
  );
}
