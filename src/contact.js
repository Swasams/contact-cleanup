// Shared helpers for the editable parts of a contact.

// Our own extra fields are stored in Google as "custom fields" under these names.
export const CUSTOM_KEYS = {
  howMet: 'How we met',
  metYear: 'Met in',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  discord: 'Discord',
};

export const MET_OPTIONS = ['School', 'Work', 'Family', 'Friend of a friend', 'Dating', 'Neighbor', 'Online', 'Event', 'Travel', 'Service'];

// The flat set of values the details screen edits.
export function draftOf(c) {
  return {
    realName: c.realName || '',
    phone: c.phones[0] || '',
    email: c.emails[0] || '',
    org: c.org || '',
    title: c.title || '',
    notes: c.notes || '',
    instagram: c.instagram || '',
    tiktok: c.tiktok || '',
    discord: c.discord || '',
    howMet: c.howMet || '',
    metYear: c.metYear || '',
  };
}

export function sameDraft(a, b) {
  return Object.keys(a).every((k) => (a[k] || '') === (b[k] || ''));
}

// Work out the name shown on the card: the real name, or the best stand-in.
export function withDisplayName(c) {
  return { ...c, hasName: !!c.realName, name: c.realName || c.org || c.emails[0] || c.phones[0] || 'No name saved' };
}

// Apply edited values to a contact (only the first phone and email are editable; the rest are kept).
export function applyDraft(c, d) {
  const { phone, email, ...rest } = d;
  return withDisplayName({
    ...c,
    ...rest,
    phones: [phone.trim(), ...c.phones.slice(1)].filter(Boolean),
    emails: [email.trim(), ...c.emails.slice(1)].filter(Boolean),
  });
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
