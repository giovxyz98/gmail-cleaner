const dns = require('dns');
const https = require('https');
const net = require('net');

const REQUEST_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 64 * 1024;

const blocked = new net.BlockList();
[
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
].forEach(([address, prefix]) => blocked.addSubnet(address, prefix, 'ipv4'));
[
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
].forEach(([address, prefix]) => blocked.addSubnet(address, prefix, 'ipv6'));

// Indirizzo IPv4 incapsulato in IPv6 (::ffff:a.b.c.d): va valutato come IPv4.
function unmapIPv4(address) {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  return match ? match[1] : address;
}

function isBlockedAddress(address) {
  const ip = unmapIPv4(address);
  const family = net.isIP(ip);
  if (!family) return true;
  return blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

// Valida l'URL e restituisce l'oggetto URL, oppure lancia un errore con messaggio leggibile.
function assertSafeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch (err) {
    throw new Error('URL di disiscrizione non valido.');
  }
  if (url.protocol !== 'https:') throw new Error('Sono ammessi solo URL HTTPS.');
  if (url.username || url.password) throw new Error('URL con credenziali non ammesso.');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedAddress(host)) throw new Error('Indirizzo di destinazione non ammesso.');
  return url;
}

// lookup per https.request: risolve il nome e rifiuta gli indirizzi locali, privati o riservati
// nel momento stesso della connessione (nessuna finestra tra controllo e uso).
function guardedLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: net.isIP(addresses) }];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return callback(new Error('Indirizzo di destinazione non ammesso.'));
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

// POST HTTPS senza redirect, con timeout complessivo e limite alla dimensione della risposta.
function safePost(rawUrl, body, headers = {}) {
  const url = assertSafeUrl(rawUrl);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const req = https.request(
      url,
      {
        method: 'POST',
        lookup: guardedLookup,
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let received = 0;
        res.on('data', (chunk) => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) res.destroy();
        });
        res.on('end', () => finish(resolve, { status: res.statusCode }));
        res.on('close', () => finish(resolve, { status: res.statusCode }));
        res.on('error', () => finish(resolve, { status: res.statusCode }));
      }
    );

    const timer = setTimeout(() => {
      req.destroy();
      finish(reject, new Error('Timeout della richiesta di disiscrizione.'));
    }, REQUEST_TIMEOUT_MS);

    req.on('error', (err) => finish(reject, new Error(`Richiesta di disiscrizione non riuscita: ${err.message}`)));
    req.end(body);
  });
}

module.exports = { safePost, assertSafeUrl, isBlockedAddress };
