# info-hub

Contenitore delle **pagine pubbliche statiche** dei progetti, delle app e dei siti di Giskard.

Ogni cartella di primo livello è una **vetrina indipendente**, con le proprie pagine HTML, e
viene pubblicata su GitHub Pages sotto il proprio nome.

**Sito pubblicato:** <https://giskardb.github.io/info-hub/>

---

## Vetrine

### `cronomostri/` — Frank & Alf e l'Orologio di Malacronio

Avventura punta-e-clicca 2D per bambini (repository del gioco: `cronomostri-gsf`).

| Pagina | URL pubblico |
| --- | --- |
| Vetrina del gioco | <https://giskardb.github.io/info-hub/cronomostri/> |
| **Norme sulla privacy** | **<https://giskardb.github.io/info-hub/cronomostri/privacy/>** |

> L'URL delle norme sulla privacy è quello da inserire nel campo **«URL delle norme sulla
> privacy»** della scheda dello Store su Google Play Console.
> La pagina è bilingue (italiano / inglese, con selettore in alto) e dichiara che il gioco
> funziona interamente offline, non raccoglie dati personali, non contiene pubblicità né
> acquisti in-app.

---

## Come funziona la pubblicazione

Il workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) si attiva a ogni push
su `main` (o manualmente da *Actions → Run workflow*), esegue
[`tools/build-site.js`](tools/build-site.js) e pubblica il risultato su GitHub Pages.

Lo script è **generico**: raccoglie ogni cartella di primo livello che contiene almeno un file
`.html` e la copia così com'è nel sito, mantenendo il nome della cartella nell'URL.

```
cronomostri/privacy/index.html  ->  /info-hub/cronomostri/privacy/
cronomostri/index.html          ->  /info-hub/cronomostri/
<nuova-cartella>/pagina.html    ->  /info-hub/<nuova-cartella>/pagina.html
```

Sono ignorate le cartelle di servizio (`.github`, `tools`, `_site`, `node_modules`) e quelle
prive di pagine HTML. La home del sito viene **generata automaticamente** elencando le vetrine
presenti: aggiungendone una nuova, compare da sola senza modificare nulla.

## Aggiungere una vetrina nuova

1. Crea una cartella con il nome che vuoi vedere nell'URL (es. `mia-app/`).
2. Mettici dentro le pagine statiche (`index.html` e quello che serve: CSS, immagini, altre
   sottocartelle).
3. *(facoltativo)* Aggiungi un `showcase.json` per personalizzare la card nella home:

   ```json
   {
     "name": "Nome del progetto",
     "description": "Una riga di descrizione.",
     "links": [
       { "label": "Sito", "href": "mia-app/" },
       { "label": "Privacy Policy", "href": "mia-app/privacy/" }
     ]
   }
   ```

   Senza `showcase.json` la card usa il nome della cartella ed elenca da sé tutte le pagine
   trovate. Il file serve solo alla generazione della home e non viene pubblicato.
4. Fai push su `main`: il workflow pubblica tutto.

## Anteprima in locale

```bash
node tools/build-site.js       # genera _site/
python3 -m http.server -d _site 8000
```

Poi apri <http://localhost:8000/>.

## Configurazione richiesta una tantum

In *Settings → Pages* del repository, impostare **Source: GitHub Actions**.
