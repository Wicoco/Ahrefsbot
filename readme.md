# Wicoco Ahrefs Bot

Bot Slack qui génère des rapports automatiques sur les backlinks cassés pour vos domaines, en utilisant l'API Ahrefs.

## Fonctionnalités

- Rapports automatiques basés sur un calendrier configurable
- Commandes Slack pour lancer des vérifications manuelles
- Affichage détaillé des backlinks cassés
- Statistiques et métriques de domaine
- Interface interactive avec boutons
- Rechargement automatique de la configuration

## Installation

1. Clonez ce dépôt
2. Installez les dépendances : `npm install`
3. Copiez le fichier `.env.example` vers `.env` et configurez vos variables d'environnement
4. Personnalisez le fichier `schedules.json` avec vos domaines et planifications
5. Démarrez le bot : `npm start`

## Configuration dans Slack

1. Créez une application Slack dans le Tableau de bord des API Slack
2. Activez les commandes slash et configurez les permissions OAuth
3. Ajoutez les commandes slash suivantes :
   - `/ahrefs-check`
   - `/ahrefs-schedule`
   - `/ahrefs-list`
   - `/ahrefs-help`
4. Souscrivez aux événements `app_mention` et activez l'interaction avec les messages

## Utilisation

### Commandes Slash

- `/ahrefs-check domaine` - Vérifier les backlinks cassés pour un domaine
- `/ahrefs-schedule domaine "cron" #canal` - Programmer un rapport récurrent
- `/ahrefs-list` - Afficher tous les rapports programmés
- `/ahrefs-help` - Afficher l'aide

### Formats de planification

Vous pouvez utiliser des expressions de planification simplifiées :
- `daily 9h` - Tous les jours à 9h00
- `daily 14h30` - Tous les jours à 14h30
- `weekly 10h lundi` - Tous les lundis à 10h00
- `monthly 9h 1` - Le 1er de chaque mois à 9h00

Ou utiliser directement des expressions cron standard :
- `0 9 * * *` - Tous les jours à 9h00
- `0 9 * * 1` - Tous les lundis à 9h00

### Mentions

Vous pouvez également mentionner le bot avec:

- `@Bot Ahrefs check example.com` - Vérifier les backlinks d'un domaine
- `@Bot Ahrefs help` - Afficher l'aide

## Structure du projet

- `index.js` - Point d'entrée principal
- `slackHandler.js` - Gestion des commandes Slack et des tâches programmées
- `ahrefsAPI.js` - Communication avec l'API Ahrefs
- `utils.js` - Fonctions utilitaires (formatage, parsing)
- `schedules.json` - Configuration des tâches programmées

## Maintenance

Pour modifier les rapports programmés, éditez le fichier `schedules.json`. Les changements sont automatiquement pris en compte sans redémarrage.

## Dépannage

- Si les rapports planifiés ne fonctionnent pas, vérifiez les logs du serveur et assurez-vous que le fichier `schedules.json` est bien formaté.
- Pour les problèmes d'authentification, vérifiez vos tokens dans le fichier `.env`.
- En cas de problème avec l'API Ahrefs, vérifiez que votre clé API est valide et que vous n'avez pas dépassé votre quota.
