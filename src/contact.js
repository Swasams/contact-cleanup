// Shared helpers for the parts of a contact the app can show and edit.

// The app's own extra fields are stored in Google as "custom fields" under these names.
export const CUSTOM_KEYS = {
  howMet: 'How we met',
  metYear: 'Met in',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  discord: 'Discord',
};

export const DEFAULT_TAGS = ['School', 'Work', 'Family'];

// Every field, in the order it appears in details. Each one has a switch in
// Settings: on = shown in details and editable, off = hidden. "on: true"
// marks the ones that start switched on.
//   own:  a field this app adds (saved as a Google custom field)
//   type: which input to use
export const FIELD_DEFS = [
  { key: 'realName', label: 'Name', type: 'text', on: true },
  { key: 'nickname', label: 'Nickname', type: 'text' },
  { key: 'phonetic', label: 'Phonetic name', type: 'text' },
  { key: 'fileAs', label: 'File as', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'tel', on: true },
  { key: 'email', label: 'Email', type: 'email', on: true },
  { key: 'org', label: 'Company', type: 'text', on: true },
  { key: 'title', label: 'Job title', type: 'text', on: true },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'birthday', label: 'Birthday', type: 'date', on: true },
  { key: 'event', label: 'Significant date', type: 'date' },
  { key: 'website', label: 'Website', type: 'url' },
  { key: 'relation', label: 'Related person', type: 'text' },
  { key: 'instagram', label: 'Instagram', type: 'handle', on: true, own: true },
  { key: 'tiktok', label: 'TikTok', type: 'handle', on: true, own: true },
  { key: 'discord', label: 'Discord', type: 'handle', on: true, own: true },
  { key: 'notes', label: 'Notes', type: 'textarea', on: true },
  { key: 'howMet', label: 'How we met', type: 'tags', on: true, own: true },
  { key: 'metYear', label: 'When we met', type: 'year', on: true, own: true },
  { key: 'custom', label: 'Custom fields', type: 'custom' },
  { key: 'labels', label: 'Labels', type: 'readonly', note: 'View only' },
];

export const defaultOn = (key) => !!FIELD_DEFS.find((f) => f.key === key)?.on;

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
    else if (f.key === 'custom') for (const [k, v] of Object.entries(c.custom || {})) d['custom:' + k] = v || '';
    else if (f.key !== 'labels') d[f.key] = c[f.key] || '';
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
    } else if (f.key === 'custom') {
      n.custom = Object.fromEntries(
        Object.keys(d).filter((k) => k.startsWith('custom:') && d[k].trim()).map((k) => [k.slice(7), d[k].trim()])
      );
    } else if (f.key !== 'labels') n[f.key] = f.type === 'textarea' ? d[f.key] : d[f.key].trim();
  }
  return withDisplayName(n);
}

export const tagsOf = (howMet) => (howMet || '').split(',').map((t) => t.trim()).filter(Boolean);

const handle = (h) => h.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, '').replace(/\/.*$/, '');

// Ways to reach a contact, built from whatever is saved on it.
export function reachOptions(c) {
  const out = [];
  const phone = c.phones[0];
  if (phone) {
    const dial = phone.replace(/[^\d+]/g, '');
    out.push({ key: 'sms', label: 'Message', detail: phone, href: `sms:${dial}` });
    out.push({ key: 'whatsapp', label: 'WhatsApp', detail: phone, href: `https://wa.me/${dial.replace(/\D/g, '')}` });
    out.push({ key: 'call', label: 'Call', detail: phone, href: `tel:${dial}` });
  }
  if (c.emails[0]) out.push({ key: 'email', label: 'Email', detail: c.emails[0], href: `mailto:${c.emails[0]}` });
  if (c.instagram) out.push({ key: 'instagram', label: 'Instagram', detail: '@' + handle(c.instagram), href: `https://instagram.com/${handle(c.instagram)}` });
  if (c.tiktok) out.push({ key: 'tiktok', label: 'TikTok', detail: '@' + handle(c.tiktok), href: `https://www.tiktok.com/@${handle(c.tiktok)}` });
  if (c.discord) out.push({ key: 'discord', label: 'Discord', detail: c.discord, copy: c.discord }); // Discord has no link that opens a chat by username
  return out;
}

// A blank contact with every field present, so the rest of the app never has to check.
export const emptyContact = () => ({
  id: '', realName: '', nickname: '', phonetic: '', fileAs: '', phones: [], emails: [], org: '', title: '', department: '',
  address: '', birthday: null, event: null, website: '', relation: '', instagram: '', tiktok: '', discord: '', notes: '',
  howMet: '', metYear: '', custom: {}, labels: [], photo: null, starred: false,
});
