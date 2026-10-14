const { withRetry } = require('./retry');

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

async function trashMessages(gmail, messageIds) {
  const chunks = chunk(messageIds, 1000);
  const result = { total: messageIds.length, succeeded: 0, failed: 0, errors: [] };

  for (const ids of chunks) {
    try {
      await withRetry(() =>
        gmail.users.messages.batchModify({ userId: 'me', requestBody: { ids, addLabelIds: ['TRASH'] } })
      );
      result.succeeded += ids.length;
    } catch (err) {
      result.failed += ids.length;
      result.errors.push(err.message || String(err));
    }
  }

  return result;
}

async function unsubscribeOneClick(url) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'List-Unsubscribe=One-Click',
  });
  return { success: response.ok, status: response.status };
}

module.exports = { trashMessages, unsubscribeOneClick };
