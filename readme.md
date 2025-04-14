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

### Mentions

Vous pouvez également mentionner le bot avec:

- `@Bot Ahrefs check example.com` - Vérifier les backlinks d'un domaine
- `@Bot Ahrefs help` - Afficher l'aide

## Maintenance

Pour modifier les rapports programmés, éditez le fichier `schedules.json`. Les changements sont automatiquement pris en compte sans redémarrage.
