const express = require('express');
const { config, PUBLIC_DIR } = require('./config');
const { getAuthUrl, handleCallback, isAuthenticated, getGmailClient } = require('./auth');
const { analysisState, runAnalysis, getSenders, getSenderGroup } = require('./analysis');
const { trashMessages, unsubscribeOneClick } = require('./actions');

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

function requireAuth(req, res, next) {
  if (!isAuthenticated()) return res.status(401).json({ error: 'not_authenticated' });
  next();
}

app.get('/api/status', (req, res) => {
  res.json({ authenticated: isAuthenticated() });
});

app.get('/auth/google', (req, res) => {
  res.redirect(getAuthUrl());
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Autorizzazione negata: ${error}`);
  try {
    await handleCallback(code);
    res.redirect('/');
  } catch (err) {
    res.status(500).send(`Errore durante l'autenticazione: ${err.message}`);
  }
});

let analysisRunning = false;

app.post('/api/analyze', requireAuth, (req, res) => {
  if (analysisRunning) return res.status(409).json({ error: 'analysis_in_progress' });
  analysisRunning = true;
  runAnalysis(getGmailClient())
    .catch(() => {})
    .finally(() => {
      analysisRunning = false;
    });
  res.json({ started: true });
});

app.get('/api/analyze/status', requireAuth, (req, res) => {
  res.json({ ...analysisState });
});

app.get('/api/senders', requireAuth, (req, res) => {
  res.json(getSenders(req.query.sort));
});

app.post('/api/senders/:email/unsubscribe', requireAuth, async (req, res) => {
  const group = getSenderGroup(decodeURIComponent(req.params.email));
  if (!group) return res.status(404).json({ error: 'sender_not_found' });
  if (group.unsubscribe.type !== 'one-click') return res.status(400).json({ error: 'not_one_click' });
  try {
    res.json(await unsubscribeOneClick(group.unsubscribe.url));
  } catch (err) {
    res.status(502).json({ error: 'unsubscribe_failed', message: err.message });
  }
});

app.post('/api/senders/:email/trash', requireAuth, async (req, res) => {
  const group = getSenderGroup(decodeURIComponent(req.params.email));
  if (!group) return res.status(404).json({ error: 'sender_not_found' });
  res.json(await trashMessages(getGmailClient(), group.messageIds));
});

app.listen(config.port, () => {
  console.log(`Gmail Cleaner in ascolto su http://localhost:${config.port}`);
});
