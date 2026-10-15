const express = require('express');
const { config, PUBLIC_DIR } = require('./config');
const {
  getAuthUrl,
  handleCallback,
  isAuthenticated,
  isAuthError,
  clearAuth,
  logout,
  getAccountEmail,
  getGmailClient,
} = require('./auth');
const { analysisState, runAnalysis, clearAnalysis, getSenders, getSenderGroup, SORT_KEYS } = require('./analysis');
const { trashMessages, unsubscribeOneClick } = require('./actions');
const { localGuard } = require('./security');

const app = express();
app.disable('x-powered-by');
app.use(localGuard);
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

function requireAuth(req, res, next) {
  if (!isAuthenticated()) return res.status(401).json({ error: 'not_authenticated' });
  next();
}

app.get('/api/status', (req, res) => {
  res.json({ authenticated: isAuthenticated(), email: getAccountEmail() });
});

app.get('/auth/google', (req, res) => {
  res.redirect(getAuthUrl());
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send('Autorizzazione negata.');
  try {
    await handleCallback(String(code || ''), String(state || ''));
    res.redirect('/');
  } catch (err) {
    console.error(`Errore durante l'autenticazione: ${err.message}`);
    res.status(400).send("Autenticazione non riuscita. Torna all'app e riprova.");
  }
});

app.post('/api/logout', async (req, res, next) => {
  if (analysisRunning) return res.status(409).json({ error: 'analysis_in_progress' });
  if (busySenders.size > 0) return res.status(409).json({ error: 'operation_in_progress' });
  try {
    await logout();
    clearAnalysis();
    res.json({ loggedOut: true });
  } catch (err) {
    next(err);
  }
});

let analysisRunning = false;
// Un'operazione alla volta per mittente; nessuna operazione mentre l'analisi ricostruisce i gruppi.
const busySenders = new Set();

app.post('/api/analyze', requireAuth, (req, res) => {
  if (analysisRunning) return res.status(409).json({ error: 'analysis_in_progress' });
  if (busySenders.size > 0) return res.status(409).json({ error: 'operation_in_progress' });
  analysisRunning = true;
  runAnalysis(getGmailClient())
    .catch((err) => {
      if (isAuthError(err)) clearAuth();
    })
    .finally(() => {
      analysisRunning = false;
    });
  res.json({ started: true });
});

app.get('/api/analyze/status', requireAuth, (req, res) => {
  res.json({ ...analysisState });
});

app.get('/api/senders', requireAuth, (req, res) => {
  const { sort } = req.query;
  if (sort !== undefined && !SORT_KEYS.includes(sort)) return res.status(400).json({ error: 'invalid_sort' });
  res.json(getSenders(sort));
});

const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

// Valida il mittente della route e riserva l'operazione. Restituisce il gruppo, oppure null dopo aver risposto.
function acquireSender(req, res) {
  const email = req.params.email;
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return null;
  }
  if (analysisRunning) {
    res.status(409).json({ error: 'analysis_in_progress' });
    return null;
  }
  const group = getSenderGroup(email.toLowerCase());
  if (!group) {
    res.status(404).json({ error: 'sender_not_found' });
    return null;
  }
  if (busySenders.has(group.email)) {
    res.status(409).json({ error: 'operation_in_progress' });
    return null;
  }
  busySenders.add(group.email);
  return group;
}

app.post('/api/senders/:email/unsubscribe', requireAuth, async (req, res) => {
  const group = acquireSender(req, res);
  if (!group) return;
  try {
    if (group.unsubscribe.type !== 'one-click') return res.status(400).json({ error: 'not_one_click' });
    res.json(await unsubscribeOneClick(group.unsubscribe.url));
  } catch (err) {
    res.status(502).json({ error: 'unsubscribe_failed', message: err.message });
  } finally {
    busySenders.delete(group.email);
  }
});

app.post('/api/senders/:email/trash', requireAuth, async (req, res, next) => {
  const group = acquireSender(req, res);
  if (!group) return;
  try {
    res.json(await trashMessages(getGmailClient(), group.messageIds));
  } catch (err) {
    next(err);
  } finally {
    busySenders.delete(group.email);
  }
});

// Gestione unica degli errori: nessuno stack né dettaglio interno al frontend.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (isAuthError(err)) {
    clearAuth();
    return res.status(401).json({ error: 'not_authenticated', reason: 'auth_expired' });
  }
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  console.error(`Errore su ${req.method} ${req.path}: ${err.message}`);
  res.status(status).json({ error: status === 500 ? 'internal_error' : 'bad_request' });
});

app.listen(config.port, '127.0.0.1', () => {
  console.log(`Gmail Cleaner in ascolto su http://localhost:${config.port}`);
});
