require('dotenv').config();
const fs = require('fs');
const cron = require('node-cron');
const { App } = require('@slack/bolt');
const { getBrokenBacklinks, getDomainMetrics } = require('./ahrefsAPI');
const { handleSlackCommands, handleSlackInteractions } = require('./slackHandler');
const { formatBrokenLinksMessage, formatDetailedLinks, getErrorCounts } = require('./utils');

// Initialisation de l'app Slack Bolt
const app = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN
});

// Variables pour stocker les tâches programmées
let scheduledTasks = [];
// Cache pour stocker temporairement les résultats des rapports
const reportsCache = new Map();

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
 * Récupère les rapports programmés
 * @returns {Array} Liste des rapports programmés 
 */
function getScheduledReports() {
  try {
    const config = JSON.parse(fs.readFileSync('./schedules.json', 'utf8'));
    return config.schedules;
  } catch (error) {
    console.error(`Erreur lors de la lecture des rapports programmés: ${error.message}`);
    return [];
  }
}

/**
 * Ajoute un nouveau rapport programmé
 * @param {Object} report Informations du rapport
 * @returns {boolean} Succès de l'opération
 */
function addScheduledReport(report) {
  try {
    const config = JSON.parse(fs.readFileSync('./schedules.json', 'utf8'));
    config.schedules.push(report);
    fs.writeFileSync('./schedules.json', JSON.stringify(config, null, 2));
    setupSchedules();
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'ajout d'un rapport: ${error.message}`);
    return false;
  }
}

/**
 * Envoie un rapport de backlinks cassés dans Slack
 * @param {string} domain - Domaine cible
 * @param {string} channel - ID du canal Slack
 * @returns {Promise<boolean>} - Succès de l'opération
 */
async function sendBrokenBacklinksReport(domain, channel) {
  try {
    console.log(`Génération du rapport pour ${domain} dans le canal ${channel}`);
    
    // Récupérer les backlinks cassés depuis Ahrefs
    const brokenLinks = await getBrokenBacklinks(domain);
    const metrics = await getDomainMetrics(domain);
    
    // Mettre en cache les résultats pour les interactions
    const reportId = `${domain}-${Date.now()}`;
    reportsCache.set(reportId, { brokenLinks, domain });
    
    // Nettoyer le cache après 1 heure
    setTimeout(() => reportsCache.delete(reportId), 60 * 60 * 1000);
    
    // Si aucun lien cassé, envoyer un message positif
    if (brokenLinks.length === 0) {
      await app.client.chat.postMessage({
        channel: channel,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:white_check_mark: *Backlink check done*\n:tada: *No broken backlinks found!*\n\nAll backlinks to ${domain} are functioning properly!\n\nFor more info: https://app.ahrefs.com/site-explorer/overview/v2/subdomains/live?target=${encodeURIComponent(domain)}`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Domain metrics:* DR: ${metrics.domainRating} | Organic Traffic: ${metrics.organicTraffic.toLocaleString()} | Backlinks: ${metrics.totalBacklinks.toLocaleString()} | Referring Domains: ${metrics.totalReferringDomains.toLocaleString()}`
              }
            ]
          }
        ],
        text: `Backlink check completed for ${domain}. No broken backlinks found!`
      });
      return true;
    }
    
    // Compter les liens par code d'erreur
    const errorCounts = getErrorCounts(brokenLinks);
    
    // Créer les blocs pour le message Slack
    const blocks = formatBrokenLinksMessage(domain, brokenLinks, errorCounts, metrics, reportId);
    
    // Envoyer le message à Slack
    await app.client.chat.postMessage({
      channel: channel,
      blocks: blocks,
      text: `Backlink check completed for ${domain}. Found ${brokenLinks.length} broken backlinks.`
    });
    
    console.log(`Rapport envoyé dans le canal ${channel}`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'envoi du rapport: ${error.message}`);
    
    // Notifier de l'erreur dans Slack
    try {
      await app.client.chat.postMessage({
        channel: channel,
        text: `:warning: Erreur lors de la génération du rapport pour ${domain}: ${error.message}`
      });
    } catch (slackError) {
      console.error(`Impossible d'envoyer la notification d'erreur à Slack: ${slackError.message}`);
    }
    return false;
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

// Configurer les gestionnaires d'événements Slack
handleSlackCommands(app, sendBrokenBacklinksReport, getScheduledReports, addScheduledReport);
handleSlackInteractions(app, reportsCache, formatDetailedLinks);

/**
 * Fonction principale
 */
(async function main() {
  try {
    // Démarrer le serveur Slack
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bot Ahrefs démarré!');
    
    // Configurer les tâches initiales
    setupSchedules();
    
    // Surveiller les modifications du fichier de configuration
    watchConfigFile();
    
    console.log("Bot démarré avec succès! En attente des horaires programmés...");
  } catch (error) {
    console.error("Erreur lors du démarrage du bot:", error);
  }
})();
