require('dotenv').config();
const fs = require('fs');
const cron = require('node-cron');
const { WebClient } = require('@slack/web-api');
const { getBrokenBacklinks } = require('./ahrefsAPI');

// Initialisation du client Slack
const slack = new WebClient(process.env.SLACK_TOKEN);

// Variables pour stocker les tâches programmées
let scheduledTasks = [];

/**
 * Charge la configuration et configure les tâches programmées
 */
function setupSchedules() {
  try {
    // Lire la configuration
    const config = JSON.parse(fs.readFileSync('./schedules.json', 'utf8'));
    console.log(`Configuration de ${config.schedules.length} rapports programmés`);
    
    // Arrêter les tâches existantes
    scheduledTasks.forEach(task => task.stop());
    scheduledTasks = [];
    
    // Configurer les nouvelles tâches
    config.schedules.forEach(schedule => {
      console.log(`Programmation pour ${schedule.target}: ${schedule.cronSchedule}`);
      
      const task = cron.schedule(schedule.cronSchedule, async () => {
        await sendBrokenBacklinksReport(schedule.target, schedule.channel);
      });
      
      scheduledTasks.push(task);
    });
    
    console.log('Tâches programmées configurées avec succès');
  } catch (error) {
    console.error(`Erreur lors de la configuration des tâches: ${error.message}`);
  }
}

/**
 * Envoie un rapport de backlinks cassés dans Slack
 * @param {string} domain - Domaine cible
 * @param {string} channel - ID du canal Slack
 */
async function sendBrokenBacklinksReport(domain, channel) {
  try {
    console.log(`Génération du rapport pour ${domain} dans le canal ${channel}`);
    
    // Récupérer les backlinks cassés depuis Ahrefs
    const brokenLinks = await getBrokenBacklinks(domain);
    
    // Si aucun lien cassé, envoyer un message positif
    if (brokenLinks.length === 0) {
      await slack.chat.postMessage({
        channel: channel,
        text: "Backlink check done :white_check_mark:\nNo broken backlinks found! :tada:"
      });
      return;
    }
    
    // Compter les liens par code d'erreur
    const errorCounts = {};
    brokenLinks.forEach(link => {
      const errorKey = `Error ${link.errorCode}`;
      errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
    });
    
    // Construire le message
    let message = `Backlink check done :white_check_mark:\n`;
    message += `Found ${brokenLinks.length} broken backlinks :no_entry:\n`;
    message += `Broken backlinks per error code:\n`;
    
    Object.keys(errorCounts).forEach(error => {
      message += `${error}: ${errorCounts[error]} links found\n`;
    });
    
    message += `For more info: https://app.ahrefs.com/site-explorer/overview/v2/subdomains/live?target=${encodeURIComponent(domain)}`;
    
    // Créer les blocs pour le message Slack
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Show more (all links)"
            },
            value: "show_all_links",
            action_id: "show_details"
          }
        ]
      }
    ];
    
    // Envoyer le message à Slack
    await slack.chat.postMessage({
      channel: channel,
      blocks: blocks,
      text: "Backlink check completed" // Texte de secours
    });
    
    console.log(`Rapport envoyé dans le canal ${channel}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi du rapport: ${error.message}`);
    
    // Notifier de l'erreur dans Slack
    try {
      await slack.chat.postMessage({
        channel: channel,
        text: `:warning: Erreur lors de la génération du rapport pour ${domain}: ${error.message}`
      });
    } catch (slackError) {
      console.error(`Impossible d'envoyer la notification d'erreur à Slack: ${slackError.message}`);
    }
  }
}

/**
 * Surveille les changements dans le fichier de configuration
 */
function watchConfigFile() {
  fs.watchFile('./schedules.json', (curr, prev) => {
    console.log('Fichier de configuration modifié, rechargement...');
    setupSchedules();
  });
}

/**
 * Fonction principale
 */
(async function main() {
  try {
    console.log("Démarrage du bot de rapport Ahrefs...");
    
    // Configurer les tâches initiales
    setupSchedules();
    
    // Surveiller les modifications du fichier de configuration
    watchConfigFile();
    
    console.log("Bot démarré avec succès! En attente des horaires programmés...");
    
    // Pour tester immédiatement avec un domaine spécifique (décommentez)
    // await sendBrokenBacklinksReport("example.com", process.env.TEST_CHANNEL);
    
  } catch (error) {
    console.error("Erreur lors du démarrage du bot:", error);
  }
})();
