function parseFrom(raw) {
  if (!raw) return { name: '', email: '' };
  const match = raw.match(/^"?([^"<]*)"?\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  return { name: raw.trim(), email: raw.trim().toLowerCase() };
}

function parseListUnsubscribe(value) {
  if (!value) return { url: null, mailto: null };
  const parts = value.split(',').map((p) => p.trim().replace(/^<|>$/g, ''));
  let url = null;
  let mailto = null;
  for (const part of parts) {
    if (/^https?:\/\//i.test(part)) url = part;
    if (/^mailto:/i.test(part)) mailto = part;
  }
  return { url, mailto };
}

function resolveUnsubscribeMethod(listUnsubscribe, listUnsubscribePost) {
  const { url, mailto } = parseListUnsubscribe(listUnsubscribe);
  const isOneClick = Boolean(url && /^https:\/\//i.test(url) && listUnsubscribePost && /one-click/i.test(listUnsubscribePost));
  if (isOneClick) return { type: 'one-click', url, mailto: null };
  if (url) return { type: 'https', url, mailto: null };
  if (mailto) return { type: 'mailto', url: null, mailto };
  return { type: 'none', url: null, mailto: null };
}

function headerValue(headers, name) {
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

module.exports = { parseFrom, resolveUnsubscribeMethod, headerValue };
