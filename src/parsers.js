const ADDRESS_PATTERN = /^[^\s@<>()",;:\\]+@[^\s@<>()",;:\\]+\.[^\s@<>()",;:\\]+$/;

function decodeEncodedWord(charset, encoding, text) {
  try {
    const bytes =
      encoding.toUpperCase() === 'B'
        ? Buffer.from(text, 'base64')
        : Buffer.from(
            text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (m, hex) => String.fromCharCode(parseInt(hex, 16))),
            'latin1'
          );
    return new TextDecoder(charset.replace(/\*.*$/, '')).decode(bytes);
  } catch (err) {
    return null;
  }
}

// Decodifica le parole codificate degli header (RFC 2047), per esempio =?UTF-8?B?...?= o =?UTF-8?Q?...?=.
function decodeEncodedWords(text) {
  return text
    .replace(/(=\?[^?\s]+\?[BbQq]\?[^?\s]*\?=)\s+(?==\?)/g, '$1')
    .replace(/=\?([^?\s]+)\?([BbQq])\?([^?\s]*)\?=/g, (match, charset, encoding, body) => {
      const decoded = decodeEncodedWord(charset, encoding, body);
      return decoded === null ? match : decoded;
    });
}

// Restituisce { name, email }. Con un header assente o senza un indirizzo valido l'email è vuota:
// il chiamante deve scartare il messaggio invece di raggrupparlo sotto una chiave sbagliata.
function parseFrom(raw) {
  if (!raw) return { name: '', email: '' };

  let name = '';
  let address = '';
  const angle = raw.match(/^\s*(.*?)\s*<\s*([^<>]*?)\s*>/);
  if (angle) {
    name = angle[1];
    address = angle[2];
  } else {
    const comment = raw.match(/\(([^)]*)\)/);
    name = comment ? comment[1] : '';
    address = raw.replace(/\([^)]*\)/g, ' ').split(',')[0].trim();
  }

  name = name.trim().replace(/^"(.*)"$/, '$1').replace(/\\(.)/g, '$1').trim();
  const email = address.trim().toLowerCase();
  return { name: decodeEncodedWords(name), email: ADDRESS_PATTERN.test(email) ? email : '' };
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
