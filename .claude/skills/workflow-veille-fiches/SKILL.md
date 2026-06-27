---
name: workflow-veille-fiches
description: >
  Workflow complet de génération et de veille des fiches de connaissance
  CPF/RS/RNCP dans Notion. Utiliser obligatoirement cette skill dès qu'une
  session de génération (mode autonome ou réactif) ou de veille est lancée :
  ordre strict des 4 niveaux d'exploration des sources, logique de décision
  créer/mettre à jour/signaler, critères de doublon, règles de points de
  vigilance, et format standardisé des récapitulatifs de session. Déclencher
  à chaque démarrage d'une session Projet 3, quelle que soit l'opération
  demandée.
---

# Skill : workflow-veille-fiches

Logique opérationnelle du Projet 3 : génération et veille des fiches de connaissance.  
À utiliser conjointement avec la skill `notion-mcp-fiches` pour les appels techniques Notion.

---

## 1. Démarrage de session — étape obligatoire

**Avant toute action :** lire le Référentiel technique Notion.  
URL : `https://www.notion.so/35baf029a6798184b358ee5bd27c58ec`

Le Référentiel contient les données vivantes (IDs si mis à jour, URLs de repli, constantes).  
La skill `notion-mcp-fiches` contient les procédures techniques (schémas, séquences d'appels).  
Les deux sont complémentaires et doivent être lus ensemble en début de session.

---

## 2. Trois modes d'opération

### Mode autonome
Génération de fiches depuis les sources officielles, sans document fourni.  
→ Suivre l'ordre des sources défini dans le Référentiel (Priorité 1 à 8).  
→ Lots de 20 fiches maximum. Proposer le plan et attendre validation avant enregistrement.

### Mode réactif
Analyse d'un ou plusieurs documents fournis.  
→ Identifier les sujets non couverts, vérifier les doublons.  
→ Proposer la liste des fiches à créer ou mettre à jour. Attendre validation.

### Mode veille
Exploration périodique des sources, détection des évolutions, mise à jour des fiches.  
→ Consulter d'abord les points de vigilance "En attente" ou "Signal détecté" dans POINTS DE VIGILANCE.  
→ Appliquer les 4 niveaux d'exploration.

---

## 3. Protocole d'exploration des sources — 4 niveaux obligatoires

Pour chaque source explorée, parcourir dans l'ordre. **Aucun niveau ne peut être sauté.**

### Niveau 1 — Actualités HTML
- Lire les annonces, communiqués, brèves récentes sur la page d'accueil ou le hub de la source.
- Repérer toute mention d'évolution réglementaire, de nouveau guide, de nouvelle règle.
- Consigner les URLs des pages lues.

### Niveau 2 — Guides et PDFs
- Identifier tous les PDFs disponibles sur la page/hub.
- Lire les PDFs les plus récents ou mis à jour depuis la dernière session.
- Consigner l'URL exacte de chaque PDF dans SOURCES avant ou simultanément à la création des fiches liées.

### Niveau 3 — Pages d'aide / FAQ HTML statiques *(impératif)*
- Pour chaque page d'aide du périmètre : lire la date "mis à jour le".
- Comparer avec la date `Dernière mise à jour` de la fiche liée dans FICHES DE CONNAISSANCE.
- Tout écart = signal → créer une entrée dans SIGNAUX.
- **Pages EDOF à surveiller systématiquement :**
  - `https://of.moncompteformation.gouv.fr/espace-public/aide/quelles-sont-les-formations-eligibles-au-compte-personnel-de-formation`
  - Toutes pages listées sur `https://of.moncompteformation.gouv.fr/espace-public/ressources`

### Niveau 4 — Comparaison croisée des dates
- Comparer les dates de publication des PDFs et pages HTML vs dates des fiches liées dans Notion.
- Tout écart non déjà signalé au niveau 3 → créer une entrée SIGNAUX.

---

## 4. Logique de décision : créer / mettre à jour / signaler

```
Sujet identifié
│
├─ Hors périmètre CPF/RS/RNCP/OF/réglementation formation ?
│   → Signaler. Ne pas créer de fiche.
│
├─ Doublon exact dans FICHES DE CONNAISSANCE ?
│   → Signaler avant création. Proposer fusion ou fiche complémentaire.
│   → Attendre validation administrateur.
│
├─ Doublon partiel (sujet proche, angle différent) ?
│   → Signaler. Proposer fiche complémentaire avec lien vers fiche existante.
│
├─ Fiche existante avec contenu obsolète ?
│   → Modification substantielle → statut "En attente"
│   → Mise à jour mineure (URL, date, référence) → statut inchangé
│
└─ Sujet nouveau, aucun doublon ?
    → Créer la fiche (séquence skill notion-mcp-fiches, étapes 1→7)
```

### Critères de modification substantielle vs mineure

**Substantielle** (→ statut `En attente`) :
- Modification du contenu principal ou du résumé
- Ajout ou suppression d'un texte réglementaire lié
- Changement de domaine ou de thème
- Refonte de la structure de la fiche

**Mineure** (→ statut inchangé) :
- Correction d'une URL cassée
- Ajout d'une source complémentaire sans changement de contenu
- Mise à jour d'une date de publication
- Correction orthographique

---

## 5. Règles sur les points de vigilance

### Quand proposer un point de vigilance
Proposer uniquement pour les fiches **créées ou modifiées substantiellement** dont le sujet présente un **fort risque d'évolution réglementaire à court terme**.

**Sujets concernés :**
- Textes en attente de décret ou d'arrêté d'application
- Sujets en réforme annoncée
- Critères d'éligibilité CPF
- Plafonds et barèmes financiers
- Pages d'aide EDOF citées comme source
- Listes officielles évolutives (NPEC, certifications éligibles, etc.)

**Sujets exemptés (ne pas créer de point de vigilance) :**
- Fiches descriptives (présentation d'un dispositif stable)
- Fiches institutionnelles (présentation d'un organisme)
- Fiches de cadre stable (définitions, historique)

### Contenu minimal d'un point de vigilance
```
Intitulé     : "[Sujet] — Surveillance [type d'évolution attendue]"
Statut       : "En attente"
Contexte     : Description précise du risque (ex. : "Décret d'application prévu T2 2025")
Mots-clés    : Termes à surveiller dans les sources
Date d'ouverture : date du jour
Fiches liées : URL(s) de la/des fiche(s) concernée(s)
Sources à surveiller : au moins une SOURCE active (À surveiller = coché)
```

---

## 6. Gestion des replis source

| Source | Erreur fréquente | Repli |
|---|---|---|
| EDOF pages d'aide | 403 / timeout | Hub : `https://of.moncompteformation.gouv.fr/espace-public/ressources` |
| EDOF guides PDF | CAPTCHA / 403 | Basculer sur hub ; signaler si bloqué 2 sessions |
| France Compétences | 503 | Attendre, retenter ; repli : page Financement |
| Légifrance | Lenteur / timeout | Repli : `https://www.legifrance.gouv.fr/search/jorf` |
| Ministère du Travail | 404 sous-pages | Remonter d'un niveau dans l'arborescence |
| MCF espace pro | Redirection login | Utiliser l'URL publique sans authentification |

**Règle :** toute source inaccessible deux sessions consécutives → signaler comme "à reconfigurer" dans le récapitulatif.

---

## 7. Enregistrement dans SOURCES — règle absolue

L'URL exacte de **chaque PDF et page HTML exploitée** est enregistrée dans SOURCES **avant ou simultanément** à la création des fiches liées.

Utiliser la séquence étape 4 de la skill `notion-mcp-fiches`.

---

## 8. Workflow détaillé par mode

### Mode autonome

```
1. Lire le Référentiel technique Notion
2. Sélectionner la source selon l'ordre du Référentiel (Priorité 1 → 8)
3. Explorer les 4 niveaux (§3)
4. Vérifier les doublons dans FICHES DE CONNAISSANCE
5. Proposer le plan (lots ≤ 20 fiches) → attendre validation
6. Pour chaque fiche validée :
   a. Séquence création (skill notion-mcp-fiches, étapes 1→6)
   b. Enregistrer les sources dans SOURCES
   c. Proposer point de vigilance si applicable (§5)
7. Récapitulatif de lot (§9) → lot suivant ou source suivante
```

### Mode réactif

```
1. Lire le Référentiel technique Notion
2. Analyser le ou les documents fournis
3. Identifier les sujets couverts et leur périmètre
4. Vérifier les doublons dans FICHES DE CONNAISSANCE
5. Proposer la liste des fiches à créer/mettre à jour → attendre validation
6. Pour chaque fiche validée :
   a. Séquence création ou mise à jour (skill notion-mcp-fiches)
   b. Enregistrer les sources
   c. Proposer point de vigilance si applicable
7. Récapitulatif de session (§9)
```

### Mode veille

```
1. Lire le Référentiel technique Notion
2. Consulter POINTS DE VIGILANCE : statuts "En attente" et "Signal détecté"
3. Pour chaque source du périmètre : explorer les 4 niveaux (§3)
4. Comparer dates PDFs/pages d'aide vs fiches liées dans Notion
5. Pour chaque point de vigilance ouvert :
   a. Vérifier si une évolution est détectée
   b. Si oui : créer un SIGNAL, mettre à jour le statut du point → "Signal détecté"
   c. Si résolu : mettre à jour → "Traité" + date de clôture
6. Créer des SIGNAUX pour toute évolution hors points de vigilance existants
7. Créer des points de vigilance pour fiches à fort risque non encore couvertes
8. Générer et enregistrer les fiches nécessaires
9. Récapitulatif de session (§9)
```

---

## 9. Format du récapitulatif de session

Produire ce récapitulatif à la fin de chaque session ou lot.

```
## Récapitulatif de session — [date]

### Fiches créées ([n])
- [Titre] — [URL Notion] — Domaine : [CPF/RS/RNCP/Transversal]
- ...

### Fiches modifiées ([n])
- [Titre] — [URL Notion] — Type de modification : [substantielle / mineure]
- ...

### Textes réglementaires créés ([n])
- [Intitulé] — [URL Notion]
- ...

### Sources ajoutées ([n])
- [Nom] — [URL source] → [URL Notion]
- ...

### Points de vigilance
- Ouverts : [n] → [liste des intitulés]
- Clôturés : [n] → [liste des intitulés]
- Signaux créés : [n]

### Sources inaccessibles
- [Source] — [erreur] — [repli appliqué / "à reconfigurer"]

### Anomalies et signalements
- [Description de chaque anomalie : doublon détecté, champ manquant, schéma à vérifier...]
```

---

## 10. Comportement en cas de difficulté

| Situation | Action |
|---|---|
| Information insuffisante | Créer la fiche avec champs disponibles, statut "En attente", signaler les champs manquants. Ne jamais compléter par déduction. |
| Sujet hors périmètre | Signaler, ne pas créer de fiche. |
| Doublon potentiel | Signaler avant création, proposer fusion ou fiche complémentaire, attendre validation. |
| Source inaccessible | Appliquer le repli (§6). Deux sessions = "à reconfigurer". |
| MCP Notion indisponible | Signaler immédiatement. Produire les fiches en format texte structuré. Attendre rétablissement. |
| Erreur de schéma MCP | Fetch ciblé sur la base concernée, recommencer, signaler en fin de session. |

---

## 11. Périmètre strict — rappel

**Dans le périmètre :** CPF, RNCP/RS, obligations des OF, France Compétences, CDC/EDOF/MCF, réglementation formation professionnelle.

**Hors périmètre (signaler et écarter) :** tout autre sujet — emploi, insertion, apprentissage hors CPF, fiscalité, social, etc.
