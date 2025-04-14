/**
 * Point d'entrée principal du bot Ahrefs
 */
require('dotenv').config();
const { App } = require('@slack/bolt');
const slackHandler = require('./slackHandler');

// Fonction de vérification des variables d'environnement
function checkEnvironmentVariables() {
  const requiredVars = [
    'SLACK_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_APP_TOKEN',
    'AHREFS_API_KEY'
  ];
  
  let missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.error('❌ ERREUR: Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('Veuillez vérifier votre fichier .env et redémarrer l\'application.');
    process.exit(1);
  }
  
  return true;
}

// Vérifier la configuration avant le démarrage
console.log('🔄 Démarrage de AhrefsBot...');
if (checkEnvironmentVariables()) {
  console.log('✅ Variables d\'environnement correctement configurées');
}

// Initialisation de l'application Slack Bolt
const app = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN,
});

// Initialisation du bot
async function startBot() {
  try {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
    console.log(`🔌 Mode Socket: ${process.env.SOCKET_MODE === 'true' ? 'Activé' : 'Désactivé'}`);
    console.log(`🌐 Port HTTP: ${process.env.PORT || '3000'}`);
    
    // Initialisation du gestionnaire Slack
    slackHandler.initialize(app);
    console.log('📆 Chargement des planifications...');
    console.log('✅ Bot prêt à recevoir des commandes');
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du bot:', error);
    process.exit(1);
  }
}

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promesse rejetée non gérée:', error);
});

// Démarrer le bot
startBot();
