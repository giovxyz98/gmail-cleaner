# Gmail Cleaner — Specifiche funzionali

## Cosa fa

Un'app che gira sul computer e serve a ripulire una casella Gmail piena di anni di email. Invece di lavorare messaggio per messaggio, ragiona per mittente: mostra chi ha scritto, quanto ha scritto, e permette di disiscriversi e cancellare tutto in un colpo solo.

## Collegamento dell'account

Al primo avvio si collega un account Gmail tramite il login Google. Dopo il primo accesso l'app resta collegata e non chiede più di rifare il login. Se l'accesso viene revocato dall'account Google (o scade), l'app lo riconosce e propone di collegare di nuovo l'account.

## Analisi della casella

L'app scorre tutta la casella, non solo la Posta in arrivo: include anche archivio, Promozioni, Social, altre categorie, Spam e Cestino.

L'analisi richiede tempo su caselle grandi. Durante l'operazione deve essere visibile un avanzamento.

Se alcune email non si riescono a leggere, l'analisi non si ferma: le salta, le conta e al termine dice chiaramente che l'elenco è **incompleto** (e quante email mancano). Le email senza un mittente valido vengono ignorate e il loro numero è indicato.

## Vista per mittente

Al termine l'app mostra un elenco di mittenti. Per ciascuno:

- nome e indirizzo email
- quante email ha mandato in totale
- quando è arrivata la prima e l'ultima
- quante di quelle email sono in Posta in arrivo, quante in Spam, quante nel Cestino
- se è possibile disiscriversi, e in che modo

L'elenco si può ordinare per numero di email, per data dell'ultima ricezione, per data della prima, per nome o per indirizzo.

## Disiscrizione

Dove la newsletter lo permette, l'app si disiscrive da sola con un clic.

Dove non è possibile farlo in automatico, l'app mostra il link o l'indirizzo a cui scrivere, e la disiscrizione si completa a mano.

Dove non esiste alcun metodo di disiscrizione, l'app lo dice chiaramente.

Prima di eseguire l'azione l'app indica sempre quale metodo userà.

## Pulizia

Due azioni distinte per ogni mittente:

- **Sposta nel Cestino** — tutte le email di quel mittente finiscono nel Cestino e restano recuperabili. *Disponibile.*
- **Elimina definitivamente** — le email vengono cancellate senza possibilità di recupero. *Non ancora disponibile: è in [roadmap](roadmap.md) e richiede un permesso Google più ampio.*

Le azioni chiedono conferma, una alla volta, sul singolo mittente, indicando quante email sono coinvolte. Su un mittente si può eseguire una sola azione alla volta, e nessuna azione parte mentre è in corso un'analisi. Non esiste una conferma unica che agisce su più mittenti insieme: è l'unico modo per non svuotare per sbaglio mezza casella.

## Esito delle operazioni

Se un'operazione riesce solo in parte, l'app dice quante email sono state elaborate, quante sono andate a buon fine e quante no. Un'operazione parziale non viene mai presentata come completata.

## Privacy

L'app gira in locale. Le email e le credenziali dell'account restano sul computer e non vengono inviate da nessuna parte.

## Prima versione

Collegamento account, analisi completa della casella, elenco mittenti con statistiche e ordinamento, disiscrizione automatica dove possibile e link manuale altrove, spostamento nel Cestino.

## Successivamente

Vedi [roadmap](roadmap.md).
