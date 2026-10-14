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

function getAuthUrl() {
  return getAuthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
}

async function handleCallback(code) {
  const client = getAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  saveToken(tokens);
}

function isAuthenticated() {
  const saved = loadToken();
  return Boolean(saved && saved.refresh_token);
}

function getGmailClient() {
  return google.gmail({ version: 'v1', auth: getAuthClient() });
}

module.exports = { getAuthUrl, handleCallback, isAuthenticated, getGmailClient };
