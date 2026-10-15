# Sicurezza e robustezza

Valutazione del 15/10/2026 delle note in [note.txt](note.txt) rispetto al codice di allora. La tabella e l'elenco sotto descrivono la situazione **prima** degli interventi; lo stato di avanzamento è nella [roadmap](roadmap.md). Il documento dice cosa fare, cosa rimandare e perché. Il contesto è un'app locale per una sola persona, quindi si applica solo ciò che ha un beneficio concreto.

## Stato attuale rispetto alle note

| Area | Già presente | Mancante |
| --- | --- | --- |
| 1. Server locale | `config.json` e `data/` esclusi da git | Ascolto su tutte le interfacce; nessuna protezione CSRF né controllo di Host/Origin; OAuth senza parametro `state` |
| 2. Disiscrizione One-Click | Un mittente per chiamata: un errore non ferma gli altri | Accetta anche `http`; nessun blocco di IP locali/privati; segue i redirect; nessun timeout né limite di risposta |
| 3. Caselle grandi | Concorrenza a 10; analisi fallita in stato `error`, mai `done` | Concorrenza non configurabile; un solo messaggio che fallisce interrompe tutta l'analisi |
| 4. Parsing mittente | Email normalizzata in minuscolo | Regex semplice, nomi codificati non decodificati; `From` assente o non valido scartato in silenzio |
| 5. Pulizia | Il mittente deve esistere nell'analisi; blocchi da 1000 con esito per blocco | Nessuna protezione da richieste duplicate o concorrenti; il modale non indica il numero di messaggi; email della route non validata |
| 6. OAuth | Refresh token preservato; nessun segreto nei log | Revoca e `invalid_grant` non portano a un nuovo login |
| 7. Errori | Lo stato dell'analisi si aggiorna anche sulle eccezioni; `sort` ha un valore di ripiego | Nessun middleware di errori; `sort` non valido non viene rifiutato |

## Da implementare

Ordine consigliato, un commit per area, con le specifiche tecniche aggiornate di volta in volta.

1. **Server locale (area 1).** Ascolto solo su `127.0.0.1`. Controllo di `Host` e `Origin` sulle route `/api` (contro CSRF e DNS rebinding). Parametro `state` nel flusso OAuth. È il rischio più concreto: oggi una pagina web aperta nel browser potrebbe chiamare le route di pulizia su `localhost`.
2. **Pulizia (area 5).** Blocco delle richieste duplicate o concorrenti sulla stessa operazione, numero di messaggi nel testo del modale di conferma, validazione del formato dell'email nella route.
3. **One-Click (area 2).** Solo HTTPS; blocco di indirizzi locali, privati e riservati; redirect disabilitati; timeout; limite alla dimensione della risposta. Senza questi controlli un `List-Unsubscribe` malevolo può far fare richieste verso la rete interna.
4. **OAuth ed errori (aree 6 e 7).** Gestione di `invalid_grant` e revoca con richiesta di nuovo login; middleware Express unico per gli errori, senza stack trace al frontend; `sort` non valido rifiutato.
5. **Caselle grandi e parsing (aree 3 e 4, parte).**
   - Un messaggio che fallisce viene saltato e contato, e l'esito lo riporta senza dichiarare l'analisi completa.
   - Concorrenza configurabile in `config.json` (predefinito 10).
   - Specificare quali messaggi sono inclusi (`includeSpamTrash: true`: anche Spam e Cestino).
   - `From` assente o non valido in un gruppo esplicito; decodifica dei nomi codificati.

## Rimandato o scartato

- **Permessi restrittivi sui file (area 1):** su Windows e con un solo utente non porta un beneficio concreto.
- **Persistenza temporanea degli ID (area 3):** anche con centinaia di migliaia di messaggi gli ID occupano pochi MB. Ha senso insieme alla cache dell'analisi, già in [roadmap](roadmap.md).
- **Libreria per il parsing degli indirizzi (area 4):** si valuta solo se l'analisi reale mostra mittenti sbagliati.
