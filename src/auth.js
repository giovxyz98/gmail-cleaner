const crypto = require('crypto');
const fs = require('fs');
const { google } = require('googleapis');
const { config, DATA_DIR, TOKEN_PATH } = require('./config');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

function loadToken() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  } catch (err) {
    return null;
  }
}

function saveToken(tokens) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
}

let oauth2Client = null;

function getAuthClient() {
  if (oauth2Client) return oauth2Client;

  oauth2Client = new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);

  const saved = loadToken();
  if (saved) oauth2Client.setCredentials(saved);

  oauth2Client.on('tokens', (tokens) => {
    const existing = loadToken() || {};
    const merged = { ...existing, ...tokens };
    if (!tokens.refresh_token && existing.refresh_token) {
      merged.refresh_token = existing.refresh_token;
    }
    saveToken(merged);
  });

  return oauth2Client;
}

// Il parametro state lega la risposta di Google al login avviato da questa istanza (anti login-CSRF).
const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map();

function createOAuthState() {
  const now = Date.now();
  for (const [value, expires] of pendingStates) {
    if (expires <= now) pendingStates.delete(value);
  }
  const state = crypto.randomBytes(24).toString('hex');
  pendingStates.set(state, now + STATE_TTL_MS);
  return state;
}

function consumeOAuthState(state) {
  const expires = pendingStates.get(state);
  pendingStates.delete(state);
  return Boolean(expires && expires > Date.now());
}

function getAuthUrl() {
  return getAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: createOAuthState(),
  });
}

async function handleCallback(code, state) {
  if (!code || !consumeOAuthState(state)) throw new Error('Richiesta di autenticazione non valida o scaduta.');
  const client = getAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  saveToken(tokens);

  // L'indirizzo serve solo a mostrare quale account è collegato: se il recupero fallisce il login resta valido.
  try {
    const profile = await getGmailClient().users.getProfile({ userId: 'me' });
    saveToken({ ...loadToken(), email: profile.data.emailAddress });
  } catch (err) {
    console.warn(`Impossibile leggere l'indirizzo dell'account: ${err.message}`);
  }
}

function isAuthenticated() {
  const saved = loadToken();
  return Boolean(saved && saved.refresh_token);
}

// Token revocato o scaduto in modo irrecuperabile (revoca dall'account Google, password cambiata, 7 giorni in "Testing").
function isAuthError(err) {
  const status = err?.response?.status ?? err?.status ?? err?.code;
  const code = err?.response?.data?.error;
  return code === 'invalid_grant' || /invalid_grant/.test(err?.message || '') || status === 401;
}

// Dimentica il token: da qui l'app risulta scollegata e il frontend propone un nuovo login.
function clearAuth() {
  try {
    fs.unlinkSync(TOKEN_PATH);
  } catch (err) {
    // Già assente.
  }
  oauth2Client = null;
}

function getAccountEmail() {
  return loadToken()?.email || null;
}

function getGmailClient() {
  return google.gmail({ version: 'v1', auth: getAuthClient() });
}

module.exports = { getAuthUrl, handleCallback, isAuthenticated, isAuthError, clearAuth, getAccountEmail, getGmailClient };
