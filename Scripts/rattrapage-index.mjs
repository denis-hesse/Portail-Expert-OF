#!/usr/bin/env node
/**
 * rattrapage-index.mjs — renseigne `Index de recherche` sur les fiches qui en sont dépourvues.
 * Conditions : décision du 21/09/2026, page « Alternative Supabase → Notion » §0.10.
 *
 *   Essai à blanc (défaut)   node Scripts\rattrapage-index.mjs [--dry-run] [--limite=5]
 *     → CSV proposé, aucune écriture Notion.
 *   Écriture                 node Scripts\rattrapage-index.mjs --write --fichier=chemin.csv
 *     → n'écrit que les lignes du CSV validé par l'administrateur.
 *   Recensement              node Scripts\rattrapage-index.mjs --recenser
 *     → mesure le corps de page de toutes les fiches, aucun appel modèle, aucune écriture.
 *
 * Règle 12.19 lue à chaque exécution sur la page socle, jamais codée en dur.
 * Source de l'index : corps de page uniquement. Seule propriété écrite : `Index de recherche`.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ─────────────────────────── Identifiants (socle §1) ───────────────────────────
const NOTION_VERSION = '2025-09-03';
const PAGE_SOCLE = '380af029-a679-81ac-978b-cfbe4c90c52b';
const DATA_SOURCE_ID = '8d4f6570-748c-4c79-946d-08e12c7bc9ac';
const DATABASE_ID = '6695602c-2ca2-4709-9538-08ecca29a3d8'; // repli API 2022-06-28
const PROPRIETE_INDEX = 'Index de recherche';

// ─────────────────────────── Paramètres d'exécution ───────────────────────────
const MODELE = 'claude-sonnet-5';
const EFFORT = 'low';
const MAX_TOKENS = 1500;
const DELAI_NOTION_MS = 350; // limite Notion ≈ 3 req/s
const PROFONDEUR_MAX = 5;
const CORPS_MAX_CARACTERES = 40_000;
const SEUIL_CORPS_COURT = 500;
const PLAFOND_TOKENS = 3_000_000;
const TARIF_ENTREE = 2 / 1e6;
const TARIF_SORTIE = 10 / 1e6;
const RICH_TEXT_MAX = 1900;

// ─────────────────────────── Arguments ───────────────────────────
const args = process.argv.slice(2);
const opt = (nom, defaut = null) => {
  const p = args.find((a) => a.startsWith(`--${nom}=`));
  return p ? p.slice(nom.length + 3) : defaut;
};
const flag = (nom) => args.includes(`--${nom}`);

const LIMITE = opt('limite') ? Number(opt('limite')) : null;
const MODE_ECRITURE = flag('write');
const MODE_RECENSEMENT = flag('recenser');
const JOUR = new Date().toISOString().slice(0, 10);

// ─────────────────────────── Journal ───────────────────────────
const CHEMIN_JOURNAL = resolve(RACINE, `rattrapage-index-${JOUR}.log`);
function journal(ligne) {
  console.log(ligne);
  appendFileSync(CHEMIN_JOURNAL, `${new Date().toISOString()}  ${ligne}\n`, 'utf8');
}

// ─────────────────────────── Environnement ───────────────────────────
// .env.local fait foi : il écrase toute variable d'environnement système de même nom.
function chargerEnv() {
  const chemin = resolve(RACINE, '.env.local');
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const valeur = m[2].trim().replace(/^["']|["']$/g, '');
    process.env[m[1]] = valeur;
  }
}

// ─────────────────────────── Appels Notion ───────────────────────────
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let dernierAppel = 0;

async function appelNotion(url, options = {}, essai = 0) {
  const attente = DELAI_NOTION_MS - (Date.now() - dernierAppel);
  if (attente > 0) await pause(attente);
  dernierAppel = Date.now();

  const reponse = await fetch(url, {
    method: options.method ?? 'GET',
    body: options.body,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': options.version ?? NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  });

  if (reponse.status === 429 || reponse.status >= 500) {
    if (essai >= 5) throw new Error(`Notion ${reponse.status} après 5 tentatives — ${url}`);
    const delai = Number(reponse.headers.get('retry-after')) || 2 ** essai;
    await pause(delai * 1000);
    return appelNotion(url, options, essai + 1);
  }
  if (!reponse.ok) {
    const erreur = new Error(`Notion ${reponse.status} — ${(await reponse.text()).slice(0, 300)}`);
    erreur.statut = reponse.status;
    throw erreur;
  }
  return reponse.json();
}

const plat = (richText) => (richText || []).map((x) => x.plain_text ?? '').join('').trim();

function extraireTitre(page) {
  const entree = Object.values(page.properties || {}).find((p) => p.type === 'title');
  return entree ? plat(entree.title) : '';
}

function extraireIdFiche(page) {
  const entree = Object.values(page.properties || {}).find((p) => p.type === 'unique_id');
  if (!entree?.unique_id) return '';
  const { prefix, number } = entree.unique_id;
  return prefix ? `${prefix}-${number}` : String(number);
}

const longueurTexte = (page, nom) => plat(page.properties?.[nom]?.rich_text).length;

async function listerFiches({ filtre = null, limite = null } = {}) {
  const fiches = [];
  let curseur = null;
  let repli = false;

  while (true) {
    const corps = JSON.stringify({
      ...(filtre ? { filter: filtre } : {}),
      page_size: 100,
      ...(curseur ? { start_cursor: curseur } : {}),
    });
    let data;
    try {
      data = repli
        ? await appelNotion(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, { method: 'POST', body: corps, version: '2022-06-28' })
        : await appelNotion(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, { method: 'POST', body: corps });
    } catch (erreur) {
      if (!repli && (erreur.statut === 404 || erreur.statut === 400)) {
        journal('endpoint data_sources indisponible — repli sur databases (API 2022-06-28)');
        repli = true;
        continue;
      }
      throw erreur;
    }
    for (const page of data.results) {
      fiches.push({
        id: page.id,
        idFiche: extraireIdFiche(page),
        titre: extraireTitre(page),
        validite: page.properties?.['Validité fiche']?.select?.name ?? '',
        longueurContenu: longueurTexte(page, 'Contenu'),
      });
    }
    if (!data.has_more || (limite && fiches.length >= limite)) break;
    curseur = data.next_cursor;
  }
  return limite ? fiches.slice(0, limite) : fiches;
}

// ─────────────────────────── Lecture du corps ───────────────────────────
function texteDuBloc(bloc) {
  const noyau = bloc[bloc.type];
  if (!noyau) return '';
  if (bloc.type === 'table_row') return (noyau.cells || []).map((c) => plat(c)).filter(Boolean).join(' | ');
  const texte = plat(noyau.rich_text || noyau.caption || []);
  if (!texte) return '';
  if (bloc.type.startsWith('heading_')) return `\n${'#'.repeat(Number(bloc.type.slice(-1)))} ${texte}`;
  if (['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(bloc.type)) return `- ${texte}`;
  return texte;
}

async function listerBlocs(blocId) {
  const blocs = [];
  let curseur = null;
  do {
    const data = await appelNotion(
      `https://api.notion.com/v1/blocks/${blocId}/children?page_size=100${curseur ? `&start_cursor=${curseur}` : ''}`,
    );
    blocs.push(...data.results);
    curseur = data.has_more ? data.next_cursor : null;
  } while (curseur);
  return blocs;
}

async function lireCorps(blocId, profondeur = 0) {
  if (profondeur > PROFONDEUR_MAX) return '';
  const morceaux = [];
  for (const bloc of await listerBlocs(blocId)) {
    const texte = texteDuBloc(bloc);
    if (texte) morceaux.push('  '.repeat(profondeur) + texte);
    if (bloc.has_children && !['child_page', 'child_database'].includes(bloc.type)) {
      const enfant = await lireCorps(bloc.id, profondeur + 1);
      if (enfant) morceaux.push(enfant);
    }
  }
  return morceaux.join('\n');
}

// ─────────────────────────── Règle 12.19, lue sur le socle ───────────────────────────
async function lireRegleIndex() {
  const blocs = await listerBlocs(PAGE_SOCLE);
  const candidats = blocs
    .filter((b) => b.type === 'numbered_list_item')
    .map((b) => plat(b.numbered_list_item.rich_text))
    .filter((t) => t.startsWith(`Rédaction de l'${PROPRIETE_INDEX}`));

  if (candidats.length !== 1) {
    throw new Error(`règle 12.19 introuvable ou ambiguë sur le socle (${candidats.length} bloc(s)) — arrêt, aucune règle par défaut`);
  }
  const regle = candidats[0];
  const bornes = regle.match(/(\d+)\s*à\s*(\d+)\s*termes/);
  if (!bornes) throw new Error('fourchette « N à M termes » non trouvée dans la règle 12.19 — arrêt');
  if (!/Interdiction absolue/i.test(regle)) throw new Error('clause « Interdiction absolue » absente de la règle 12.19 lue — arrêt');

  return { regle, min: Number(bornes[1]), max: Number(bornes[2]) };
}

function construireSysteme(regle) {
  return `Tu produis l'« ${PROPRIETE_INDEX} » d'une fiche de connaissance sur la formation professionnelle réglementée en France. Cet index n'est jamais affiché à un humain : il sert à un modèle à décider si la fiche doit être ouverte pour répondre à une question de consultant.

Règle applicable, lue ce jour sur le référentiel commun :
${regle}

Sortie : la seule ligne d'index, rien avant ni après, aucun commentaire, aucun balisage.`;
}

// ─────────────────────────── Appel modèle ───────────────────────────
async function genererIndex(systeme, fiche, corps, essai = 0) {
  const reponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.APP_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    // Ni température, ni raisonnement étendu manuel, ni préremplissage assistant (§11.1).
    body: JSON.stringify({
      model: MODELE,
      max_tokens: MAX_TOKENS,
      output_config: { effort: EFFORT },
      system: systeme,
      messages: [{ role: 'user', content: `Titre de la fiche : ${fiche.titre}\n\nCorps de la fiche :\n${corps}` }],
    }),
  });

  if (reponse.status === 429 || reponse.status >= 500) {
    if (essai >= 5) throw new Error(`Anthropic ${reponse.status} après 5 tentatives`);
    await pause((Number(reponse.headers.get('retry-after')) || 2 ** essai) * 1000);
    return genererIndex(systeme, fiche, corps, essai + 1);
  }
  if (!reponse.ok) throw new Error(`Anthropic ${reponse.status} — ${(await reponse.text()).slice(0, 300)}`);

  const data = await reponse.json();
  const texte = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return { termes: extraireTermes(texte), entree: data.usage?.input_tokens ?? 0, sortie: data.usage?.output_tokens ?? 0 };
}

function extraireTermes(texte) {
  const lignes = texte.replace(/```/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const ligne = lignes.filter((l) => (l.match(/\|/g) || []).length >= 5).sort((a, b) => b.length - a.length)[0] || '';
  const vus = new Set();
  return ligne
    .split('|')
    .map((t) => t.trim())
    .filter((t) => t && !vus.has(t.toLowerCase()) && vus.add(t.toLowerCase()));
}

// ─────────────────────────── Contrôles ───────────────────────────
function controler(termes, min, max) {
  const alertes = [];
  if (termes.length < min || termes.length > max) alertes.push(`${termes.length} termes, hors ${min}-${max}`);
  // Ponctuation de liaison : virgule, point-virgule, deux-points. Le point est exclu (« art. L.6323-6 »).
  const ponctues = termes.filter((t) => /[,;:]/.test(t));
  if (ponctues.length) alertes.push(`ponctuation de liaison : ${ponctues.slice(0, 3).join(' / ')}`);
  // Les questions types sont exigées par la règle 12.19 : ne pas les signaler comme phrases.
  const interrogatif = /^(?:qui|que|quoi|quel|quelle|quels|quelles|comment|combien|quand|où|pourquoi|est-ce|peut-on|faut-il|doit-on)\b/i;
  const phrases = termes.filter(
    (t) => !interrogatif.test(t) && (t.length > 80 || /\b(?:lorsque|afin de|est|sont|doit|peut)\b/i.test(t)),
  );
  if (phrases.length) alertes.push(`phrase probable : ${phrases.slice(0, 3).join(' / ')}`);
  return alertes;
}

// ─────────────────────────── CSV (séparateur « ; », UTF-8 avec BOM pour Excel) ───────────────────────────
const COLONNES = ['id_fiche', 'titre', 'page_id', 'nb_termes', 'alertes', 'index'];
const champCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function ecrireCsv(chemin, lignes) {
  const contenu = [COLONNES.join(';'), ...lignes.map((l) => COLONNES.map((c) => champCsv(l[c])).join(';'))].join('\r\n');
  writeFileSync(chemin, '\uFEFF' + contenu + '\r\n', 'utf8');
}

function lireCsv(chemin) {
  const texte = readFileSync(chemin, 'utf8').replace(/^\uFEFF/, '');
  const lignes = [];
  let champ = '';
  let ligne = [];
  let guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === ';') { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.some((v) => v !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }

  const entete = lignes.shift().map((c) => c.trim());
  for (const col of COLONNES) {
    if (!entete.includes(col)) throw new Error(`colonne « ${col} » absente du CSV`);
  }
  return lignes.map((valeurs) => Object.fromEntries(entete.map((col, i) => [col, (valeurs[i] ?? '').trim()])));
}

// ─────────────────────────── Essai à blanc ───────────────────────────
async function essaiABlanc() {
  const { regle, min, max } = await lireRegleIndex();
  journal(`Règle 12.19 lue sur le socle (${regle.length} caractères, fourchette ${min}-${max} termes)`);
  const systeme = construireSysteme(regle);

  const fiches = await listerFiches({ filtre: { property: PROPRIETE_INDEX, rich_text: { is_empty: true } }, limite: LIMITE });
  journal(`${fiches.length} fiche(s) à index vide${LIMITE ? ` (limite ${LIMITE})` : ''}`);

  const lignes = [];
  const bilan = { traitees: 0, proposees: 0, corpsVide: 0, erreurs: 0, alertes: 0 };
  let totalEntree = 0;
  let totalSortie = 0;

  for (const [rang, fiche] of fiches.entries()) {
    const etiquette = `${String(rang + 1).padStart(3)} / ${fiches.length}  ${fiche.idFiche || '—'}`;
    bilan.traitees++;
    try {
      let corps = await lireCorps(fiche.id);
      if (corps.length > CORPS_MAX_CARACTERES) corps = corps.slice(0, CORPS_MAX_CARACTERES);
      if (!corps.trim()) {
        bilan.corpsVide++;
        journal(`${etiquette}  IGNORÉE — corps de page vide, à reconstituer · ${fiche.titre.slice(0, 60)}`);
        continue;
      }

      const { termes, entree, sortie } = await genererIndex(systeme, fiche, corps);
      totalEntree += entree;
      totalSortie += sortie;
      const alertes = controler(termes, min, max);
      if (alertes.length) bilan.alertes++;
      bilan.proposees++;

      lignes.push({ id_fiche: fiche.idFiche, titre: fiche.titre, page_id: fiche.id, nb_termes: termes.length, alertes: alertes.join(' · '), index: termes.join(' | ') });
      const cout = (entree * TARIF_ENTREE + sortie * TARIF_SORTIE).toFixed(4);
      journal(`${etiquette}  ${String(termes.length).padStart(2)} termes · corps ${corps.length} c. · ${cout} $${alertes.length ? `  ⚠ ${alertes.join(' · ')}` : ''}`);
    } catch (erreur) {
      bilan.erreurs++;
      journal(`${etiquette}  ERREUR — ${erreur.message}`);
    }
    if (totalEntree + totalSortie > PLAFOND_TOKENS) {
      journal(`Plafond de ${PLAFOND_TOKENS} tokens atteint — arrêt. Relancer pour reprendre (idempotent).`);
      break;
    }
  }

  const chemin = resolve(RACINE, opt('sortie', `rattrapage-index-${JOUR}.csv`));
  ecrireCsv(chemin, lignes);
  const cout = totalEntree * TARIF_ENTREE + totalSortie * TARIF_SORTIE;
  journal(`Bilan essai à blanc : ${bilan.traitees} traitée(s) · ${bilan.proposees} proposée(s) · ${bilan.alertes} avec alerte · ${bilan.corpsVide} corps vide · ${bilan.erreurs} erreur(s) · ${cout.toFixed(2)} $`);
  journal(`CSV : ${chemin}`);
  journal('Aucune écriture Notion. Relire le CSV, supprimer les lignes refusées, puis : node Scripts\\rattrapage-index.mjs --write --fichier=<csv validé>');
}

// ─────────────────────────── Écriture ───────────────────────────
function decouper(texte) {
  const morceaux = [];
  for (let i = 0; i < texte.length; i += RICH_TEXT_MAX) morceaux.push({ type: 'text', text: { content: texte.slice(i, i + RICH_TEXT_MAX) } });
  return morceaux;
}

async function ecrire() {
  const chemin = opt('fichier');
  if (!chemin) throw new Error('--fichier=<csv validé> est obligatoire avec --write');
  const lignes = lireCsv(resolve(RACINE, chemin));
  journal(`Écriture depuis ${chemin} : ${lignes.length} ligne(s)`);
  const bilan = { traitees: 0, ecrites: 0, ignorees: 0, erreurs: 0 };

  for (const [rang, ligne] of lignes.entries()) {
    const etiquette = `${String(rang + 1).padStart(3)} / ${lignes.length}  ${ligne.id_fiche || '—'}`;
    bilan.traitees++;
    if (!ligne.page_id || !ligne.index) {
      bilan.ignorees++;
      journal(`${etiquette}  IGNORÉE — page_id ou index vide dans le CSV`);
      continue;
    }
    try {
      // Règle 12.16 : cible par page ID, contrôle du titre avant écriture.
      const page = await appelNotion(`https://api.notion.com/v1/pages/${ligne.page_id}`);
      const titreNotion = extraireTitre(page);
      if (titreNotion !== ligne.titre) {
        bilan.ignorees++;
        journal(`${etiquette}  IGNORÉE — titre divergent. CSV « ${ligne.titre} » / Notion « ${titreNotion} »`);
        continue;
      }
      if (plat(page.properties?.[PROPRIETE_INDEX]?.rich_text)) {
        bilan.ignorees++;
        journal(`${etiquette}  IGNORÉE — index déjà renseigné dans Notion`);
        continue;
      }
      await appelNotion(`https://api.notion.com/v1/pages/${ligne.page_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: { [PROPRIETE_INDEX]: { rich_text: decouper(ligne.index) } } }),
      });
      bilan.ecrites++;
      journal(`${etiquette}  ÉCRITE (${ligne.nb_termes} termes)`);
    } catch (erreur) {
      bilan.erreurs++;
      journal(`${etiquette}  ERREUR — ${erreur.message}`);
    }
  }
  journal(`Bilan écriture : ${bilan.traitees} traitée(s) · ${bilan.ecrites} écrite(s) · ${bilan.ignorees} ignorée(s) · ${bilan.erreurs} erreur(s)`);
}

// ─────────────────────────── Recensement des corps de page ───────────────────────────
async function recenser() {
  const fiches = await listerFiches({ limite: LIMITE });
  journal(`Recensement : ${fiches.length} fiche(s)`);
  const releve = [];
  for (const fiche of fiches) {
    let longueur = -1;
    let erreur = '';
    try { longueur = (await lireCorps(fiche.id)).trim().length; } catch (e) { erreur = e.message; }
    const etat = erreur ? 'illisible' : longueur === 0 ? 'vide' : longueur < SEUIL_CORPS_COURT ? 'court' : 'ok';
    releve.push({ ...fiche, longueurCorps: longueur, etat, erreur });
    if (etat !== 'ok') journal(`⚠ ${fiche.idFiche} · ${etat} · corps ${longueur} c. · Contenu ${fiche.longueurContenu} c. · ${fiche.validite} · ${fiche.titre.slice(0, 55)}`);
  }
  const chemin = resolve(RACINE, `recensement-corps-${JOUR}.json`);
  writeFileSync(chemin, JSON.stringify(releve.sort((a, b) => a.longueurCorps - b.longueurCorps), null, 2), 'utf8');
  const n = (e) => releve.filter((f) => f.etat === e).length;
  journal(`Bilan recensement : ${releve.length} fiche(s) · ${n('vide')} vide · ${n('court')} court · ${n('illisible')} illisible · ${chemin}`);
}

// ─────────────────────────── Entrée ───────────────────────────
chargerEnv();
if (MODE_ECRITURE && flag('dry-run')) {
  console.error('--write et --dry-run sont incompatibles.');
  process.exit(1);
}
const requises = ['NOTION_API_KEY', ...(!MODE_ECRITURE && !MODE_RECENSEMENT ? ['APP_ANTHROPIC_KEY'] : [])];
for (const variable of requises) {
  if (!process.env[variable]) {
    console.error(`Variable ${variable} absente de .env.local.`);
    process.exit(1);
  }
}

const mode = MODE_RECENSEMENT ? recenser : MODE_ECRITURE ? ecrire : essaiABlanc;
mode().catch((erreur) => {
  journal(`ARRÊT — ${erreur.message}`);
  process.exit(1);
});
