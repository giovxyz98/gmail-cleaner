# Setup Google Cloud

Guida per ottenere le credenziali OAuth che servono all'app. Tutto è gratuito per uso personale: la Gmail API non ha costi, ha solo quote giornaliere ampiamente sufficienti per una casella personale.

> Non serve nessuna chiave API (né di Gemini né di altro tipo). L'app usa solo le credenziali OAuth descritte qui sotto.

## 1. Progetto

1. Apri [Google Cloud Console](https://console.cloud.google.com/) e crea un progetto (o usane uno esistente).
2. Se richiesto, collega una carta: è solo una verifica anti-frode, non viene addebitato nulla finché non passi a un piano a pagamento.

Un progetto è un contenitore: può avere più API abilitate, più credenziali e una sola schermata di consenso OAuth.

## 2. Gmail API

**API e servizi > Libreria** → cerca **Gmail API** → **Abilita**.

## 3. Schermata di consenso OAuth

1. Tipo utente: **Esterno**.
2. Nome app: `Gmail Cleaner`.
3. Aggiungi il tuo indirizzo Gmail tra gli **utenti di test**.
4. Ambiti (accesso ai dati): `https://www.googleapis.com/auth/gmail.modify`. È l'unico necessario per la versione attuale.

## 4. Credenziali

**API e servizi > Credenziali > Crea credenziali > ID client OAuth**:

- Tipo di dati: **dati utente** (l'app accede alla tua casella).
- Tipo di applicazione: **Applicazione web**.
- Nome: `Gmail Cleaner` (è solo un'etichetta).
- Origini JavaScript autorizzate: **lascia vuoto** (il login passa dal server, non dal browser).
- URI di reindirizzamento autorizzati: `http://localhost:3000/auth/google/callback`

L'URI deve essere identico a quello in `config.json`: stesso `http`, nessuno slash finale. Una differenza dà l'errore `redirect_uri_mismatch`.

Copia **Client ID** e **Client Secret**.

## 5. Configurazione locale

```bash
cp config.example.json config.json
```

In `config.json` inserisci `googleClientId` e `googleClientSecret`. Il file è escluso da git. Se scarichi il JSON delle credenziali da Google, tienilo fuori dalla cartella del progetto una volta copiati i valori.

## 6. Primo login

Con `npm start` e `http://localhost:3000`, il login mostra l'avviso "app non verificata": è normale per un'app personale. Scegli **Avanzate > Vai a Gmail Cleaner**.

## Token a scadenza

Finché il progetto è in stato **Testing**, il refresh token scade dopo 7 giorni e va rifatto il login. Quando l'app è stabile, in **Schermata consenso OAuth** portala in **In produzione**: per uso personale non serve la verifica di Google.

## Aggiungere scope in futuro

1. Aggiungi lo scope nella schermata di consenso (Accesso ai dati).
2. Aggiungilo all'array `SCOPES` in `src/auth.js`.
3. Cancella `data/token.json` e rifai il login: il token vecchio non copre i nuovi permessi.

Scope previsti dalla [roadmap](roadmap.md):

| Funzione | Scope |
| --- | --- |
| Eliminazione definitiva | `https://mail.google.com/` (include `gmail.modify`, lo sostituisce) |
| Disiscrizione via mailto | `https://www.googleapis.com/auth/gmail.send` |

## Costi: tenersi al sicuro

In **Fatturazione > Budget e avvisi** puoi impostare un avviso di spesa. La Gmail API non consuma credito, quindi è solo una precauzione.
