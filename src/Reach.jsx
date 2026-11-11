import { useState } from 'react';
import { reachOptions } from './contact.js';

// Tap a card: ways to message or call this person.
export default function Reach({ contact, onAddDetails }) {
  const [copied, setCopied] = useState(false);
  const options = reachOptions(contact);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="reach">
      {options.length === 0 && <p className="reach-empty">No phone, email or handles saved for this contact yet.</p>}
      {options.map((o) =>
        o.copy ? (
          <button key={o.key} className={`reach-row reach-${o.key}`} onClick={() => copy(o.copy)}>
            <span className="reach-dot" aria-hidden="true" />
            <span className="reach-label">{o.label}</span>
            <span className="reach-detail">{o.detail}</span>
            <span className="reach-go">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        ) : (
          <a key={o.key} className={`reach-row reach-${o.key}`} href={o.href} target="_blank" rel="noreferrer">
            <span className="reach-dot" aria-hidden="true" />
            <span className="reach-label">{o.label}</span>
            <span className="reach-detail">{o.detail}</span>
            <span className="reach-go" aria-hidden="true">›</span>
          </a>
        )
      )}
      <button className="btn btn-small reach-add" onClick={onAddDetails}>
        {options.length ? 'Add or edit details' : 'Add details'}
      </button>
    </div>
  );
}
