#!/usr/bin/env node
/**
 * info-hub — generatore del sito statico.
 *
 * Regola: ogni cartella di primo livello del repository e' una "vetrina"
 * indipendente e viene pubblicata cosi' com'e' sotto il proprio nome:
 *
 *     <cartella>/qualcosa.html  ->  https://<host>/<repo>/<cartella>/qualcosa.html
 *     <cartella>/x/index.html   ->  https://<host>/<repo>/<cartella>/x/
 *
 * Non serve toccare questo script quando si aggiunge una vetrina nuova:
 * basta creare la cartella con dentro almeno un file .html.
 *
 * Metadati opzionali: un file `showcase.json` nella cartella della vetrina
 *     { "name": "...", "description": "...", "links": [ { "label": "...", "href": "..." } ] }
 * viene usato per la card nella home dell'hub. Se manca, si usa il nome
 * della cartella e il primo <title> HTML trovato.
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "_site");

// Cartelle che non sono vetrine.
const SKIP = new Set([".git", ".github", "_site", "node_modules", "tools", ".vscode", ".idea"]);

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

/** Elenca ricorsivamente i file .html di una cartella (path relativi). */
function htmlFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(p, base));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      out.push(path.relative(base, p).split(path.sep).join("/"));
    }
  }
  return out;
}

function readTitle(file) {
  try {
    const m = fs.readFileSync(file, "utf8").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? m[1].replace(/\s+/g, " ").trim() : "";
  } catch {
    return "";
  }
}

/** URL pubblico di una pagina: index.html diventa una directory URL. */
function publicHref(showcase, relFile) {
  const clean = relFile.replace(/(^|\/)index\.html$/i, "$1");
  return `${showcase}/${clean}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------------------------------------------------------------- raccolta

const showcases = [];

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith(".")) continue;

  const dir = path.join(ROOT, entry.name);
  const pages = htmlFiles(dir);
  if (pages.length === 0) {
    console.log(`- ${entry.name}: nessuna pagina .html, saltata`);
    continue;
  }

  let meta = {};
  const metaFile = path.join(dir, "showcase.json");
  if (fs.existsSync(metaFile)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    } catch (err) {
      console.error(`! ${entry.name}/showcase.json non valido: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // I link mostrati nella home: quelli dichiarati, altrimenti tutte le pagine.
  const links =
    Array.isArray(meta.links) && meta.links.length > 0
      ? meta.links.map((l) => ({ label: l.label, href: l.href }))
      : pages.sort().map((p) => ({
          label: readTitle(path.join(dir, p)) || p,
          href: publicHref(entry.name, p),
        }));

  showcases.push({
    slug: entry.name,
    name: meta.name || entry.name,
    description: meta.description || "",
    hasIndex: pages.some((p) => p.toLowerCase() === "index.html"),
    links,
    pages,
  });

  console.log(`+ ${entry.name}: ${pages.length} pagina/e`);
}

showcases.sort((a, b) => a.name.localeCompare(b.name, "it"));

// ---------------------------------------------------------------- output

rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });
for (const s of showcases) {
  copyDir(path.join(ROOT, s.slug), path.join(OUT, s.slug));
  // showcase.json serve solo alla generazione della home, non va pubblicato.
  fs.rmSync(path.join(OUT, s.slug, "showcase.json"), { force: true });
}

// Disattiva Jekyll: i file vengono serviti cosi' come sono.
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// Home dell'hub: generata, cosi' una vetrina nuova compare da sola.
const cards = showcases
  .map((s) => {
    const links = s.links
      .map((l) => `        <li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`)
      .join("\n");
    const title = s.hasIndex
      ? `<a href="${escapeHtml(s.slug)}/">${escapeHtml(s.name)}</a>`
      : escapeHtml(s.name);
    return `      <article class="card">
      <h2>${title}</h2>
${s.description ? `      <p>${escapeHtml(s.description)}</p>\n` : ""}      <ul>
${links}
      </ul>
      </article>`;
  })
  .join("\n");

const home = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Giskard — info hub</title>
<meta name="description" content="Pagine pubbliche dei progetti, delle app e dei siti di Giskard.">
<style>
  :root { color-scheme: light dark; --bg:#fdfaf4; --fg:#241d16; --muted:#6b5f52; --card:#fff; --line:#e5dccd; --accent:#b8860b; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#171310; --fg:#f2e9dc; --muted:#a2937f; --card:#211b16; --line:#372d24; --accent:#e0b44a; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:3rem 1.25rem 4rem; background:var(--bg); color:var(--fg);
         font:16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 52rem; margin: 0 auto; }
  header { margin-bottom: 2.5rem; }
  h1 { font-size: clamp(1.9rem, 5vw, 2.6rem); margin: 0 0 .4rem; letter-spacing: -.02em; }
  header p { color: var(--muted); margin: 0; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px;
          padding:1.4rem 1.5rem; margin-bottom:1.1rem; }
  .card h2 { margin:0 0 .35rem; font-size:1.25rem; }
  .card h2 a { color: var(--fg); }
  .card p { margin:0 0 .8rem; color:var(--muted); }
  .card ul { margin:0; padding-left:1.1rem; }
  .card li { margin:.2rem 0; }
  a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  footer { margin-top:2.5rem; color:var(--muted); font-size:.9rem; }
</style>
</head>
<body>
<main>
  <header>
    <h1>info hub</h1>
    <p>Pagine pubbliche dei progetti, delle app e dei siti di Giskard.</p>
  </header>
${cards || "      <p>Nessuna vetrina pubblicata.</p>"}
  <footer>
    <p>Generato automaticamente da <code>tools/build-site.js</code> · una cartella = una vetrina.</p>
  </footer>
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(OUT, "index.html"), home);

console.log(`\n_site pronto: ${showcases.length} vetrina/e.`);
