import { useEffect, useRef, useState } from 'react';
import { MET_OPTIONS, draftOf, sameDraft, tagsOf } from './contact.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1979 }, (_, i) => String(THIS_YEAR - i));

const FIELDS = [
  ['realName', 'Name', 'text', 'name'],
  ['phone', 'Phone', 'tel', 'tel'],
  ['email', 'Email', 'email', 'email'],
  ['org', 'Company', 'text', 'organization'],
  ['title', 'Job title', 'text', 'organization-title'],
  ['instagram', 'Instagram', 'text', 'off'],
  ['tiktok', 'TikTok', 'text', 'off'],
  ['discord', 'Discord', 'text', 'off'],
];

// Swipe a card up: everything saved on the contact, quick "how we met" tags,
// and an Edit button for the contact's fields.
export default function Details({ contact, startEditing = false, onSave }) {
  const [draft, setDraft] = useState(() => draftOf(contact));
  const [editing, setEditing] = useState(startEditing);
  const [custom, setCustom] = useState('');
  const saved = useRef(draftOf(contact));
  const latest = useRef(draft);
  latest.current = draft;

  const commit = (d) => {
    if (sameDraft(d, saved.current)) return;
    saved.current = d;
    onSave(d);
  };

  // Tags save themselves: anything still unsaved is saved when the popup closes.
  useEffect(() => () => commit(latest.current), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const tags = tagsOf(draft.howMet);
  const toggleTag = (t) => set('howMet', (tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]).join(', '));
  const addCustom = () => {
    const t = custom.trim().replace(/,/g, ' ');
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) set('howMet', [...tags, t].join(', '));
    setCustom('');
  };

  const b = contact.birthday;
  const extras = [
    ...contact.phones.slice(1).map((v) => ['Other phone', v]),
    ...contact.emails.slice(1).map((v) => ['Other email', v]),
    ...(b && b.month && b.day ? [['Birthday', `${MONTHS[b.month - 1]} ${b.day}${b.year ? ', ' + b.year : ''}`]] : []),
  ];

  return (
    <div className="details">
      <section>
        <h3 className="first">How we met</h3>
        <div className="tagchips">
          {[...MET_OPTIONS, ...tags.filter((t) => !MET_OPTIONS.includes(t))].map((t) => (
            <button key={t} className={`tagchip ${tags.includes(t) ? 'is-on' : ''}`} aria-pressed={tags.includes(t)} onClick={() => toggleTag(t)}>
              {t}
            </button>
          ))}
        </div>
        <form className="inline" onSubmit={(e) => { e.preventDefault(); addCustom(); }}>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Something else…" aria-label="Add your own tag" maxLength={40} />
          <button className="btn btn-small" type="submit" disabled={!custom.trim()}>Add</button>
        </form>
      </section>

      <section>
        <h3>When</h3>
        <select value={draft.metYear} onChange={(e) => set('metYear', e.target.value)} aria-label="Year we met">
          <option value="">Not sure</option>
          {draft.metYear && !YEARS.includes(draft.metYear) && <option value={draft.metYear}>{draft.metYear}</option>}
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </section>

      <section>
        <div className="details-head">
          <h3>Contact details</h3>
          {!editing && <button className="btn btn-small edit-btn" onClick={() => setEditing(true)}>Edit</button>}
        </div>

        {editing ? (
          <form className="fields" onSubmit={(e) => { e.preventDefault(); commit(draft); setEditing(false); }}>
            {FIELDS.map(([key, label, type, auto]) => (
              <label key={key}>
                <span>{label}</span>
                <input type={type} value={draft[key]} autoComplete={auto} autoCapitalize={type === 'text' && key !== 'realName' && key !== 'org' && key !== 'title' ? 'none' : undefined} onChange={(e) => set(key, e.target.value)} />
              </label>
            ))}
            <label>
              <span>Notes</span>
              <textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
            </label>
            <button className="btn btn-primary" type="submit">Save</button>
          </form>
        ) : (
          <dl className="rows">
            {FIELDS.filter(([key]) => draft[key]).map(([key, label]) => (
              <div className="row" key={key}><dt>{label}</dt><dd>{draft[key]}</dd></div>
            ))}
            {extras.map(([label, value], i) => (
              <div className="row" key={label + i}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
            {draft.notes && <div className="row"><dt>Notes</dt><dd className="pre">{draft.notes}</dd></div>}
            {!FIELDS.some(([key]) => draft[key]) && !extras.length && !draft.notes && <p className="empty-rows">Nothing saved yet. Tap Edit to add details.</p>}
          </dl>
        )}
      </section>
    </div>
  );
}
