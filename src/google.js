// Google sign-in + People API. Everything runs in the browser: the access
// token and the contacts never touch any server other than Google's.

import { CUSTOM_KEYS, draftOf, withDisplayName } from './contact.js';

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SCOPE = 'https://www.googleapis.com/auth/contacts';
const API = 'https://people.googleapis.com/v1/';
const TOKEN_KEY = 'cc.token';
const STATE_KEY = 'cc.oauth_state';
const FIELDS = 'names,phoneNumbers,emailAddresses,birthdays,organizations,photos,memberships,userDefined,biographies';
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

export function normalize(p) {
  const org = p.organizations?.[0] || {};
  const custom = Object.fromEntries((p.userDefined || []).map((u) => [u.key, u.value]));
  return withDisplayName({
    id: p.resourceName,
    realName: p.names?.[0]?.displayName || '',
    phones: (p.phoneNumbers || []).map((x) => x.value).filter(Boolean),
    emails: (p.emailAddresses || []).map((x) => x.value).filter(Boolean),
    org: org.name || '',
    title: org.title || '',
    birthday: p.birthdays?.find((x) => x.date)?.date || null,
    photo: p.photos?.find((x) => !x.default)?.url || null,
    starred: (p.memberships || []).some((m) => m.contactGroupMembership?.contactGroupResourceName === STARRED),
    notes: p.biographies?.[0]?.value || '',
    howMet: custom[CUSTOM_KEYS.howMet] || '',
    metYear: custom[CUSTOM_KEYS.metYear] || '',
    instagram: custom[CUSTOM_KEYS.instagram] || '',
    tiktok: custom[CUSTOM_KEYS.tiktok] || '',
    discord: custom[CUSTOM_KEYS.discord] || '',
    raw: p, // the original record, needed to save edits without losing anything
  });
}

export async function fetchAllContacts(onProgress) {
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
  return api(`${STARRED}/members:modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(starred ? { resourceNamesToAdd: [id] } : { resourceNamesToRemove: [id] }),
  });
}

// Save edits from the details screen. Only the parts that actually changed are
// sent, so untouched fields (and anything this app does not know about) stay as they are.
export async function updateContact(contact, draft) {
  const before = draftOf(contact);
  const raw = contact.raw || {};
  const changed = (...keys) => keys.some((k) => (draft[k] || '') !== (before[k] || ''));
  const body = { etag: raw.etag };
  const mask = [];

  if (changed('realName')) {
    mask.push('names');
    body.names = draft.realName.trim() ? [{ unstructuredName: draft.realName.trim() }] : [];
  }
  if (changed('phone')) {
    mask.push('phoneNumbers');
    const rest = (raw.phoneNumbers || []).slice(1).map(({ value, type }) => ({ value, type }));
    body.phoneNumbers = [...(draft.phone.trim() ? [{ value: draft.phone.trim(), type: raw.phoneNumbers?.[0]?.type }] : []), ...rest];
  }
  if (changed('email')) {
    mask.push('emailAddresses');
    const rest = (raw.emailAddresses || []).slice(1).map(({ value, type }) => ({ value, type }));
    body.emailAddresses = [...(draft.email.trim() ? [{ value: draft.email.trim(), type: raw.emailAddresses?.[0]?.type }] : []), ...rest];
  }
  if (changed('org', 'title')) {
    mask.push('organizations');
    const rest = (raw.organizations || []).slice(1).map(({ name, title, type }) => ({ name, title, type }));
    body.organizations = [...(draft.org.trim() || draft.title.trim() ? [{ name: draft.org.trim(), title: draft.title.trim() }] : []), ...rest];
  }
  if (changed('notes')) {
    mask.push('biographies');
    body.biographies = draft.notes.trim() ? [{ value: draft.notes, contentType: 'TEXT_PLAIN' }] : [];
  }
  if (changed(...Object.keys(CUSTOM_KEYS))) {
    mask.push('userDefined');
    const ours = new Set(Object.values(CUSTOM_KEYS));
    const others = (raw.userDefined || []).filter((u) => !ours.has(u.key)).map(({ key, value }) => ({ key, value }));
    const mine = Object.entries(CUSTOM_KEYS).filter(([k]) => (draft[k] || '').trim()).map(([k, key]) => ({ key, value: draft[k].trim() }));
    body.userDefined = [...others, ...mine];
  }
  if (!mask.length) return contact;

  const q = new URLSearchParams({ updatePersonFields: mask.join(','), personFields: FIELDS });
  const person = await api(`${contact.id}:updateContact?${q}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return normalize(person);
}
