import { useState } from 'react';
import { FIELD_DEFS } from './contact.js';
import ReadMe from './ReadMe.jsx';

// Settings popup, two tabs:
//   Display - the "How we met" tags offered on every contact, then one switch
//             per contact field (on = shown in details and editable, off = hidden)
//   Read me - the author's note and the instructions
export default function Settings({ tags, onAddTag, onRemoveTag, google, isOn, setField }) {
  const [tab, setTab] = useState('display');
  const [text, setText] = useState('');

  const add = () => {
    const t = text.trim().replace(/,/g, ' ');
    if (t) onAddTag(t);
    setText('');
  };

  return (
    <div className="settings">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'display'} className={tab === 'display' ? 'is-on' : ''} onClick={() => setTab('display')}>Display</button>
        <button role="tab" aria-selected={tab === 'readme'} className={tab === 'readme' ? 'is-on' : ''} onClick={() => setTab('readme')}>Read me</button>
      </div>

      {tab === 'readme' ? (
        <div role="tabpanel"><ReadMe /></div>
      ) : (
        <div role="tabpanel">
          <h3 className="first">How we met tags</h3>
          <p className="hint">
            {google
              ? 'These are the labels in your Google Contacts, plus any tags you add. A new tag becomes a Google label the first time you put it on a contact.'
              : 'These are the tags offered on every contact. A tag you make on a contact is added here too.'}
          </p>
          <div className="tagchips">
            {tags.map((t) => (
              <span key={t} className="tagchip tagchip-edit">
                {t}
                <button aria-label={`Remove ${t}`} onClick={() => onRemoveTag(t)}>
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
          <p className="hint">Tapping the x removes a tag from every contact that has it.</p>

          <h3>Fields</h3>
          <p className="hint">
            On: the field shows in details and can be edited.
            <br />
            Off: it is hidden.
            <br />
            Nothing is deleted from your contacts either way.
          </p>
          <ul className="switches">
            {FIELD_DEFS.map((f) => (
              <li key={f.key}>
                <span className="switch-label">
                  {f.label}
                  {f.own && <em>{f.key === 'howMet' && google ? 'your Google Contacts labels' : 'added by this app as a custom field'}</em>}
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
