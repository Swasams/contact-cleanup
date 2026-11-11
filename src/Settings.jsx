import { useState } from 'react';
import { FIELD_DEFS, DEFAULT_TAGS } from './contact.js';
import Instructions from './Instructions.jsx';
import AuthorsNote from './AuthorsNote.jsx';

// Settings popup, four tabs:
//   Tags          - the "How we met" tags offered on every contact
//   Fields        - one switch per contact field: on = shown in details and editable, off = hidden
//   Instructions  - what every control does
//   Author's note
export default function Settings({ tags, setTags, isOn, setField }) {
  const [tab, setTab] = useState('tags');
  const [text, setText] = useState('');

  const add = () => {
    const t = text.trim().replace(/,/g, ' ');
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tags, t]);
    setText('');
  };
  const isDefault = tags.length === DEFAULT_TAGS.length && tags.every((t, i) => t === DEFAULT_TAGS[i]);

  return (
    <div className="settings">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'tags'} className={tab === 'tags' ? 'is-on' : ''} onClick={() => setTab('tags')}>How we met tags</button>
        <button role="tab" aria-selected={tab === 'fields'} className={tab === 'fields' ? 'is-on' : ''} onClick={() => setTab('fields')}>Fields</button>
        <button role="tab" aria-selected={tab === 'help'} className={tab === 'help' ? 'is-on' : ''} onClick={() => setTab('help')}>Instructions</button>
        <button role="tab" aria-selected={tab === 'note'} className={tab === 'note' ? 'is-on' : ''} onClick={() => setTab('note')}>Author's note</button>
      </div>

      {tab === 'help' ? (
        <div role="tabpanel"><Instructions /></div>
      ) : tab === 'note' ? (
        <div role="tabpanel"><AuthorsNote /></div>
      ) : tab === 'tags' ? (
        <div role="tabpanel">
          <p className="hint">These are the tags offered on every contact. Tap the x to take one off the list.</p>
          <div className="tagchips">
            {tags.map((t) => (
              <span key={t} className="tagchip tagchip-edit">
                {t}
                <button aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </span>
            ))}
            {tags.length === 0 && <p className="hint">No tags yet. Add one below.</p>}
          </div>
          <form className="inline" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="New tag…" aria-label="New tag" maxLength={40} />
            <button className="btn btn-small" type="submit" disabled={!text.trim()}>Add</button>
          </form>
          <button className="linkish" onClick={() => setTags(DEFAULT_TAGS)} disabled={isDefault}>Reset to the starting list</button>
          <p className="hint">Removing a tag from this list does not remove it from contacts that already have it.</p>
        </div>
      ) : (
        <div role="tabpanel">
          <p className="hint">On: the field shows in details and can be edited. Off: it is hidden. Nothing is deleted from your contacts either way.</p>
          <ul className="switches">
            {FIELD_DEFS.map((f) => (
              <li key={f.key}>
                <span className="switch-label">
                  {f.label}
                  {f.own && <em>added by this app</em>}
                </span>
                <button
                  role="switch"
                  aria-checked={isOn(f.key)}
                  aria-label={f.label}
                  className={`switch ${isOn(f.key) ? 'is-on' : ''}`}
                  onClick={() => setField(f.key, !isOn(f.key))}
                >
                  <span className="knob" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
