const { withRetry } = require('./retry');
const { safePost } = require('./netguard');
const { isAuthError } = require('./auth');

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
      if (isAuthError(err)) throw err;
      result.failed += ids.length;
      result.errors.push(err.message || String(err));
    }
  }

  return result;
}

async function unsubscribeOneClick(url) {
  const { status } = await safePost(url, 'List-Unsubscribe=One-Click', {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  return { success: status >= 200 && status < 300, status };
}

module.exports = { trashMessages, unsubscribeOneClick };
