---
name: notion-mcp-fiches
description: "Procédures techniques précises pour créer, lier et mettre à jour des fiches de connaissance Expert formation dans Notion via MCP. Utiliser obligatoirement cette skill pour toute opération d'écriture Notion dans le projet de génération/veille de fiches : création de fiche, création de texte réglementaire, création de source, liaison de relations, création d'entrée VEILLE (signaux, points de vigilance, actions). Contient les data source IDs exacts, les schémas de propriétés complets et la séquence d'appels MCP testée. Déclencher dès qu'une fiche doit être enregistrée dans Notion."
---

# Skill : notion-mcp-fiches

Procédures techniques pour opérer sur la base Notion Expert CPF-RS-RNCP via MCP.  
**Ne jamais redécouvrir les IDs via notion-search.** Toutes les constantes sont ici. Le Référentiel / Socle technique commun Notion fait foi en cas d'écart ; aligner cette skill dès qu'une divergence est constatée.

*Schéma vérifié contre Notion et aligné sur le Socle technique commun le 16 juin 2026.*

---

## 1. IDs et data source URLs — constantes immuables

### Bases Projet initial (architecture)

| Base | data_source_id | collection URL |
|---|---|---|
| FICHES DE CONNAISSANCE | `8d4f6570-748c-4c79-946d-08e12c7bc9ac` | `collection://8d4f6570-748c-4c79-946d-08e12c7bc9ac` |
| THÈMES | `34baf029-a679-800a-bfc6-000b9782d80e` | `collection://34baf029-a679-800a-bfc6-000b9782d80e` |
| SOUS-THÈMES | `9d5f0493-449a-493e-a16b-10d4c3693cb9` | `collection://9d5f0493-449a-493e-a16b-10d4c3693cb9` |
| TEXTES RÉGLEMENTAIRES | `e5ab8c16-abf1-4312-a519-096687af7fdc` | `collection://e5ab8c16-abf1-4312-a519-096687af7fdc` |
| SOURCES | `a073cd74-6101-4d0b-8c41-7d9a5ba5d232` | `collection://a073cd74-6101-4d0b-8c41-7d9a5ba5d232` |

### Bases VEILLE REGLEMENTAIRE

| Base | data_source_id | collection URL |
|---|---|---|
| SIGNAUX | `681b33bb-2cdd-4dd9-98ce-10cf94397859` | `collection://681b33bb-2cdd-4dd9-98ce-10cf94397859` |
| POINTS DE VIGILANCE | `5e048b98-f10a-42b5-9c57-00ebf94d0510` | `collection://5e048b98-f10a-42b5-9c57-00ebf94d0510` |
| *(SOURCES VEILLE supprimée — fusionnée dans SOURCES)* | — | — |
| ACTIONS | `dc49103a-034d-4b3e-b2c3-cd13fb28fe0f` | `collection://dc49103a-034d-4b3e-b2c3-cd13fb28fe0f` |

### Constante : enregistrement factice Textes réglementaires
- **ID page** : `359af029-a679-8165-b5cc-f71a1ab4be5b`
- **URL page** : `https://www.notion.so/359af029a6798165b5ccf71a1ab4be5b`
- Usage : lier dans `→ Textes réglementaires` quand aucun texte réglementaire pertinent n'existe.

---

## 2. Schéma complet — FICHES DE CONNAISSANCE

```
data_source_id : 8d4f6570-748c-4c79-946d-08e12c7bc9ac
```

| Propriété | Type MCP | Valeurs / Notes |
|---|---|---|
| `Titre` | title | Intitulé de la fiche |
| `Domaine` | select | `CPF` · `RS` · `RNCP` · `Transversal` · `VAE` · `Bilans de compétences` |
| `Validité` | select | **Nom exact du champ : `Validité`** (et non « Statut de validation »). Valeurs : `En attente` (jaune, posé par Claude à la création / modif substantielle) · `Validée` (vert, administrateur) · `À corriger` (orange, administrateur) · `Rejetée` (rouge, administrateur). **Claude ne positionne jamais `Validée`, `À corriger` ni `Rejetée`.** Toujours `En attente` à la création. |
| `Résumé` | text | 2-4 phrases de synthèse |
| `Contenu` | text | Corps complet de la fiche |
| `Auteur` | text | `Claude` |
| `Thème` | relation → THÈMES | JSON array d'URL(s) de page THÈMES |
| `Sous-thème` | relation → SOUS-THÈMES | JSON array d'URL(s) de page SOUS-THÈMES |
| `→ Textes réglementaires` | relation → TEXTES RÉGLEMENTAIRES | JSON array d'URL(s). **Jamais vide.** |
| `→ Sources` | relation → SOURCES | JSON array d'URL(s) de page SOURCES |

**Champs read-only (ne pas passer à la création/mise à jour) :** `ID Fiche`, `Date de création`, `Dernière mise à jour`, `⚠ Source non validée`.

- `⚠ Source non validée` : rollup `show_unique` sur la relation `→ Sources` → `Validité`. Affiche les statuts distincts des sources liées. Toute valeur ≠ `Validée` signale une fiche adossée à au moins une source non approuvée. **Signalement, non blocage** : n'altère jamais le `Validité` de la fiche.

⚠️ **Le champ `Mots-clés` (multi_select) a été SUPPRIMÉ de FICHES DE CONNAISSANCE le 16/06/2026** (champ sans usage fonctionnel, recherche sémantique suffisante). Ne plus le passer à la création ni à la mise à jour, et ne plus signaler de « mots-clés à compléter ».

---

## 3. Schéma complet — TEXTES RÉGLEMENTAIRES

```
data_source_id : e5ab8c16-abf1-4312-a519-096687af7fdc
```

| Propriété | Type MCP | Valeurs / Notes |
|---|---|---|
| `Intitulé` | title | Ex. : "Décret n°2019-565 du 5 juin 2019" |
| `Type` | select | `Loi` · `Décret` · `Arrêté` · `Circulaire` · `Ordonnance` · `Directive européenne` |
| `Numéro` | text | Numéro officiel du texte |
| `date:Date de publication:start` | date | Format ISO `YYYY-MM-DD` |
| `date:Date de publication:is_datetime` | integer | `0` (date simple) |
| `Statut légal` | select | `En vigueur` · `Abrogé` · `Modifié` · `En cours` |
| `Domaine` | multi_select | `CPF` · `RS` · `RNCP` · `Financement` · `Certification` |
| `URL officiel` | url | URL Légifrance ou source officielle |
| `Journal Officiel` | text | Référence JO (ex. : "JORF n°0131 du 7 juin 2019") |
| `Résumé` | text | Objet du texte en 1-2 phrases |
| `Auteur` | text | `Claude` |

**Champs read-only :** `ID Texte`, `Date de création`, `Dernière mise à jour`, `Fiches liées`

---

## 4. Schéma complet — SOURCES

```
data_source_id : a073cd74-6101-4d0b-8c41-7d9a5ba5d232
```

| Propriété | Type MCP | Valeurs / Notes |
|---|---|---|
| `Nom de la source` | title | Nom descriptif |
| `userDefined:URL` | url | **Attention : nommer `userDefined:URL` et non `URL`.** URL principale du document ou de la page. |
| `URL de surveillance` | url | URL à explorer en veille si différente de l'URL principale |
| `Fichier lié` | url | URL du fichier pour les sources de type `Fichier` |
| `Type` | select | `Site officiel` · `Publication` · `Base de données` · `Guide` |
| `Type de source` | select | `Web` · `Fichier` ⚠️ La valeur est `Fichier`, **pas** « Document fourni » ni « RSS ». |
| `Type de contenu` | select | `Textes réglementaires` · `Guides PDF` · `Actualités` · `Publications` · `Pages d'aide` |
| `Fiabilité` | select | `Officielle` · `Vérifiée` · `À vérifier` |
| `Validité` | select | `En attente` · `Validée` · `Rejetée`. **À la création par un agent : toujours `En attente`, sans exception.** `Validée` et `Rejetée` sont réservés à l'administrateur. Source écartée → `Rejetée`, **jamais supprimée** (la suppression rejouerait sa détection à la veille suivante). Une source `En attente` ou `Rejetée` n'est jamais explorée en veille ni utilisée comme base d'une fiche ; une source `En attente` peut toutefois être liée à une fiche (signalée par le rollup `⚠ Source non validée`). |
| `Institution` | text | Ex. : "Caisse des Dépôts / EDOF" |
| `Description` | text | Brève description du contenu |
| `Traitement` | select | `En attente` · `En cours` · `Traité` · `Erreur` |
| `Session ciblée` | checkbox | `__YES__` / `__NO__` — coché = à traiter en priorité à la prochaine session |
| `Fréquence` | select | `À chaque session` · `Hebdomadaire` · `Mensuelle` |
| `date:Dernier scan:start` | date | ISO `YYYY-MM-DD` — date de la dernière exploration |
| `date:Dernier scan:is_datetime` | integer | `0` |

**Champs read-only :** `ID Source`, `Date de création`, `Dernière mise à jour`, `Fiches liées`, `→ Points de vigilance`, `→ Signaux`

⚠️ **Champs SUPPRIMÉS de SOURCES le 16/06/2026 — ne plus les passer :**
- `À surveiller` (checkbox) — redondant avec `Validité` : la veille explore toutes les sources non `Rejetées`, triées par `Dernier scan` le plus ancien.
- `Domaine` (multi_select) — sans usage fonctionnel.

**Note `Fiches liées` vide :** pour une source de type **hub de veille** (Légifrance, EDOF ressources, France Compétences, CDC, Ministère du Travail…), une relation `Fiches liées` vide est **normale** — ces sources servent l'exploration, pas l'étayage d'une fiche précise. Ce n'est une anomalie que pour une source de type `Fichier`/document précis exploité par une fiche mais non rattaché.

---

## 5. Schémas VEILLE

### SIGNAUX (`681b33bb-2cdd-4dd9-98ce-10cf94397859`)

| Propriété | Type | Valeurs |
|---|---|---|
| `Titre` | title | — |
| `Type` | select | `Texte réglementaire` · `Actualité EDOF` · `Guide PDF` · `Publication` · `Presse` · `Page d aide HTML` · `Alerte technique` |
| | | ⚠️ La valeur est `Page d aide HTML` **sans apostrophe** (« d aide »). Ne jamais écrire « d'aide ». |
| `Statut` | select | `Non lu` · `En analyse` · `Intégré` · `Non pertinent` |
| `Priorité` | select | `Urgente` · `Normale` · `Faible` |
| `date:Date de détection:start` | date | ISO `YYYY-MM-DD` |
| `date:Date de détection:is_datetime` | integer | `0` |
| `userDefined:URL` | url | URL de la source détectée |
| `Source` | relation → SOURCES | JSON array d'URL(s) |
| `Point de vigilance lié` | relation → POINTS DE VIGILANCE | JSON array d'URL(s) |

**Read-only :** `ID Signal` (auto_increment).

### POINTS DE VIGILANCE (`5e048b98-f10a-42b5-9c57-00ebf94d0510`)

| Propriété | Type | Valeurs |
|---|---|---|
| `Intitulé` | title | — |
| `Statut` | select | `En attente` · `Signal détecté` · `Traité` |
| `Contexte` | text | Description du risque d'évolution |
| `Mots-clés` | text | Termes à surveiller |
| `date:Date d'ouverture:start` | date | ISO `YYYY-MM-DD` |
| `date:Date d'ouverture:is_datetime` | integer | `0` |
| `date:Date de clôture:start` | date | ISO `YYYY-MM-DD` (à la clôture) |
| `date:Date de clôture:is_datetime` | integer | `0` |
| `date:Échéance attendue:start` | date | ISO `YYYY-MM-DD` (si connue) |
| `date:Échéance attendue:is_datetime` | integer | `0` |
| `Fiches liées` | relation → FICHES DE CONNAISSANCE | JSON array d'URL(s). **Obligatoire — un PV sans fiche liée est une anomalie** (cf. §5 du workflow). |
| `Sources à surveiller` | relation → SOURCES | JSON array d'URL(s) |

**Read-only :** `ID Point` (auto_increment).

### ACTIONS (`dc49103a-034d-4b3e-b2c3-cd13fb28fe0f`)

| Propriété | Type | Valeurs / Règles |
|---|---|---|
| `Intitulé` | title | — |
| `Type` | text (au passé) | `Fiche créée` · `Fiche modifiée` · `Texte réglementaire créé` · `Source ajoutée` · `Alerte émise` |
| `Réalisée par` | text | `Claude` |
| `date:Date de réalisation:start` | date | ISO `YYYY-MM-DD` |
| `date:Date de réalisation:is_datetime` | integer | `0` |
| `Fiche cible` | relation → FICHES DE CONNAISSANCE | **Obligatoire** — JSON array d'URL(s) |
| `Signal source` | relation → SIGNAUX | JSON array d'URL(s) (si applicable) |

**Read-only :** `ID Action` (auto_increment), `Statut fiche` (rollup du `Validité` de la fiche cible).

---

## 6. Séquence obligatoire de création d'une fiche complète

Respecter cet ordre à chaque création. Ne pas sauter d'étape.

### Étape 1 — Vérification doublon
```
notion-search : titre exact ou proche dans FICHES DE CONNAISSANCE
→ Si doublon trouvé : signaler, proposer fusion ou fiche complémentaire, attendre validation
→ Si aucun doublon : continuer
```

### Étape 2 — Résolution des relations obligatoires

**2a. Thème et Sous-thème**
- Chercher dans THÈMES et SOUS-THÈMES via `notion-search` ou `notion-fetch` sur la collection.
- Récupérer l'URL de page exacte (format `https://www.notion.so/...`).
- Si inexistant : signaler. Création soumise à validation explicite (voir §6 bis). Ne pas créer de thème/sous-thème sans validation.

**2b. Textes réglementaires**
- `notion-search` dans TEXTES RÉGLEMENTAIRES avec le numéro ou l'intitulé du texte.
- Si trouvé : récupérer l'URL de page.
- Si non trouvé : créer le texte réglementaire (étape 3) **avant** de créer la fiche, puis créer une ACTION `Texte réglementaire créé`.
- Si aucun texte pertinent : utiliser l'URL de l'enregistrement factice : `https://www.notion.so/359af029a6798165b5ccf71a1ab4be5b`

**2c. Sources**
- Vérifier si la source (URL du PDF ou de la page HTML) existe déjà dans SOURCES.
- Si non : créer la source (étape 4) **avant** de créer la fiche, avec `Validité = En attente`.

### Étape 3 — Création du texte réglementaire (si nécessaire)
```json
{
  "parent": { "data_source_id": "e5ab8c16-abf1-4312-a519-096687af7fdc" },
  "pages": [{
    "properties": {
      "Intitulé": "Décret n°XXXX-XXX du XX mois XXXX",
      "Type": "Décret",
      "Numéro": "n°XXXX-XXX",
      "date:Date de publication:start": "YYYY-MM-DD",
      "date:Date de publication:is_datetime": 0,
      "Statut légal": "En vigueur",
      "Domaine": "CPF",
      "URL officiel": "https://www.legifrance.gouv.fr/...",
      "Résumé": "...",
      "Auteur": "Claude"
    }
  }]
}
```
→ Récupérer l'URL de la page créée pour la lier à la fiche.

### Étape 4 — Création de la source (si nécessaire)
```json
{
  "parent": { "data_source_id": "a073cd74-6101-4d0b-8c41-7d9a5ba5d232" },
  "pages": [{
    "properties": {
      "Nom de la source": "Guide EDOF — Référencement des OF (2024)",
      "Type": "Guide",
      "Type de source": "Web",
      "Type de contenu": "Guides PDF",
      "Fiabilité": "Officielle",
      "Validité": "En attente",
      "userDefined:URL": "https://...",
      "Institution": "Caisse des Dépôts / EDOF",
      "Description": "...",
      "Traitement": "En attente"
    }
  }]
}
```
→ Récupérer l'URL de la page créée pour la lier à la fiche.  
⚠️ `Validité` toujours `En attente` à la création — sans exception.  
⚠️ Pour les sources `Web` à explorer régulièrement, renseigner `Fréquence` et `URL de surveillance`.

### Étape 5 — Création de la fiche
```json
{
  "parent": { "data_source_id": "8d4f6570-748c-4c79-946d-08e12c7bc9ac" },
  "pages": [{
    "properties": {
      "Titre": "Titre de la fiche",
      "Domaine": "CPF",
      "Validité": "En attente",
      "Résumé": "...",
      "Auteur": "Claude",
      "Thème": "https://www.notion.so/<id-page-theme>",
      "Sous-thème": "https://www.notion.so/<id-page-sous-theme>",
      "→ Textes réglementaires": "https://www.notion.so/<id-page-texte>",
      "→ Sources": "https://www.notion.so/<id-page-source>"
    },
    "content": "# Titre\n\n## Présentation\n..."
  }]
}
```
⚠️ Ne pas passer `Mots-clés` (champ supprimé). `→ Sources` et les propriétés scalaires sont à mettre à jour dans des appels séparés si une erreur de schéma survient.

### Étape 6 — Création de l'entrée ACTIONS
```json
{
  "parent": { "data_source_id": "dc49103a-034d-4b3e-b2c3-cd13fb28fe0f" },
  "pages": [{
    "properties": {
      "Intitulé": "Fiche créée — Titre de la fiche",
      "Type": "Fiche créée",
      "Réalisée par": "Claude",
      "date:Date de réalisation:start": "YYYY-MM-DD",
      "date:Date de réalisation:is_datetime": 0,
      "Fiche cible": "https://www.notion.so/<url-fiche-créée>"
    }
  }]
}
```

### Étape 7 — Proposition de point de vigilance (si applicable)
→ Voir règle dans le workflow veille. Ne créer que si le sujet présente un fort risque d'évolution. **`Fiches liées` du PV est obligatoire** (lier la/les fiche(s) concernée(s)).

---

## 6 bis. Protocole de création d'un thème ou sous-thème

Création **exceptionnelle**, soumise à **validation explicite de l'administrateur** avant tout enregistrement.

**Sous-thème** (`collection://9d5f0493-449a-493e-a16b-10d4c3693cb9`)
- `Nom` (title) — format `X.Y Libellé`
- `Auteur` (text) — `Claude`
- `Description` (text) — périmètre couvert
- `Ordre d affichage` (number)
- `THÈMES` (relation) — URL de page du thème parent
- ⚠️ Ne **pas** passer `Domaine` — rollup en lecture seule hérité du thème parent.

**Thème** (`collection://34baf029-a679-800a-bfc6-000b9782d80e`)
- `Nom` (title) — format `X. Libellé`
- `Auteur` (text) — `Claude`
- `Description` (text)
- `Ordre` (number)
- `Domaine` (select) — `CPF` · `RS` · `RNCP` · `Transversal` · `VAE` · `Bilans de compétences`

---

## 7. Erreurs MCP connues et résolutions

### Erreur : propriété `URL` non reconnue dans SOURCES / SIGNAUX
**Cause :** la propriété s'appelle `userDefined:URL` (pas `URL`).  
**Résolution :** toujours utiliser `userDefined:URL`.

### Erreur : relation vide ou non liée
**Cause :** passage d'un ID brut au lieu d'une URL de page complète.  
**Résolution :** les relations Notion MCP attendent une URL de page au format `https://www.notion.so/<id-sans-tirets>`. Pour le multi-valeurs, passer un tableau JSON stringifié : `"[\"https://www.notion.so/id1\", \"https://www.notion.so/id2\"]"`. Ne jamais lier une URL provenant d'une autre base dans une relation (crée silencieusement une relation cassée).

### Erreur : champ date non reconnu
**Cause :** passage de `Date de publication` au lieu du format étendu.  
**Résolution :** utiliser systématiquement `date:<Champ>:start` (ISO) + `date:<Champ>:is_datetime` (`0`).

### Erreur : valeur select refusée
**Cause :** orthographe non conforme d'une valeur select (apostrophe, accent, casse). Ex. `Page d aide HTML` s'écrit **sans** apostrophe ; `Fichier` et non « Document fourni ».  
**Résolution :** respecter l'orthographe exacte des §2 à §5. `ALTER COLUMN` échoue si une option contient une apostrophe — préférer des noms d'option simples ou un `ADD COLUMN`.

### Erreur : champ checkbox
**Cause :** passage d'un booléen.  
**Résolution :** utiliser `"__YES__"` / `"__NO__"`.

### Erreur : multi_select à la création
**Cause :** un seul `multi_select` accepte une valeur unique à la création.  
**Résolution :** créer avec une valeur, ajouter les suivantes manuellement dans Notion.

### Erreur : mauvais enregistrement ciblé lors d'un update ou d'une liaison en lot
**Symptôme :** une opération `update_properties` (liaison de relation, changement de statut, etc.) s'applique au mauvais enregistrement — un voisin thématique au lieu de la cible voulue.

**Cause :** résolution de l'ID de la cible par `notion-search` *au moment de l'écriture*. La recherche sémantique renvoie fréquemment, en position 2 ou 3, un enregistrement au sujet proche (même thème, intitulé voisin). Pris dans l'enchaînement d'un lot, l'ID de ce voisin est utilisé sans contrôle. Rappel : la règle générale §1 — « Ne jamais redécouvrir les IDs via notion-search » — s'applique en priorité aux opérations en lot sur enregistrements existants.

**Résolution :**
1. **Figer la table `cible ↔ ID exact` AVANT toute écriture**, à partir d'une source fiable : vue Notion filtrée fournie par l'administrateur (capture avec colonne ID), ou IDs déjà présents dans le contexte de session. Ne pas relancer de `notion-search` pour retrouver un ID juste avant l'`update`.
2. **Contrôle ID↔cible avant chaque écriture** : vérifier que l'ID passé en paramètre figure bien dans la table de travail validée. Si l'ID provient d'une recherche et non de la table, s'arrêter et reconfirmer.
3. **Doute sur l'identité d'une cible existante** → `notion-fetch` préalable de l'enregistrement pour confirmer l'`Intitulé`/`Titre` avant d'écrire. Un fetch coûte moins qu'une écriture erronée à défaire.
4. **Si une recherche est inévitable pour résoudre un ID** (table incomplète) : ne retenir un résultat que sur correspondance **exacte** de l'intitulé attendu, jamais sur la seule pertinence sémantique ou la position dans les résultats.

**En cas d'erreur déjà commise :** `notion-fetch` la cible touchée pour évaluer la valeur écrasée avant toute correction ; si une relation préexistante a été remplacée, la restaurer à partir de sa valeur d'origine. Ne pas présumer que l'enregistrement était vide.

### Erreur de schéma générique (propriété inconnue)
**Procédure :** faire un `notion-fetch` ciblé sur la data source concernée (`collection://<UUID>`) pour relire le schéma réel, recommencer, et signaler en fin de session que ce socle/skill doit être vérifié.

### MCP Notion indisponible
**Procédure :** signaler immédiatement. Produire les fiches en format texte structuré prêt à copier-coller. Attendre rétablissement avant tout enregistrement.

### Conseils d'appels
- Mettre à jour `→ Sources` et les propriétés scalaires dans des appels séparés en cas d'erreur de schéma combinée.
- `replace_content` remplace tout le corps de page ; `insert_content` avec `position: {type:'end'}` ajoute sans risque.
- Récupération de schéma : préfixe `collection://UUID`.

---

## 8. Règles de statut — rappel

| Opération | Statut `Validité` (FICHES) |
|---|---|
| Création de fiche | `En attente` — automatique, sans exception |
| Modification substantielle | `En attente` — automatique |
| Mise à jour mineure (URL, date, référence) | Inchangé — ne pas modifier |
| Validation | `Validée` — administrateur uniquement |
| Correction / rejet | `À corriger` / `Rejetée` — administrateur uniquement |

**Claude ne positionne jamais `Validée`, `À corriger` ou `Rejetée`.**

| Opération (SOURCES) | `Validité` |
|---|---|
| Création par un agent | `En attente` — automatique, sans exception |
| Approbation | `Validée` — administrateur uniquement |
| Rejet / écartement | `Rejetée` — administrateur uniquement. Ne jamais supprimer. |

Une source `Rejetée` ou `En attente` n'est jamais explorée en veille. La veille couvre toutes les sources non `Rejetées`, triées par `Dernier scan` le plus ancien.

---

## Journal des mises à jour de la skill
- **16 juin 2026** — Réalignement complet sur le Socle technique commun (maj 16/06) : champ statut FICHES renommé `Validité` ; suppression de `Mots-clés` (FICHES) ; suppression de `À surveiller` et `Domaine` (SOURCES) ; ajout `Validité` (SOURCES) + rollup `⚠ Source non validée` (FICHES) ; valeurs select VEILLE complétées (`Page d aide HTML`, `Alerte technique`) ; ajout §6 bis (création thème/sous-thème) ; ajout de l'entrée §7 « mauvais enregistrement ciblé lors d'un update/liaison en lot » ; note sur `Fiches liées` vide (PV = anomalie / hub source = normal).