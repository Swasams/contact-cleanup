import { useMemo, useState } from 'react';
import { initials, colorFor } from './Card.jsx';

const STAR = 'M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z';
const MAX_RESULTS = 8;

function Row({ contact, onToggle, onOpen }) {
  const [bg, fg] = colorFor(contact.id);
  const detail = contact.phones[0] || contact.emails[0];
  return (
    <li className={`fav-row ${contact.starred ? '' : 'is-off'}`}>
      <button className="fav-row-open" aria-label={`Open details for ${contact.name}`} onClick={() => onOpen(contact)}>
        <span className="fav-row-avatar" style={{ background: bg, color: fg }}>
          {contact.photo ? <img src={contact.photo} alt="" referrerPolicy="no-referrer" /> : initials(contact.name)}
        </span>
        <span className="fav-row-text">
          <strong>{contact.name}</strong>
          {detail && detail !== contact.name && <em>{detail}</em>}
        </span>
      </button>
      <button
        className={`star-toggle ${contact.starred ? 'is-on' : ''}`}
        aria-pressed={contact.starred}
        aria-label={contact.starred ? `Remove ${contact.name} from favorites` : `Add ${contact.name} to favorites`}
        onClick={() => onToggle(contact, !contact.starred)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
      </button>
    </li>
  );
}

// The favorites list, from the menu: review who is starred, remove people, and
// search your contacts to add more. Someone you un-star stays in the list
// (greyed) until the popup closes, so a slip is one tap to put right.
// Tapping a person opens their details; closing those comes back here.
export default function Favorites({ contacts, onToggle, onOpen }) {
  const [shown, setShown] = useState(() => contacts.filter((c) => c.starred).map((c) => c.id));
  const [query, setQuery] = useState('');

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const list = shown.map((id) => byId.get(id)).filter(Boolean);
  const count = contacts.filter((c) => c.starred).length;

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const matches = q
    ? contacts.filter(
        (c) =>
          !shown.includes(c.id) &&
          (c.name.toLowerCase().includes(q) ||
            c.emails.some((e) => e.toLowerCase().includes(q)) ||
            (digits.length >= 3 && c.phones.some((p) => p.replace(/\D/g, '').includes(digits))))
      )
    : [];

  const add = (contact, want) => {
    onToggle(contact, want);
    setShown((s) => (s.includes(contact.id) ? s : [...s, contact.id]));
    setQuery('');
  };

  return (
    <div className="favorites">
      <p className="hint">
        {count === 0 ? 'No favorites yet.' : `${count} ${count === 1 ? 'favorite' : 'favorites'}.`} These are the people your bonus rounds pick from.
      </p>

      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your contacts to add someone…" aria-label="Search contacts to add a favorite" autoComplete="off" />
      {q && (
        <ul className="fav-list fav-results">
          {matches.slice(0, MAX_RESULTS).map((c) => <Row key={c.id} contact={c} onToggle={add} onOpen={onOpen} />)}
          {matches.length === 0 && <li className="hint fav-none">No one else matches that.</li>}
          {matches.length > MAX_RESULTS && <li className="hint fav-none">{matches.length - MAX_RESULTS} more. Keep typing to narrow it down.</li>}
        </ul>
      )}

      <h3>Your favorites</h3>
      {list.length === 0 ? (
        <p className="unset">Nobody yet. Search above, or tap the star while swiping.</p>
      ) : (
        <ul className="fav-list">
          {list.map((c) => <Row key={c.id} contact={c} onToggle={onToggle} onOpen={onOpen} />)}
        </ul>
      )}
    </div>
  );
}
