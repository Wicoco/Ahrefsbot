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
    // Si nous sommes en mode socket, pas besoin de spécifier un port
    if (process.env.SOCKET_MODE === 'true') {
      await app.start();
      console.log('⚡️ Bolt app is running in Socket Mode!');
    } else {
      // En mode HTTP, on spécifie un port
      const port = process.env.PORT || 3000;
      await app.start(port);
      console.log(`⚡️ Bolt app is running in HTTP Mode on port ${port}!`);
    }
    
    console.log(`🔌 Mode Socket: ${process.env.SOCKET_MODE === 'true' ? 'Activé' : 'Désactivé'}`);
    
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
