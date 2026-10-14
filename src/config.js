const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TOKEN_PATH = path.join(DATA_DIR, 'token.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.port = parsed.port || 3000;
  parsed.googleRedirectUri = parsed.googleRedirectUri || `http://localhost:${parsed.port}/auth/google/callback`;
  return parsed;
}

const config = loadConfig();

if (!config.googleClientId || !config.googleClientSecret) {
  console.warn('googleClientId / googleClientSecret non impostati in config.json. Configura il file prima di collegare un account.');
}

module.exports = { config, DATA_DIR, TOKEN_PATH, PUBLIC_DIR };
