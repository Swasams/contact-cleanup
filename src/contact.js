// Shared helpers for the parts of a contact the app can show and edit.

// The app's own extra fields are stored in Google as "custom fields" under these names.
// howMet is the old home of the tags. With Google connected, tags are now the
// account's labels, and any tags still saved the old way are moved across.
export const CUSTOM_KEYS = {
  howMet: 'How we met',
};

export const DEFAULT_TAGS = ['School', 'Work', 'Family'];

// Every field the app shows, in the order it appears in details. Each one has
// a switch in Settings: on = shown in details and editable, off = hidden.
//   own:  a field this app adds (saved as a Google custom field)
//   type: which input to use
export const FIELD_DEFS = [
  { key: 'realName', label: 'Name', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'org', label: 'Company', type: 'text' },
  { key: 'title', label: 'Job title', type: 'text' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'birthday', label: 'Birthday', type: 'date' },
  { key: 'event', label: 'Significant date', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
  { key: 'howMet', label: 'How we met', type: 'tags', own: true },
];

// Every field starts switched on.
export const defaultOn = (key) => FIELD_DEFS.some((f) => f.key === key);

// Dates are typed as MM/DD or MM/DD/YYYY.
export function fmtDate(d) {
  if (!d || !d.month || !d.day) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.month)}/${p(d.day)}${d.year ? '/' + d.year : ''}`;
}

// Returns a date object, null for "empty", or undefined when it cannot be read.
export function parseDate(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}))?$/);
  if (!m) return undefined;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return m[3] ? { year: Number(m[3]), month, day } : { month, day };
}

// The flat set of text values the details screen edits.
export function draftOf(c) {
  const d = {};
  for (const f of FIELD_DEFS) {
    if (f.key === 'phone') d.phone = c.phones[0] || '';
    else if (f.key === 'email') d.email = c.emails[0] || '';
    else if (f.type === 'date') d[f.key] = fmtDate(c[f.key]);
    else d[f.key] = c[f.key] || '';
  }
  return d;
}

export function sameDraft(a, b) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => (a[k] || '') === (b[k] || ''));
}

// Work out the name shown on the card: the real name, or the best stand-in.
export function withDisplayName(c) {
  return { ...c, hasName: !!c.realName, name: c.realName || c.org || c.emails[0] || c.phones[0] || 'No name saved' };
}

// Apply edited values to a contact. Only the first phone and email are
// editable; the rest are kept. A date that cannot be read is left as it was.
export function applyDraft(c, changes) {
  const d = { ...draftOf(c), ...changes };
  const n = { ...c };
  for (const f of FIELD_DEFS) {
    if (f.key === 'phone') n.phones = [d.phone.trim(), ...c.phones.slice(1)].filter(Boolean);
    else if (f.key === 'email') n.emails = [d.email.trim(), ...c.emails.slice(1)].filter(Boolean);
    else if (f.type === 'date') {
      const parsed = parseDate(d[f.key]);
      if (parsed !== undefined) n[f.key] = parsed;
    } else n[f.key] = f.type === 'textarea' ? d[f.key] : d[f.key].trim();
  }
  return withDisplayName(n);
}

// A contact's tags travel through the app as one string. Tags are separated by
// an invisible character, because a Google label's own name may contain a comma.
// (Older saved values were comma-separated, and are still read correctly.)
const SEP = '\u001f';
export const tagsOf = (howMet) => (howMet || '').split((howMet || '').includes(SEP) ? SEP : ',').map((t) => t.trim()).filter(Boolean);
export function joinTags(list) {
  const out = [];
  for (const t of list) if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  const s = out.join(SEP);
  return s.includes(',') && !s.includes(SEP) ? s + SEP : s;
}
export const hasTag = (c, tag) => tagsOf(c.howMet).some((t) => t.toLowerCase() === tag.toLowerCase());

// Build one way to reach a contact, or null if the contact lacks what it needs.
// On a phone the Gmail row opens the phone's mail app (Gmail, if Gmail is set
// as the default); on a computer it opens a new Gmail message.
export function linkFor(kind, c) {
  const phone = c.phones[0];
  const email = c.emails[0];
  const dial = phone ? phone.replace(/[^\d+]/g, '') : '';
  const onPhone = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  switch (kind) {
    case 'sms':
      return phone ? { key: 'sms', label: 'Messages', detail: phone, href: `sms:${dial}` } : null;
    case 'whatsapp':
      return phone ? { key: 'whatsapp', label: 'WhatsApp', detail: phone, href: `https://wa.me/${dial.replace(/\D/g, '')}` } : null;
    case 'email':
      return email
        ? { key: 'email', label: 'Gmail', detail: email, href: onPhone ? `mailto:${email}` : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}` }
        : null;
    case 'call':
      return phone ? { key: 'call', label: 'Call', detail: phone, href: `tel:${dial}` } : null;
    case 'facetime':
      return phone || email ? { key: 'facetime', label: 'FaceTime', detail: phone || email, href: `facetime:${dial || email}` } : null;
    default:
      return null;
  }
}

export const linksFor = (kinds, c) => kinds.map((k) => linkFor(k, c)).filter(Boolean);

// Tap a card: Messages, Gmail, WhatsApp.
export const reachOptions = (c) => linksFor(['sms', 'email', 'whatsapp'], c);

// A blank contact with every field present, so the rest of the app never has to check.
export const emptyContact = () => ({
  id: '', realName: '', phones: [], emails: [], org: '', title: '', address: '', birthday: null, event: null,
  notes: '', howMet: '', photo: null, starred: false,
});
