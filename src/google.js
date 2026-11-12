// Google sign-in + People API. Everything runs in the browser: the access
// token and the contacts never touch any server other than Google's.

import { CUSTOM_KEYS, draftOf, parseDate, emptyContact, withDisplayName, tagsOf, joinTags } from './contact.js';

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SCOPE = 'https://www.googleapis.com/auth/contacts';
const API = 'https://people.googleapis.com/v1/';
const TOKEN_KEY = 'cc.token';
const STATE_KEY = 'cc.oauth_state';
const FIELDS = 'names,phoneNumbers,emailAddresses,birthdays,organizations,photos,memberships,userDefined,biographies,addresses,events';
const STARRED = 'contactGroups/starred'; // Google's built-in "Starred" group = favorites

export class AuthError extends Error {}

// The exact URL that must be listed under "Authorized redirect URIs"
// for the OAuth client in Google Cloud Console.
export function redirectUri() {
  return window.location.origin + window.location.pathname;
}

// Full-page redirect (not a popup) so it also works from an iPhone Home Screen app.
export function startSignIn() {
  const state = crypto.randomUUID();
  localStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    state,
    include_granted_scopes: 'true',
  });
  window.location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + params);
}

// Call once on page load. Returns null (no redirect happened),
// { ok: true } (signed in) or { error: '...' }.
export function consumeRedirect() {
  const hash = window.location.hash;
  if (!hash.includes('access_token=') && !hash.includes('error=')) return null;
  const h = new URLSearchParams(hash.slice(1));
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  const expected = localStorage.getItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  if (h.get('error')) {
    return { error: h.get('error') === 'access_denied' ? 'Sign-in was cancelled.' : `Google sign-in failed (${h.get('error')}).` };
  }
  if (!expected || h.get('state') !== expected) {
    return { error: 'Sign-in could not be verified. Please try again.' };
  }
  const expiresAt = Date.now() + (Number(h.get('expires_in')) || 3600) * 1000 - 60000;
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: h.get('access_token'), expiresAt }));
  return { ok: true };
}

function getToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    if (t && t.token && t.expiresAt > Date.now()) return t.token;
  } catch {}
  return null;
}

export const isSignedIn = () => !!getToken();

export function signOut() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function api(path, opts = {}) {
  const token = getToken();
  if (!token) throw new AuthError('Your Google session expired. Sign in again to continue.');
  const res = await fetch(API + path, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (res.status === 401) {
    signOut();
    throw new AuthError('Your Google session expired. Sign in again to continue.');
  }
  if (!res.ok) {
    let msg = `Google returned an error (${res.status}).`;
    try {
      msg = (await res.json()).error.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

const OURS = new Set(Object.values(CUSTOM_KEYS));
const JSON_POST = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

// ---------- labels ----------
// "How we met" tags are the account's own Google Contacts labels. The app
// reads the labels that exist; it only creates one when you put a new tag on a
// contact, and only deletes one when you remove a tag in Settings and confirm.

let groups = new Map(); // label ID -> label name (your own labels only, not Google's built-in groups)

async function fetchGroups() {
  const next = new Map();
  let pageToken = '';
  do {
    const q = new URLSearchParams({ pageSize: '1000' });
    if (pageToken) q.set('pageToken', pageToken);
    const data = await api('contactGroups?' + q);
    for (const g of data.contactGroups || []) if (g.groupType === 'USER_CONTACT_GROUP') next.set(g.resourceName, g.name);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  groups = next;
}

// The names of the labels on this account.
export const listLabels = () => [...groups.values()];

const groupIdOf = (name) => [...groups].find(([, n]) => same(n, name))?.[0] || null;
const labelsOn = (p) => (p.memberships || []).map((m) => groups.get(m.contactGroupMembership?.contactGroupResourceName)).filter(Boolean);
const legacyTagsOf = (p) => tagsOf((p.userDefined || []).find((u) => u.key === CUSTOM_KEYS.howMet)?.value || '');

// Find the label with this name, creating it in Google Contacts if there is none.
async function ensureGroup(name) {
  const existing = groupIdOf(name);
  if (existing) return existing;
  try {
    const g = await api('contactGroups', { ...JSON_POST, body: JSON.stringify({ contactGroup: { name } }) });
    groups.set(g.resourceName, g.name || name);
    return g.resourceName;
  } catch (err) {
    await fetchGroups(); // it may already exist (made elsewhere since we loaded)
    const found = groupIdOf(name);
    if (found) return found;
    throw err;
  }
}

const modifyMembers = (groupId, body) => api(`${groupId}/members:modify`, { ...JSON_POST, body: JSON.stringify(body) });

// Delete a label from the account. This takes it off every contact that has
// it; the contacts themselves are kept.
export function deleteLabel(name) {
  return enqueue(async () => {
    const id = groupIdOf(name);
    if (!id) return;
    await api(`${id}?deleteContacts=false`, { method: 'DELETE' });
    groups.delete(id);
  });
}

export function normalize(p) {
  const org = p.organizations?.[0] || {};
  const all = Object.fromEntries((p.userDefined || []).map((u) => [u.key, u.value]));
  return withDisplayName({
    ...emptyContact(),
    id: p.resourceName,
    realName: p.names?.[0]?.displayName || '',
    phones: (p.phoneNumbers || []).map((x) => x.value).filter(Boolean),
    emails: (p.emailAddresses || []).map((x) => x.value).filter(Boolean),
    org: org.name || '',
    title: org.title || '',
    address: p.addresses?.[0]?.formattedValue || '',
    birthday: p.birthdays?.find((x) => x.date)?.date || null,
    event: p.events?.find((x) => x.date)?.date || null,
    photo: p.photos?.find((x) => !x.default)?.url || null,
    starred: (p.memberships || []).some((m) => m.contactGroupMembership?.contactGroupResourceName === STARRED),
    notes: p.biographies?.[0]?.value || '',
    howMet: joinTags([...labelsOn(p), ...legacyTagsOf(p)]), // labels, plus any tags still saved the old way
    raw: p, // the original record, needed to save edits without losing anything
  });
}

export async function fetchAllContacts(onProgress) {
  await fetchGroups(); // labels first, so each contact knows which ones it has
  const out = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ personFields: FIELDS, pageSize: '1000' });
    if (pageToken) q.set('pageToken', pageToken);
    const data = await api('people/me/connections?' + q);
    for (const p of data.connections || []) out.push(normalize(p));
    onProgress?.(out.length, data.totalItems || out.length);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}

// keepalive lets the request finish even if the page is being closed.
export function deleteContact(id, { keepalive = false } = {}) {
  return api(`${id}:deleteContact`, { method: 'DELETE', keepalive });
}

// Add a contact to, or remove it from, Google's "Starred" group.
export function setStarred(id, starred) {
  return modifyMembers(STARRED, starred ? { resourceNamesToAdd: [id] } : { resourceNamesToRemove: [id] });
}

// Save edits from the details screen. Only the parts that actually changed are
// sent, so untouched fields (and anything this app does not know about) stay as they are.
// For fields that can hold several entries, only the first is edited; the rest are kept.
// Saves run one at a time. Google asks for this: two changes to the same
// account sent at once can trip over each other.
let saveQueue = Promise.resolve();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function updateContact(contact, draft) {
  const run = async () => {
    // Google refuses a save made from an out-of-date copy, and its own copy can
    // lag for a moment after a change. So: fetch the latest, try, and if it
    // still says "out of date", wait a little and try again.
    const delays = [700, 1800];
    for (let attempt = 0; ; attempt++) {
      try {
        return await saveOnce(contact, draft);
      } catch (err) {
        if (err instanceof AuthError || !/etag/i.test(err.message) || attempt >= delays.length) throw err;
        await wait(delays[attempt]);
      }
    }
  };
  return enqueue(run);
}

function enqueue(job) {
  const result = saveQueue.then(job, job);
  saveQueue = result.catch(() => {});
  return result;
}

// Tags saved the old way (in a custom field) are moved to labels: each one is
// added to the contact as a label, then the old custom field is removed. Runs
// quietly in the background after loading; anything that fails is simply tried
// again next time.
export function migrateLegacyTags(contacts, onUpdated) {
  const todo = contacts.filter((c) => (c.raw?.userDefined || []).some((u) => u.key === CUSTOM_KEYS.howMet));
  for (const c of todo) {
    enqueue(async () => {
      let raw = await api(`${c.id}?personFields=${FIELDS}`);
      const old = legacyTagsOf(raw);
      if (!(raw.userDefined || []).some((u) => u.key === CUSTOM_KEYS.howMet)) return;
      const have = labelsOn(raw);
      const missing = old.filter((t) => !have.some((h) => same(h, t)));
      for (const t of missing) await modifyMembers(await ensureGroup(t), { resourceNamesToAdd: [c.id] });
      if (missing.length) raw = await api(`${c.id}?personFields=${FIELDS}`);
      const q = new URLSearchParams({ updatePersonFields: 'userDefined', personFields: FIELDS });
      const person = await api(`${c.id}:updateContact?${q}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etag: raw.etag,
          userDefined: (raw.userDefined || []).filter((u) => u.key !== CUSTOM_KEYS.howMet).map(({ key, value }) => ({ key, value })),
        }),
      });
      onUpdated(normalize(person));
    }).catch((err) => console.error('Could not move old tags for one contact:', err));
  }
}

// Google's current copy of one contact.
export async function fetchContact(id) {
  return normalize(await api(`${id}?personFields=${FIELDS}`));
}

async function saveOnce(contact, draft) {
  const before = draftOf(contact);
  // Start from Google's current copy. The one loaded earlier goes stale as soon
  // as anything changes the contact, including starring it.
  let raw = await api(`${contact.id}?personFields=${FIELDS}`);
  const val = (k) => (draft[k] || '').trim();
  const changed = (...keys) => keys.some((k) => (draft[k] || '') !== (before[k] || ''));

  // Tags are labels. Add the ones now wanted that the contact lacks, and take
  // off only the ones that were switched off here. Other labels are not touched.
  let touchedLabels = false;
  if (changed('howMet')) {
    const want = tagsOf(draft.howMet);
    const was = tagsOf(before.howMet);
    const have = labelsOn(raw);
    const adds = want.filter((t) => !have.some((h) => same(h, t)));
    const removes = was.filter((t) => !want.some((w) => same(w, t)) && have.some((h) => same(h, t)));
    for (const t of adds) await modifyMembers(await ensureGroup(t), { resourceNamesToAdd: [contact.id] });
    for (const t of removes) await modifyMembers(groupIdOf(t), { resourceNamesToRemove: [contact.id] });
    if (adds.length || removes.length) {
      touchedLabels = true;
      raw = await api(`${contact.id}?personFields=${FIELDS}`); // the label change gave the contact a new version stamp
    }
  }
  const strip = ({ metadata, formattedType, canonicalForm, ...rest }) => rest; // drop read-only parts
  const rest = (field) => (raw[field] || []).slice(1).map(strip);
  const keep = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k]).map((k) => [k, obj[k]]));
  const body = { etag: raw.etag };
  const mask = [];
  // Replace the first entry of a list field (or remove it when the new one is null).
  const put = (field, first) => {
    mask.push(field);
    body[field] = [...(first ? [first] : []), ...rest(field)];
  };

  if (changed('realName')) {
    mask.push('names');
    body.names = val('realName') ? [{ unstructuredName: val('realName') }] : [];
  }
  if (changed('phone')) put('phoneNumbers', val('phone') ? { value: val('phone'), type: raw.phoneNumbers?.[0]?.type } : null);
  if (changed('email')) put('emailAddresses', val('email') ? { value: val('email'), type: raw.emailAddresses?.[0]?.type } : null);
  if (changed('org', 'title')) {
    const o = raw.organizations?.[0] || {};
    const any = val('org') || val('title') || o.department;
    put('organizations', any ? { ...keep(o, ['department', 'type']), name: val('org'), title: val('title') } : null);
  }
  if (changed('address')) put('addresses', val('address') ? { streetAddress: val('address'), type: raw.addresses?.[0]?.type } : null);
  if (changed('birthday')) {
    const d = parseDate(draft.birthday);
    if (d !== undefined) put('birthdays', d ? { date: d } : null);
  }
  if (changed('event')) {
    const d = parseDate(draft.event);
    if (d !== undefined) put('events', d ? { date: d, type: raw.events?.[0]?.type || 'anniversary' } : null);
  }
  if (changed('notes')) {
    mask.push('biographies');
    body.biographies = val('notes') ? [{ value: draft.notes, contentType: 'TEXT_PLAIN' }] : [];
  }
  // An old-style tags field is dropped once its tags are labels (just above).
  // Every other custom field on the contact is left untouched.
  if (changed('howMet') && (raw.userDefined || []).some((u) => u.key === CUSTOM_KEYS.howMet)) {
    mask.push('userDefined');
    body.userDefined = (raw.userDefined || []).filter((u) => u.key !== CUSTOM_KEYS.howMet).map(({ key, value }) => ({ key, value }));
  }
  if (!mask.length) return touchedLabels ? normalize(raw) : contact;

  const q = new URLSearchParams({ updatePersonFields: mask.join(','), personFields: FIELDS });
  const person = await api(`${contact.id}:updateContact?${q}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return normalize(person);
}
