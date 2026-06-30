---
name: workflow-veille-fiches
description: "Workflow de génération et de veille des fiches de connaissance CPF/RS/RNCP/VAE/Bilans dans Notion : exploration des sources, logique créer/mettre à jour/signaler, points de vigilance, format des récapitulatifs. Déclencher au démarrage de toute session de production ou de veille sur ce projet."
---

# Skill : workflow-veille-fiches

Toute la logique opérationnelle (protocole d'exploration à 4 niveaux, liste des sources, replis, logique de décision, règles de points de vigilance, format des récapitulatifs, périmètre) vit dans le **Socle technique commun** et les deux prompts agents — sources uniques, modifiables directement :

- **Socle technique commun** — ID `380af029-a679-81ac-978b-cfbe4c90c52b`
- **Prompt Production & maintenance** — ID `380af029-a679-813d-b713-ca40943d5cc7`
- **Prompt Veille autonome** — ID `380af029-a679-8190-9219-ef68883ee77e`

Au démarrage de session, lire le socle puis le prompt correspondant au mode (production/maintenance ou veille), et exécuter selon leur contenu. Cette skill ne duplique aucune procédure : en cas d'écart, le socle et les prompts font foi.
