/**
 * Point d'entrée principal du bot Ahrefs
 */
require('dotenv').config();
const { App } = require('@slack/bolt');
const slackHandler = require('./slackHandler');

// Initialisation de l'application Slack Bolt
const app = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN,
});

// Initialisation du bot
async function startBot() {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
  
  // Initialisation du gestionnaire Slack
  slackHandler.initialize(app);
}

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('Erreur non gérée:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promesse rejetée non gérée:', error);
});

// Démarrer le bot
startBot();
