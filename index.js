/**
 * Point d'entrée principal du bot Ahrefs
 */
const path = require('path'); // Importation de path qui était manquant

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log("Variables d'environnement :");
console.log("SLACK_TOKEN présent:", !!process.env.SLACK_TOKEN);
console.log("SLACK_BOT_TOKEN présent:", !!process.env.SLACK_BOT_TOKEN);
console.log("SLACK_SIGNING_SECRET présent:", !!process.env.SLACK_SIGNING_SECRET);
console.log("SLACK_APP_TOKEN présent:", !!process.env.SLACK_APP_TOKEN);
console.log("AHREFS_API_KEY présent:", !!process.env.AHREFS_API_KEY);
console.log("AHREFS_API_TOKEN présent:", !!process.env.AHREFS_API_TOKEN);
console.log("SOCKET_MODE présent:", !!process.env.SOCKET_MODE);

console.log("Chemin du fichier .env:", path.resolve(__dirname, '.env'));

const fs = require('fs');
console.log("Le fichier .env existe:", fs.existsSync(path.resolve(__dirname, '.env')));

const { App } = require('@slack/bolt');
const slackHandler = require('./slackHandler');

// Fonction de vérification des variables d'environnement - était manquante
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

// Le reste du code reste inchangé
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
    if (process.env.SOCKET_MODE !== 'true' && process.env.SOCKET_MODE !== 'false') {
      console.warn('⚠️ AVERTISSEMENT: SOCKET_MODE devrait être "true" ou "false". Utilisation de la valeur par défaut: true');
      process.env.SOCKET_MODE = 'true';
    } else {
      // En mode HTTP, on spécifie un port
      const port = process.env.PORT || 3000;
      await app.start(port);
      console.log(`⚡️ Bolt app is running in HTTP Mode on port ${port}!`);
    }
    
    console.log(`🔌 Mode Socket: ${process.env.SOCKET_MODE === 'true' ? 'Activé' : 'Désactivé'}`);
    
    if (process.env.AHREFS_API_KEY && !/^[a-zA-Z0-9]{32,}$/.test(process.env.AHREFS_API_KEY)) {
      console.warn('⚠️ AVERTISSEMENT: Le format de AHREFS_API_KEY semble incorrect. Vérifiez votre configuration.');
    }
    // Initialisation du gestionnaire Slack
    slackHandler.initialize(app);
    console.log('📆 Chargement des planifications...');
    console.log(`
🤖 AhrefsBot est prêt !

Commandes disponibles:
- /ahrefs-check [domaine] - Vérifier les backlinks d'un domaine
- /ahrefs-schedule [domaine] [fréquence] [canal] - Planifier une vérification régulière
- /ahrefs-list - Lister les vérifications planifiées
- /ahrefs-help - Afficher l'aide
`);
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
