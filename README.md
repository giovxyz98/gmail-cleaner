# Gmail Cleaner

App locale per ripulire una casella Gmail ragionando per mittente: analizza tutta la casella (Inbox, categorie, archivio, Spam, Cestino), raggruppa i messaggi per mittente con statistiche, permette la disiscrizione automatica dove possibile e lo spostamento nel Cestino per mittente.

Gira interamente in locale: email e credenziali restano sul computer, il backend è l'unico a parlare con le API di Google.

## Avvio rapido

Prerequisiti: Node.js >= 18 e le credenziali OAuth di Google Cloud (vedi [docs/setup-google-cloud.md](docs/setup-google-cloud.md)).

```bash
npm install
cp config.example.json config.json   # poi inserisci googleClientId e googleClientSecret
npm start
```

Apri `http://localhost:3000`, collega l'account Google e avvia l'analisi.

Il token OAuth viene salvato in `data/token.json` e riusato ai riavvii successivi.

## Struttura del progetto

```
src/      backend Node.js (un modulo per responsabilità)
public/   frontend: index.html, style.css, app.js
docs/     documentazione
data/     token OAuth (generato al primo login, escluso da git)
config.json           credenziali locali (escluso da git)
config.example.json   modello di configurazione
```

## Documentazione

| Documento | Contenuto |
| --- | --- |
| [docs/setup-google-cloud.md](docs/setup-google-cloud.md) | Creare progetto, Gmail API e credenziali OAuth |
| [docs/specifiche-funzionali.md](docs/specifiche-funzionali.md) | Cosa fa l'app, dal punto di vista dell'utente |
| [docs/specifiche-tecniche.md](docs/specifiche-tecniche.md) | Come è costruita: architettura, moduli, API interna |
| [docs/roadmap.md](docs/roadmap.md) | Stato del lavoro e cose da fare |

## Cosa fa la versione attuale

- Collegamento account Gmail via OAuth2.
- Analisi completa della casella, con avanzamento visibile.
- Elenco mittenti con totale, prima e ultima ricezione, conteggi Inbox/Spam/Cestino e metodo di disiscrizione.
- Ordinamento per numero email, ultima ricezione, prima ricezione, nome, indirizzo.
- Disiscrizione One-Click (RFC 8058) dove supportata; link o indirizzo per la disiscrizione manuale altrimenti.
- Spostamento nel Cestino per mittente, con conferma singola e report degli eventuali fallimenti parziali.
- Retry automatico con backoff sugli errori di quota.
