const { config } = require('./config');

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1'];
const SAFE_METHODS = new Set(['GET', 'HEAD']);

function buildAllowedHosts() {
  const hosts = new Set(LOCAL_HOSTNAMES.map((h) => `${h}:${config.port}`));
  try {
    const redirect = new URL(config.googleRedirectUri);
    if (LOCAL_HOSTNAMES.includes(redirect.hostname)) hosts.add(redirect.host);
  } catch (err) {
    // URI non valido: restano solo gli host locali predefiniti.
  }
  return hosts;
}

const ALLOWED_HOSTS = buildAllowedHosts();

function isAllowedOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ALLOWED_HOSTS.has(url.host);
  } catch (err) {
    return false;
  }
}

// Difende da CSRF e DNS rebinding: accetta solo richieste dirette a localhost e,
// per quelle che modificano qualcosa, solo da una pagina servita dall'app stessa.
function localGuard(req, res, next) {
  const host = String(req.headers.host || '').toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return res.status(403).json({ error: 'forbidden_host' });

  const origin = req.headers.origin;
  if (origin !== undefined) {
    if (!isAllowedOrigin(origin)) return res.status(403).json({ error: 'forbidden_origin' });
  } else if (!SAFE_METHODS.has(req.method)) {
    return res.status(403).json({ error: 'origin_required' });
  }
  next();
}

module.exports = { localGuard };
