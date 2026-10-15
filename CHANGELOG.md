# Changelog

Tutte le modifiche rilevanti al progetto. Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/); le versioni seguono il `package.json`.

## [0.2.0] - 2026-10-15

Sicurezza e robustezza, da completare prima del primo uso su una casella reale.

### Sicurezza
- Il server ascolta solo su `127.0.0.1` (prima su tutte le interfacce).
- Controllo di `Host` e `Origin` su ogni richiesta: protezione da CSRF e DNS rebinding. Le richieste che modificano qualcosa devono arrivare da una pagina servita dall'app.
- Flusso OAuth con parametro `state` casuale, monouso, valido 10 minuti. Il callback non mostra più i messaggi di errore di Google.
- Disiscrizione One-Click: solo HTTPS, nessuna credenziale nell'URL, blocco di indirizzi locali, privati e riservati (controllato sull'indirizzo a cui ci si connette davvero), nessun redirect, timeout di 10 s, risposta letta al massimo per 64 KB.
- Un URL `http` con `List-Unsubscribe-Post` non è più considerato One-Click: diventa un link manuale.
- Frontend: `data-email` e `href` ora sono sottoposti a escape (prima potevano rompere l'HTML con un `List-Unsubscribe` o un mittente costruito ad arte).

### Pulizia
- Una sola operazione alla volta per mittente (409 `operation_in_progress`); azioni e analisi non possono sovrapporsi.
- Validazione dell'indirizzo email nelle route dei mittenti (400 `invalid_email`).
- Corretto il doppio `decodeURIComponent` dell'email nelle route.
- Il frontend mostra un messaggio chiaro per gli errori delle azioni.

### OAuth ed errori
- Token revocato o scaduto (`invalid_grant`, 401): il token locale viene cancellato e l'app propone un nuovo login.
- Middleware Express unico per gli errori: nessuno stack trace né dettaglio interno nelle risposte.
- `GET /api/senders?sort=` rifiuta i valori non previsti (400 `invalid_sort`).

### Analisi e parsing
- Un messaggio che non si riesce a leggere viene saltato e contato; l'analisi non si ferma più al primo errore. Se ne mancano, lo stato è `partial` e il frontend dice che l'elenco è incompleto.
- Interruzione dell'analisi solo per sessione non valida o per fallimenti generalizzati.
- Concorrenza delle letture configurabile con `concurrency` in `config.json` (1-50, predefinito 10).
- Parser dell'header `From` riscritto: nomi codificati (RFC 2047), nomi tra virgolette, commenti, più indirizzi. Un `From` assente o non valido non viene più raggruppato sotto una chiave sbagliata ma contato come ignorato.

### Documentazione
- Aggiunto questo changelog; roadmap, specifiche tecniche e funzionali aggiornate.
- Rimossi `docs/note.txt` e `docs/sicurezza-e-robustezza.md`: le note originali e la valutazione sono state recepite e implementate (il contenuto utile è nella roadmap e nelle specifiche tecniche; restano nella cronologia git).

## [0.1.0] - 2026-10-15

Prima versione.

- Collegamento account Gmail via OAuth2 (scope `gmail.modify`), con indirizzo dell'account mostrato nell'interfaccia.
- Analisi completa della casella (Spam e Cestino inclusi) con avanzamento, raggruppamento per mittente e ordinamento.
- Disiscrizione One-Click (RFC 8058) e link/indirizzo per quella manuale.
- Spostamento nel Cestino per mittente, a blocchi da 1000, con conferma ed esito parziale.
- Retry con backoff sugli errori di quota.
- `avvia.bat` per l'avvio con un doppio clic; corretto il modale di conferma sempre visibile.
- Documentazione iniziale: setup Google Cloud, specifiche funzionali e tecniche, roadmap, valutazione su sicurezza e robustezza.
