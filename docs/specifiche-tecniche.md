# Gmail Cleaner — Specifiche tecniche

Documento complementare alle [specifiche funzionali](specifiche-funzionali.md): descrive come l'app è costruita, non cosa fa per l'utente.

## Stack

- Node.js (>=18) + Express
- `googleapis` come client per la Gmail API
- Frontend web locale senza framework, servito dallo stesso backend
- Configurazione in un file JSON locale (`config.json`)

## Struttura e responsabilità

| Percorso | Responsabilità |
| --- | --- |
| `src/server.js` | Entry point: Express, route HTTP, controllo dell'autenticazione. Nessuna logica di business. |
| `src/config.js` | Lettura di `config.json` e percorsi condivisi (`data/`, `public/`). |
| `src/security.js` | Guardia delle richieste: controllo di `Host` e `Origin` (anti CSRF e DNS rebinding). |
| `src/auth.js` | OAuth2: client, salvataggio e refresh del token, client Gmail autenticato. |
| `src/analysis.js` | Scansione della casella, raggruppamento per mittente, stato dell'analisi, ordinamento. |
| `src/actions.js` | Azioni sulla casella: spostamento nel Cestino, disiscrizione One-Click. |
| `src/parsers.js` | Funzioni pure sugli header (`From`, `List-Unsubscribe`). |
| `src/retry.js` | Retry con backoff esponenziale sugli errori di quota. |
| `public/index.html` | Struttura della pagina. |
| `public/style.css` | Stile. |
| `public/app.js` | Logica del frontend: polling, tabella, conferme, chiamate alle route interne. |
| `data/` | Dati locali generati a runtime (`token.json`), esclusi da git. |

Le dipendenze vanno in una sola direzione: `server` → `analysis` / `actions` / `auth` → `retry` / `parsers` / `config`.

## Autenticazione

- OAuth2 Google, un solo account collegato.
- Credenziali: Client ID + Client Secret, lette da `config.json`, mai esposte al frontend.
- Scope MVP: `gmail.modify`.
- Account unico: l'app gestisce una sola casella. Un nuovo login sovrascrive `data/token.json`.
- Dopo il login viene letto l'indirizzo con `users.getProfile` e salvato nel campo `email` di `data/token.json`; `GET /api/status` lo restituisce e il frontend lo mostra ("Collegato come ..."). Se il recupero fallisce il login resta valido, senza indirizzo.
- Il token viene salvato su disco (`data/token.json`) dopo il primo login. Il refresh token permette di ottenere nuovi access token senza rifare il login.
- Il client OAuth2 intercetta l'evento di refresh e riscrive il token su disco, preservando il refresh token esistente nei casi in cui il refresh non lo restituisca di nuovo.
- L'app su Google Cloud Console va portata in stato "In production": in stato "Testing" il refresh token scade dopo 7 giorni (vedi [setup-google-cloud.md](setup-google-cloud.md)).

## Fetch dei messaggi

- `users.messages.list` con `includeSpamTrash: true` e paginazione via `pageToken` fino all'esaurimento dei risultati (`maxResults: 500` per pagina).
- `messages.list` restituisce solo `id` e `threadId`: per gli header serve `users.messages.get` con `format=metadata` e `metadataHeaders`, una chiamata per messaggio.
- Header recuperati: `From`, `Date`, `Subject`, `List-Unsubscribe`, `List-Unsubscribe-Post`, `List-ID`, più `id`, `threadId`, `labelIds`, `internalDate`.
- Il body non viene richiesto in fase di analisi.
- Le chiamate di dettaglio vengono eseguite con concorrenza limitata (10 richieste parallele) per non saturare la quota.

## Raggruppamento

- Chiave: indirizzo email del mittente, estratto dall'header `From` (formato `"Nome" <email>` o indirizzo semplice) e normalizzato in minuscolo.
- Per ciascun gruppo vengono mantenuti: conteggio totale, prima e ultima data (da `internalDate`), conteggio messaggi con label `INBOX`/`SPAM`/`TRASH`, e la lista degli id messaggio (necessaria per eseguire le azioni di pulizia).
- Nome mittente e metodo di disiscrizione vengono aggiornati ogni volta che si incontra, nel gruppo, un messaggio più recente di quello visto finora.

## Disiscrizione

Priorità: One-Click HTTPS → HTTPS manuale → mailto → nessun metodo disponibile.

- **One-Click**: `List-Unsubscribe` con URL http/https + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` → il backend esegue un POST conforme a RFC 8058 (`Content-Type: application/x-www-form-urlencoded`, body `List-Unsubscribe=One-Click`).
- **HTTPS senza One-Click**: il link viene restituito al frontend per apertura manuale. Nessuna richiesta automatica.
- **mailto**: l'indirizzo viene restituito al frontend, apertura manuale.

## Eliminazione

- Azione implementata: spostamento nel Cestino via `users.messages.batchModify` con `addLabelIds: ['TRASH']`, a blocchi di massimo 1000 id per chiamata.
- Ogni blocco è trattato come unità di successo/fallimento: se un blocco fallisce, i suoi messaggi sono conteggiati come falliti e si procede con i blocchi successivi. Questo permette di riportare un esito parziale sui mittenti con più di 1000 messaggi.
- Eliminazione definitiva non ancora implementata: richiede `batchDelete` e lo scope `https://mail.google.com/`, più ampio di `gmail.modify`.

## Rate limiting

- Retry automatico con backoff esponenziale (base 500 ms, jitter, massimo 5 tentativi) su: 429, 403 con `reason` `rateLimitExceeded` o `userRateLimitExceeded`, 5xx.
- Il `reason` del 403 viene letto dal corpo dell'errore, non solo dallo status code, per distinguere gli errori di quota (temporanei, da ritentare) da altri 403 (permanenti).
- Le chiamate di fetch metadata sono limitate a 10 richieste concorrenti.

## Sicurezza

- Il server ascolta solo su `127.0.0.1`. Un middleware (`src/security.js`) rifiuta con 403 le richieste il cui `Host` non è `localhost`/`127.0.0.1` sulla porta configurata (DNS rebinding) e quelle con `Origin` esterno; le richieste che modificano qualcosa (non GET/HEAD) devono avere un `Origin` locale (CSRF).
- Il flusso OAuth usa un parametro `state` casuale, monouso e valido 10 minuti; il callback senza `state` valido viene rifiutato. Il redirect URI è quello fissato in `config.json`, mai ricavato dalla richiesta.
- App locale: token OAuth e Client Secret restano su disco (`config.json`, `data/token.json`) e non vengono mai esposti al frontend.
- Tutte le chiamate alle API Gmail partono dal backend; il frontend parla solo con le route interne dell'app.
- Nessun dato dell'account lascia la macchina.

## Gestione errori

- Lo stato dell'analisi (`idle` / `listing` / `fetching` / `done` / `error`) e i contatori `processed`/`total` sono esposti da un endpoint di stato e interrogati dal frontend con polling.
- Le route `/api/senders/:email/...` validano il formato dell'email (400 `invalid_email`), cercano il mittente nell'analisi corrente (404 `sender_not_found`) e permettono **una sola operazione per mittente alla volta** (409 `operation_in_progress`). Durante un'analisi le azioni sono bloccate (409 `analysis_in_progress`) e, viceversa, l'analisi non parte se c'è un'operazione in corso.
- Le azioni di pulizia restituiscono sempre `total`/`succeeded`/`failed`/`errors`: un'operazione parziale non viene mai riportata come completata.

## API interna

- `GET /api/status` — stato dell'autenticazione e indirizzo dell'account collegato.
- `GET /auth/google` — avvia il flusso OAuth.
- `GET /auth/google/callback` — riceve il `code`, scambia il token, lo salva.
- `POST /api/analyze` — avvia l'analisi in background (se già in corso, risponde 409).
- `GET /api/analyze/status` — stato e avanzamento dell'analisi.
- `GET /api/senders?sort=...` — elenco mittenti, ordinato.
- `POST /api/senders/:email/unsubscribe` — esegue la disiscrizione One-Click.
- `POST /api/senders/:email/trash` — sposta tutte le email del mittente nel Cestino.

## Non ancora implementato

Vedi [roadmap](roadmap.md).
