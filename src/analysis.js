const pLimit = require('p-limit');
const { withRetry } = require('./retry');
const { isAuthError } = require('./auth');
const { parseFrom, resolveUnsubscribeMethod, headerValue } = require('./parsers');

const METADATA_HEADERS = ['From', 'Date', 'Subject', 'List-Unsubscribe', 'List-Unsubscribe-Post', 'List-ID'];

const analysisState = { status: 'idle', processed: 0, total: 0, error: null };
let senderGroups = new Map();

function resetAnalysisState() {
  analysisState.status = 'listing';
  analysisState.processed = 0;
  analysisState.total = 0;
  analysisState.error = null;
  senderGroups = new Map();
}

function ingestMessage(message) {
  const headers = message.payload?.headers || [];
  const fromRaw = headerValue(headers, 'From');
  const { name, email } = parseFrom(fromRaw);
  if (!email) return;

  const listUnsubscribe = headerValue(headers, 'List-Unsubscribe');
  const listUnsubscribePost = headerValue(headers, 'List-Unsubscribe-Post');
  const timestamp = Number(message.internalDate) || Date.now();
  const labelIds = message.labelIds || [];

  let group = senderGroups.get(email);
  if (!group) {
    group = {
      email,
      name: name || email,
      count: 0,
      firstDate: timestamp,
      lastDate: timestamp,
      inboxCount: 0,
      spamCount: 0,
      trashCount: 0,
      unsubscribe: { type: 'none', url: null, mailto: null },
      messageIds: [],
    };
    senderGroups.set(email, group);
  }

  group.count += 1;
  group.messageIds.push(message.id);
  if (timestamp < group.firstDate) group.firstDate = timestamp;
  if (timestamp >= group.lastDate) {
    group.lastDate = timestamp;
    if (name) group.name = name;
    group.unsubscribe = resolveUnsubscribeMethod(listUnsubscribe, listUnsubscribePost);
  }

  if (labelIds.includes('INBOX')) group.inboxCount += 1;
  if (labelIds.includes('SPAM')) group.spamCount += 1;
  if (labelIds.includes('TRASH')) group.trashCount += 1;
}

async function listAllMessageIds(gmail) {
  const ids = [];
  let pageToken;
  do {
    const res = await withRetry(() =>
      gmail.users.messages.list({ userId: 'me', includeSpamTrash: true, maxResults: 500, pageToken })
    );
    const messages = res.data.messages || [];
    for (const m of messages) ids.push(m.id);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return ids;
}

async function fetchMessageMetadata(gmail, id) {
  const res = await withRetry(() =>
    gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: METADATA_HEADERS })
  );
  return res.data;
}

async function runAnalysis(gmail) {
  resetAnalysisState();
  try {
    const ids = await listAllMessageIds(gmail);
    analysisState.total = ids.length;
    analysisState.status = 'fetching';

    const limit = pLimit(10);
    await Promise.all(
      ids.map((id) =>
        limit(async () => {
          const message = await fetchMessageMetadata(gmail, id);
          ingestMessage(message);
          analysisState.processed += 1;
        })
      )
    );

    analysisState.status = 'done';
  } catch (err) {
    analysisState.status = 'error';
    analysisState.error = isAuthError(err)
      ? "Sessione Google scaduta o revocata: collega di nuovo l'account."
      : err.message || String(err);
    throw err;
  }
}

const SORTERS = {
  count: (a, b) => b.count - a.count,
  lastDate: (a, b) => b.lastDate - a.lastDate,
  firstDate: (a, b) => a.firstDate - b.firstDate,
  name: (a, b) => a.name.localeCompare(b.name),
  email: (a, b) => a.email.localeCompare(b.email),
};
const SORT_KEYS = Object.keys(SORTERS);

function getSenders(sort) {
  const groups = Array.from(senderGroups.values()).map((g) => ({
    email: g.email,
    name: g.name,
    count: g.count,
    firstDate: g.firstDate,
    lastDate: g.lastDate,
    inboxCount: g.inboxCount,
    spamCount: g.spamCount,
    trashCount: g.trashCount,
    unsubscribe: g.unsubscribe,
  }));

  return groups.sort(SORTERS[sort] || SORTERS.count);
}

function getSenderGroup(email) {
  return senderGroups.get(email);
}

module.exports = { analysisState, runAnalysis, getSenders, getSenderGroup, SORT_KEYS };
