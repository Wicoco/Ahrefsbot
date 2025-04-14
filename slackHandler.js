/**
 * Gestionnaire des interactions Slack et des tâches programmées
 */
const fs = require('fs');
const cron = require('node-cron');
const ahrefsAPI = require('./ahrefsAPI');
const utils = require('./utils');

// Stockage pour les tâches programmées actives
const activeSchedules = {};

// Chargement des planifications depuis le fichier
function loadSchedules() {
  try {
    const scheduleData = JSON.parse(fs.readFileSync('./schedules.json', 'utf8'));
    // Annuler toutes les tâches existantes
    Object.values(activeSchedules).forEach(schedule => schedule.stop());
    Object.keys(activeSchedules).forEach(key => delete activeSchedules[key]);
    
    // Configurer les nouvelles tâches
    scheduleData.forEach(item => {
      setupScheduledTask(item.domain, item.cronExpression, item.channel, item.id);
    });
    
    console.log(`Planifications chargées : ${scheduleData.length} tâches configurées`);
  } catch (error) {
    console.error('Erreur lors du chargement des planifications:', error);
  }
}

// Surveiller les changements dans le fichier de planification
function watchSchedulesFile() {
  fs.watchFile('./schedules.json', (curr, prev) => {
    console.log('Changement détecté dans schedules.json, rechargement...');
    loadSchedules();
  });
}

// Configuration d'une tâche programmée
function setupScheduledTask(domain, cronExpression, channel, id = null) {
  if (!cronExpression || !domain || !channel) {
    console.error('Paramètres manquants pour la tâche programmée:', { domain, cronExpression, channel });
    return false;
  }
  
  // Vérifier si l'expression cron est valide
  if (!cron.validate(cronExpression)) {
    console.error(`Expression cron invalide: ${cronExpression}`);
    return false;
  }
  
  // Générer un ID unique si non fourni
  const taskId = id || `${domain}-${Date.now()}`;
  
  try {
    // Créer et démarrer la tâche
    const task = cron.schedule(cronExpression, async () => {
      console.log(`Exécution de la tâche programmée pour ${domain} dans #${channel}`);
      try {
        await executeBacklinkCheck(domain, channel);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la tâche programmée pour ${domain}:`, error);
        // Notification d'erreur dans Slack
        app.client.chat.postMessage({
          channel,
          text: `:warning: Erreur lors de la vérification programmée pour *${domain}*: ${error.message}`
        });
      }
    });
    
    // Enregistrer la tâche active
    activeSchedules[taskId] = task;
    console.log(`Tâche programmée configurée pour ${domain}: ${utils.cronToText(cronExpression)}`);
    return taskId;
    
  } catch (error) {
    console.error(`Erreur lors de la configuration de la tâche pour ${domain}:`, error);
    return false;
  }
}

// Exécution d'une vérification de backlinks
async function executeBacklinkCheck(domain, channel) {
  try {
    // Envoyer un message initial
    const loadingMessage = await app.client.chat.postMessage({
      channel,
      text: `:hourglass_flowing_sand: Vérification des backlinks cassés pour *${domain}* en cours...`
    });
    
    // Récupérer les données
    const data = await ahrefsAPI.getBacklinkData(domain);
    
    // Si pas de backlinks cassés, message simple
    if (data.brokenBacklinks === 0) {
      await app.client.chat.update({
        channel,
        ts: loadingMessage.ts,
        text: `:white_check_mark: Aucun backlink cassé détecté pour *${domain}* ! (DR: ${data.domainRating}, Backlinks: ${data.totalBacklinks})`
      });
      return;
    }
    
    // Sinon, message détaillé
    const errorCounts = utils.getErrorCounts(data.brokenLinks);
    const blocks = utils.formatBrokenLinksMessage(domain, data.brokenLinks, errorCounts, data, loadingMessage.ts);
    
    await app.client.chat.update({
      channel,
      ts: loadingMessage.ts,
      blocks,
      text: `Rapport de backlinks cassés pour ${domain}`
    });
    
  } catch (error) {
    console.error(`Erreur lors de la vérification pour ${domain}:`, error);
    throw error;
  }
}

// Sauvegarder une planification
function saveSchedule(id, domain, cronExpression, channel) {
  try {
    let schedules = [];
    
    // Charger les planifications existantes
    if (fs.existsSync('./schedules.json')) {
      schedules = JSON.parse(fs.readFileSync('./schedules.json', 'utf8'));
    }
    
    // Vérifier si cette planification existe déjà
    const existingIndex = schedules.findIndex(s => s.id === id);
    
    if (existingIndex >= 0) {
      // Mettre à jour
      schedules[existingIndex] = { id, domain, cronExpression, channel };
    } else {
      // Ajouter
      schedules.push({ id, domain, cronExpression, channel });
    }
    
    // Enregistrer
    fs.writeFileSync('./schedules.json', JSON.stringify(schedules, null, 2));
    return true;
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la planification:', error);
    return false;
  }
}

// Supprimer une planification
function deleteSchedule(id) {
  try {
    // Charger les planifications existantes
    if (!fs.existsSync('./schedules.json')) {
      return false;
    }
    
    let schedules = JSON.parse(fs.readFileSync('./schedules.json', 'utf8'));
    const initialCount = schedules.length;
    
    // Filtrer pour supprimer
    schedules = schedules.filter(s => s.id !== id);
    
    if (schedules.length === initialCount) {
      return false; // Rien n'a été supprimé
    }
    
    // Arrêter la tâche si active
    if (activeSchedules[id]) {
      activeSchedules[id].stop();
      delete activeSchedules[id];
    }
    
    // Enregistrer
    fs.writeFileSync('./schedules.json', JSON.stringify(schedules, null, 2));
    return true;
    
  } catch (error) {
    console.error('Erreur lors de la suppression de la planification:', error);
    return false;
  }
}

// Obtenir toutes les planifications
function getAllSchedules() {
  try {
    if (!fs.existsSync('./schedules.json')) {
      return [];
    }
    
    return JSON.parse(fs.readFileSync('./schedules.json', 'utf8'));
  } catch (error) {
    console.error('Erreur lors de la récupération des planifications:', error);
    return [];
  }
}

// Initialiser le gestionnaire avec l'application Slack
let app;
function initialize(slackApp) {
  app = slackApp;
  
  // Gestionnaire de commande slash pour la vérification
  app.command('/ahrefs-check', async ({ command, ack, respond }) => {
    await ack();
    
    const domain = command.text.trim();
    if (!domain) {
      await respond('Veuillez spécifier un domaine à vérifier. Exemple: `/ahrefs-check example.com`');
      return;
    }
    
    try {
      await respond({
        text: `:hourglass_flowing_sand: Vérification des backlinks cassés pour *${domain}* en cours...`,
        response_type: 'in_channel'
      });
      
      await executeBacklinkCheck(domain, command.channel_id);
      
    } catch (error) {
      console.error(`Erreur lors de la commande check pour ${domain}:`, error);
      await respond({
        text: `Erreur: ${error.message}`,
        response_type: 'ephemeral'
      });
    }
  });
  
  // Gestionnaire pour création/modification de planification
  app.command('/ahrefs-schedule', async ({ command, ack, respond }) => {
    await ack();
    
    // Parser les arguments
    const args = utils.parseCommandText(command.text);
    
    if (args.length < 2) {
      await respond(`
Usage: \`/ahrefs-schedule domaine "fréquence" #canal\`

*Exemples:*
• \`/ahrefs-schedule example.com "daily 9h"\` (tous les jours à 9h00)
• \`/ahrefs-schedule example.com "weekly 14h30 lundi"\` (tous les lundis à 14h30)
• \`/ahrefs-schedule example.com "monthly 10h 1"\` (le 1er jour de chaque mois à 10h00)
• \`/ahrefs-schedule example.com "0 9 * * 1-5"\` (expression cron: lundi au vendredi à 9h00)
      `);
      return;
    }
    
    const domain = args[0];
    const cronInput = args[1];
    let channel = command.channel_id;
    
    // Si un canal est spécifié
    if (args.length >= 3 && args[2].startsWith('<#')) {
      channel = args[2].replace(/[<#>]/g, '').split('|')[0];
    }
    
    try {
      // Convertir le format simplifié en expression cron
      const cronExpression = utils.parseSimplifiedCron(cronInput);
      
      // Générer un ID
      const id = `${domain}-${Date.now()}`;
      
      // Créer la tâche programmée
      const taskId = setupScheduledTask(domain, cronExpression, channel, id);
      
      if (!taskId) {
        throw new Error("Impossible de créer la tâche programmée.");
      }
      
      // Sauvegarder
      if (saveSchedule(id, domain, cronExpression, channel)) {
        await respond({
          text: `:white_check_mark: Rapport programmé pour *${domain}* ${utils.cronToText(cronExpression)} dans <#${channel}>.`,
          response_type: 'in_channel'
        });
      } else {
        throw new Error("Erreur lors de l'enregistrement de la planification.");
      }
      
    } catch (error) {
      console.error(`Erreur lors de la planification pour ${domain}:`, error);
      await respond({
        text: `Erreur: ${error.message}`,
        response_type: 'ephemeral'
      });
    }
  });
  
  // Commande pour lister les planifications
  app.command('/ahrefs-list', async ({ command, ack, respond }) => {
    await ack();
    
    try {
      const schedules = getAllSchedules();
      
      if (schedules.length === 0) {
        await respond({
          text: "Aucune tâche programmée.",
          response_type: 'ephemeral'
        });
        return;
      }
      
      // Construire les blocs pour afficher les planifications
      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Rapports Ahrefs programmés",
            emoji: true
          }
        },
        {
          type: "divider"
        }
      ];
      
      // Ajouter chaque planification
      schedules.forEach(schedule => {
        blocks.push(
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${schedule.domain}*\n${utils.cronToText(schedule.cronExpression)}\nCanal: <#${schedule.channel}>`
            },
            accessory: {
              type: "button",
              text: {
                type: "plain_text",
                text: "Supprimer",
                emoji: true
              },
              style: "danger",
              value: schedule.id,
              action_id: "delete_schedule"
            }
          },
          {
            type: "divider"
          }
        );
      });
      
      await respond({
        blocks,
        text: "Rapports Ahrefs programmés",
        response_type: 'ephemeral'
      });
      
    } catch (error) {
      console.error('Erreur lors de la liste des planifications:', error);
      await respond({
        text: `Erreur: ${error.message}`,
        response_type: 'ephemeral'
      });
    }
  });
  
  // Commande d'aide
  app.command('/ahrefs-help', async ({ command, ack, respond }) => {
    await ack();
    
    await respond({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Aide AhrefsBot",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Commandes disponibles:*"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• `/ahrefs-check domaine` - Vérifier les backlinks cassés pour un domaine"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• `/ahrefs-schedule domaine \"fréquence\" #canal` - Programmer un rapport récurrent"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• `/ahrefs-list` - Afficher tous les rapports programmés"
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Formats de fréquence supportés:*"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• `daily 9h` - Tous les jours à 9h00\n• `daily 14h30` - Tous les jours à 14h30"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• `weekly 9h lundi` - Tous les lundis à 9h00\n• `weekly 14h30 vendredi` - Tous les vendredis à 14h30"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• `monthly 9h 1` - Le 1er du mois à 9h00\n• `monthly 14h30 15` - Le 15 du mois à 14h30"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• Expression cron standard: `0 9 * * 1-5` (lun-ven à 9h00)"
          }
        }
      ],
      text: "Aide AhrefsBot",
      response_type: 'ephemeral'
    });
  });
  
  // Action pour le bouton de suppression
  app.action('delete_schedule', async ({ body, ack, respond }) => {
    await ack();
    
    const scheduleId = body.actions[0].value;
    
    try {
      if (deleteSchedule(scheduleId)) {
        await respond({
          text: `:white_check_mark: Planification supprimée avec succès.`,
          replace_original: false,
          response_type: 'ephemeral'
        });
      } else {
        throw new Error("Planification non trouvée ou erreur lors de la suppression.");
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la planification:', error);
      await respond({
        text: `Erreur: ${error.message}`,
        replace_original: false,
        response_type: 'ephemeral'
      });
    }
  });
  
  // Gestionnaire de mentions
  app.event('app_mention', async ({ event, say }) => {
    const text = event.text.toLowerCase();
    
    // Pattern pour vérification
    const checkPattern = /check\s+([a-zA-Z0-9][a-zA-Z0-9-]{1,61}(?:\.[a-zA-Z]{2,})+)/i;
    // Pattern pour aide
    const helpPattern = /help/i;
    
    const match = checkPattern.exec(text);
    
    if (match) {
      const target = match[1].trim();
      
      await say({
        text: `:hourglass_flowing_sand: Vérification des backlinks cassés pour *${target}* en cours...`,
        thread_ts: event.ts
      });
      
      try {
        await executeBacklinkCheck(target, event.channel);
      } catch (error) {
        console.error(`Erreur lors de la vérification de ${target}:`, error);
        await say({
          text: `Erreur lors de l'analyse de ${target}: ${error.message}`,
          thread_ts: event.ts
        });
      }
      
    } else if (helpPattern.test(text)) {
      await say({
        text: `
*Commandes Ahrefs Bot:*
• \`@AhrefsBot check domaine.com\` - Vérifier les backlinks cassés d'un domaine
• Utilisez \`/ahrefs-help\` pour plus d'options
        `,
        thread_ts: event.ts
      });
      
    } else {
      await say({
        text: "Désolé, je n'ai pas compris cette commande. Essayez `@AhrefsBot check domaine.com` ou `@AhrefsBot help`.",
        thread_ts: event.ts
      });
    }
  });
  
  // Charger les tâches programmées au démarrage
  loadSchedules();
  
  // Surveiller les changements dans le fichier schedules.json
  watchSchedulesFile();
}

module.exports = {
  initialize,
  loadSchedules,
  getAllSchedules,
  executeBacklinkCheck
};
