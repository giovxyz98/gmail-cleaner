# Roadmap

Stato aggiornato al 15/10/2026.

## Stato attuale

- Prima versione completa e avviabile (vedi [README](../README.md)).
- Credenziali Google Cloud create e inserite in `config.json`.
- Server, frontend e redirect OAuth verificati all'avvio.
- Codice riorganizzato in `src/` (backend) e `public/` (frontend).

## Da fare subito

- [ ] Primo login reale con il proprio account Gmail (utente di test).
- [ ] Prima analisi completa su una casella vera, per verificare tempi e quote.
- [ ] Portare il progetto Google Cloud da "Testing" a "In produzione" quando funziona (altrimenti il refresh token scade dopo 7 giorni).
- [ ] Inizializzare un repository git (la cartella non lo è ancora).

## Sicurezza e robustezza

Da fare **prima di usare l'app su una casella reale**, in quest'ordine (dettagli e motivazioni in [sicurezza-e-robustezza.md](sicurezza-e-robustezza.md)):

- [x] Server locale: ascolto su `127.0.0.1`, controllo Host/Origin, parametro `state` nell'OAuth.
- [x] Pulizia: niente richieste duplicate o concorrenti, numero di messaggi nel modale, validazione dell'email.
- [x] One-Click: solo HTTPS, blocco IP privati, niente redirect, timeout e limite di risposta.
- [x] OAuth ed errori: gestione revoca/`invalid_grant`, middleware errori, `sort` validato.
- [x] Caselle grandi e parsing: messaggi che falliscono saltati e contati, concorrenza configurabile, `From` non valido gestito.

## Funzionalità future

Dalle specifiche, in ordine indicativo di priorità.

| Funzionalità | Note tecniche |
| --- | --- |
| Eliminazione definitiva | `batchDelete`; richiede lo scope `https://mail.google.com/`; conferma singola per mittente |
| Cache dell'analisi + pulsante "Aggiorna" | salvataggio su disco; aggiornamenti incrementali via `historyId` |
| Riepilogo dello spazio liberato | richiede `sizeEstimate` dei messaggi |
| Ricerca e selezione multipla | la conferma resta per singolo mittente |
| Filtri per data e numero minimo di email | lato frontend o su `/api/senders` |
| Whitelist / blacklist mittenti | persistenza in `data/` |
| Anteprima email di un mittente | `format=metadata` sui messaggi del gruppo |
| Disiscrizione via mailto | richiede lo scope `gmail.send` |
| Raggruppamento per `List-ID` / dominio | fallback quando il mittente cambia indirizzo |

## Idee valutate e scartate

- **Più account Gmail**: scelto un account solo (15/10/2026). L'email è già salvata con il token, quindi aggiungerli in futuro significa un token per indirizzo, l'analisi per account e un selettore nell'interfaccia.
- **Gemini / LLM per classificare i mittenti**: non necessario per ora. Nessuna chiave API nel progetto.
