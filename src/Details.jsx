import { useEffect, useRef, useState } from 'react';
import { FIELD_DEFS, draftOf, sameDraft, tagsOf, joinTags, parseDate, fmtDate } from './contact.js';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1979 }, (_, i) => String(THIS_YEAR - i));
const INPUT = { text: 'text', tel: 'tel', email: 'email', date: 'text' };

// Swipe a card up: everything saved on the contact, then how and when you met.
// Tags and the year can be set straight away; Edit opens the contact's fields.
// The check mark in the popup's header saves, the X closes without saving.
// Only fields switched on in Settings appear.
export default function Details({ contact, startEditing = false, onSave, onAddTag, onClose, saveRef, tagOptions, isOn }) {
  const [draft, setDraft] = useState(() => draftOf(contact));
  const [editing, setEditing] = useState(startEditing);
  const [custom, setCustom] = useState('');
  const [errors, setErrors] = useState({});
  const saved = useRef(draftOf(contact));

  const dateKeys = FIELD_DEFS.filter((f) => f.type === 'date').map((f) => f.key);
  const badDates = (d) => dateKeys.filter((k) => parseDate(d[k]) === undefined);

  const commit = (d) => {
    // A date that cannot be read is put back the way it was rather than saved.
    const clean = { ...d };
    badDates(d).forEach((k) => { clean[k] = saved.current[k]; });
    if (sameDraft(clean, saved.current)) return;
    saved.current = clean;
    onSave(clean);
  };

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const tags = tagsOf(draft.howMet);
  const toggleTag = (t) => set('howMet', joinTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]));
  const addCustom = () => {
    const t = custom.trim().replace(/,/g, ' ');
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) set('howMet', joinTags([...tags, t]));
    if (t) onAddTag?.(t); // a tag made here becomes an option for everyone from now on
    setCustom('');
  };

  // The check mark in the header: save everything (fields, tags, year) and close.
  const save = (e) => {
    e?.preventDefault?.();
    const bad = badDates(draft);
    setErrors(Object.fromEntries(bad.map((k) => [k, true])));
    if (bad.length) return;
    commit(draft);
    onClose();
  };
  useEffect(() => {
    if (saveRef) saveRef.current = save;
  });

  // The plain fields (everything except tags and year) that are switched on.
  const plain = FIELD_DEFS.filter((f) => INPUT[f.type] || f.type === 'textarea').filter((f) => isOn(f.key));
  const extras = [
    ...(isOn('phone') ? contact.phones.slice(1).map((v) => ['Other phone', v]) : []),
    ...(isOn('email') ? contact.emails.slice(1).map((v) => ['Other email', v]) : []),
  ];
  const shown = (f) => (f.type === 'date' ? fmtDate(parseDate(draft[f.key]) || null) || draft[f.key] : draft[f.key]);
  const nothing = !plain.some((f) => draft[f.key]) && !extras.length;
  const anyEditable = plain.length > 0 || isOn('howMet') || isOn('metYear');

  return (
    <div className="details">
      <section>
        <div className="details-head first">
          <h3>Contact details</h3>
          {!editing && anyEditable && <button className="btn btn-small edit-btn" onClick={() => setEditing(true)}>Edit</button>}
        </div>

        {editing ? (
          <form className="fields" onSubmit={save} noValidate>
            {plain.map((f) => (
              <label key={f.key}>
                <span>{f.label}</span>
                {f.type === 'textarea' ? (
                  <textarea rows={f.key === 'notes' ? 3 : 2} value={draft[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input
                    type={INPUT[f.type]}
                    value={draft[f.key]}
                    placeholder={f.type === 'date' ? 'MM/DD/YYYY (year optional)' : undefined}
                    inputMode={f.type === 'date' ? 'numeric' : undefined}
                    autoCapitalize={f.type === 'email' ? 'none' : undefined}
                    autoComplete="off"
                    aria-invalid={!!errors[f.key]}
                    onChange={(e) => { set(f.key, e.target.value); setErrors((er) => ({ ...er, [f.key]: false })); }}
                  />
                )}
                {errors[f.key] && <em className="field-error">Use MM/DD or MM/DD/YYYY.</em>}
              </label>
            ))}
            <button type="submit" hidden />
          </form>
        ) : (
          <dl className="rows">
            {plain.filter((f) => draft[f.key]).map((f) => (
              <div className="row" key={f.key}><dt>{f.label}</dt><dd className={f.type === 'textarea' ? 'pre' : ''}>{shown(f)}</dd></div>
            ))}
            {extras.map(([label, value], i) => (
              <div className="row" key={label + i}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
            {nothing && (
              <p className="empty-rows">
                {anyEditable ? 'Nothing saved yet. Tap Edit to add details.' : 'Every field is switched off. Turn some on in Settings.'}
              </p>
            )}
          </dl>
        )}
      </section>

      {isOn('howMet') && (
        <section>
          <h3>How we met</h3>
          <div className="tagchips">
            {[...tagOptions, ...tags.filter((t) => !tagOptions.some((o) => o.toLowerCase() === t.toLowerCase()))].map((t) => (
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
      )}

      {isOn('metYear') && (
        <section>
          <h3>When we met</h3>
          <select value={draft.metYear} onChange={(e) => set('metYear', e.target.value)} aria-label="Year we met">
            <option value="">Not sure</option>
            {draft.metYear && !YEARS.includes(draft.metYear) && <option value={draft.metYear}>{draft.metYear}</option>}
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </section>
      )}
    </div>
  );
}
