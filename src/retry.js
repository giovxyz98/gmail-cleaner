function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  const status = err?.response?.status ?? err?.status ?? err?.code;
  const reason = err?.response?.data?.error?.errors?.[0]?.reason ?? err?.errors?.[0]?.reason;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;
  if (status === 403 && (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded')) return true;
  return false;
}

async function withRetry(fn, { maxRetries = 5, baseDelayMs = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || attempt >= maxRetries) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
      await sleep(delay);
      attempt += 1;
    }
  }
}

module.exports = { withRetry };
