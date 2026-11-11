import { reachOptions } from './contact.js';

// Tap a card: ways to reach this person.
export default function Reach({ contact, onAddDetails }) {
  const options = reachOptions(contact);
  return (
    <div className="reach">
      {options.map((o) => (
        <a key={o.key} className={`reach-row reach-${o.key}`} href={o.href} target="_blank" rel="noreferrer">
          <span className="reach-dot" aria-hidden="true" />
          <span className="reach-label">{o.label}</span>
          <span className="reach-detail">{o.detail}</span>
          <span className="reach-go" aria-hidden="true">›</span>
        </a>
      ))}
      {options.length === 0 && (
        <>
          <p className="reach-empty">No phone number or email saved for this contact yet.</p>
          <button className="btn btn-small reach-add" onClick={onAddDetails}>Add details</button>
        </>
      )}
      {options.length > 0 && <p className="reach-cheer">Go reach out to your friend. They miss you!</p>}
    </div>
  );
}
