// Google sign-in + People API. Everything runs in the browser: the access
// token and the contacts never touch any server other than Google's.

export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SCOPE = 'https://www.googleapis.com/auth/contacts';
const API = 'https://people.googleapis.com/v1/';
const TOKEN_KEY = 'cc.token';
const STATE_KEY = 'cc.oauth_state';
const FIELDS = 'names,phoneNumbers,emailAddresses,birthdays,organizations,photos';

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
  const name = p.names?.[0]?.displayName || '';
  const org = p.organizations?.[0] || {};
  const b = p.birthdays?.find((x) => x.date)?.date || null;
  const photo = p.photos?.find((x) => !x.default)?.url || null;
  const phones = (p.phoneNumbers || []).map((x) => x.value).filter(Boolean);
  const emails = (p.emailAddresses || []).map((x) => x.value).filter(Boolean);
  return {
    id: p.resourceName,
    name: name || org.name || emails[0] || phones[0] || 'No name saved',
    hasName: !!name,
    phones,
    emails,
    org: org.name || '',
    title: org.title || '',
    birthday: b,
    photo,
  };
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
