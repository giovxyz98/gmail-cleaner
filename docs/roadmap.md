# Roadmap

Stato aggiornato al 15/10/2026. Cronologia delle modifiche in [CHANGELOG](../CHANGELOG.md).

## Stato attuale

- Prima versione completa e avviabile (vedi [README](../README.md)).
- Credenziali Google Cloud create e inserite in `config.json`.
- Server, frontend e redirect OAuth verificati all'avvio.
- Codice riorganizzato in `src/` (backend) e `public/` (frontend).
- Interventi di sicurezza e robustezza completati (versione 0.2.0), verificati con prove locali e con un client Gmail simulato. **Nessun login né analisi reale ancora eseguiti.**

## Da fare subito

- [ ] Primo login reale con il proprio account Gmail (utente di test).
- [ ] Prima analisi completa su una casella vera, per verificare tempi e quote.
- [ ] Portare il progetto Google Cloud da "Testing" a "In produzione" quando funziona (altrimenti il refresh token scade dopo 7 giorni).
- [x] Repository git creato e pubblicato su GitHub (pubblico: mai committare `config.json` né `data/`).

## Sicurezza e robustezza

Completata il 15/10/2026 (dettagli nel [CHANGELOG](../CHANGELOG.md) e nelle [specifiche tecniche](specifiche-tecniche.md)): server locale, pulizia, One-Click, OAuth ed errori, caselle grandi e parsing.

Rimandato o scartato, con motivo:

- **Permessi restrittivi sui file di credenziali e token:** su Windows e con un solo utente non porta un beneficio concreto. `config.json` e `data/` sono comunque esclusi da git.
- **Persistenza temporanea degli ID dei messaggi:** anche con centinaia di migliaia di messaggi gli ID occupano pochi MB. Ha senso insieme alla cache dell'analisi (vedi sotto).
- **Libreria esterna per il parsing degli indirizzi:** il parser interno copre i formati comuni; da rivalutare solo se la prima analisi reale mostra mittenti sbagliati.
- **Modalità "In production" e verifica OAuth:** sono cose distinte. Passare in produzione evita la scadenza a 7 giorni del refresh token, ma non rende l'app "verificata" da Google (per uso personale non serve).

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
