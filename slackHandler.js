const { App } = require('@slack/bolt');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getBacklinkData } = require('./ahrefsAPI');
const utils = require('./utils');

// Configuration Slack
const app = new App({
  token: process.env.SLACK_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Tâches programmées
let scheduledTasks = {};

// Charger et programmer les tâches depuis le fichier
function loadSchedules() {
  try {
    const schedulesPath = path.join(__dirname, 'schedules.json');
    const schedulesData = JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));
    
    // Annuler toutes les tâches existantes
    Object.values(scheduledTasks).forEach(task => task.stop());
    scheduledTasks = {};
    
    // Programmer les nouvelles tâches
    schedulesData.schedules.forEach(schedule => {
      scheduleTask(schedule.target, schedule.cronSchedule, schedule.channel);
    });
    
    console.log(`Tâches programmées chargées: ${schedulesData.schedules.length}`);
  } catch (error) {
    console.error('Erreur lors du chargement des tâches programmées:', error);
  }
}

// Surveiller les changements dans le fichier schedules.json
function watchSchedulesFile() {
  const schedulesPath = path.join(__dirname, 'schedules.json');
  fs.watch(schedulesPath, (eventType) => {
    if (eventType === 'change') {
      console.log('Fichier schedules.json modifié, rechargement...');
      loadSchedules();
    }
  });
}

// Ajouter une nouvelle tâche programmée
function addSchedule(target, cronSchedule, channel) {
  try {
    // Convertir le format simplifié en expression cron
    const cronExpression = utils.parseSimplifiedCron(cronSchedule);
    
    // Valider l'expression cron
    if (!cron.validate(cronExpression)) {
      throw new Error(`Expression cron invalide: ${cronExpression}`);
    }

    const schedulesPath = path.join(__dirname, 'schedules.json');
    const schedulesData = JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));
    
    // Ajouter la nouvelle tâche
    schedulesData.schedules.push({
      target,
      cronSchedule: cronExpression,
      channel
    });
    
    // Enregistrer les modifications
    fs.writeFileSync(schedulesPath, JSON.stringify(schedulesData, null, 2));
    
    // Programmer la tâche
    scheduleTask(target, cronExpression, channel);
    
    return { success: true, cronExpression };
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'une tâche programmée:', error);
    return { success: false, error: error.message };
  }
}

// Programmer une tâche
function scheduleTask(target, cronSchedule, channel) {
  const taskId = `${target}-${channel}`;
  const task = cron.schedule(cronSchedule, async () => {
    try {
      console.log(`Exécution de la tâche programmée: ${target} pour ${channel}`);
      const data = await getBacklinkData(target);
      const message = utils.formatBacklinkReport(data, target);
      
      await app.client.chat.postMessage({
        channel,
        text: `*Rapport programmé pour ${target}*`,
        blocks: message
      });
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la tâche ${taskId}:`, error);
      
      await app.client.chat.postMessage({
        channel,
        text: `*Erreur lors du rapport programmé pour ${target}*\nDétail: ${error.message}`
      });
    }
  });
  
  scheduledTasks[taskId] = task;
  console.log(`Tâche programmée: ${taskId} avec programmation ${cronSchedule}`);
}

// Initialisation du bot
function initializeBot() {
  // Commande slash pour vérifier un domaine
  app.command('/ahrefs-check', async ({ command, ack, respond }) => {
    await ack();
    
    const target = command.text.trim();
    if (!target) {
      await respond({
        text: "Veuillez spécifier un domaine. Exemple: `/ahrefs-check example.com`"
      });
      return;
    }
    
    try {
      await respond({
        text: `Analyse en cours pour ${target}...`
      });
      
      const data = await getBacklinkData(target);
      const message = utils.formatBacklinkReport(data, target);
      
      await respond({
        text: `Résultats pour ${target}`,
        blocks: message
      });
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      await respond({
        text: `Erreur lors de l'analyse de ${target}: ${error.message}`
      });
    }
  });
  
  // Commande slash pour programmer un rapport
  app.command('/ahrefs-schedule', async ({ command, ack, respond }) => {
    await ack();
    
    const parts = utils.parseCommandText(command.text);
    
    if (parts.length < 3) {
      await respond({
        text: "Format incorrect. Utilisez: `/ahrefs-schedule example.com \"daily 9h\" #channel`"
      });
      return;
    }
    
    const [target, cronSchedule, channelName] = parts;
    let channel = channelName.trim();
    
    // Extraire l'ID du canal si le format est <#ID|name>
    const channelMatch = channel.match(/<#([A-Z0-9]+)(?:\|.+)?>/);
    if (channelMatch) {
      channel = channelMatch[1];
    }
    
    try {
      const result = addSchedule(target, cronSchedule, channel);
      
      if (result.success) {
        await respond({
          text: `Rapport programmé pour *${target}* ${utils.cronToText(result.cronExpression)} dans <#${channel}>`
        });
      } else {
        await respond({
          text: `Erreur lors de la programmation: ${result.error}`
        });
      }
    } catch (error) {
      console.error('Erreur lors de la programmation:', error);
      await respond({
        text: `Erreur lors de la programmation: ${error.message}`
      });
    }
  });
  
  // Commande slash pour lister les rapports programmés
  app.command('/ahrefs-list', async ({ ack, respond }) => {
    await ack();
    
    try {
      const schedulesPath = path.join(__dirname, 'schedules.json');
      const schedulesData = JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));
      
      if (schedulesData.schedules.length === 0) {
        await respond({
          text: "Aucun rapport programmé."
        });
        return;
      }
      
      let text = "*Rapports programmés:*\n\n";
      schedulesData.schedules.forEach((schedule, index) => {
        text += `${index + 1}. *${schedule.target}* - ${utils.cronToText(schedule.cronSchedule)} dans <#${schedule.channel}>\n`;
      });
      
      await respond({ text });
    } catch (error) {
      console.error('Erreur lors de la liste des rapports:', error);
      await respond({
        text: `Erreur lors de la récupération des rapports programmés: ${error.message}`
      });
    }
  });
  
  // Commande slash pour l'aide
  app.command('/ahrefs-help', async ({ ack, respond }) => {
    await ack();
    
    const helpText = `
*Commandes Ahrefs Bot:*

• \`/ahrefs-check domaine.com\` - Vérifier les backlinks cassés d'un domaine
• \`/ahrefs-schedule domaine.com "schedule" #canal\` - Programmer un rapport récurrent
• \`/ahrefs-list\` - Afficher tous les rapports programmés
• \`/ahrefs-help\` - Afficher ce message d'aide

*Formats d'horaire simplifiés:*

• \`daily 9h\` - Tous les jours à 9h00
• \`daily 14h30\` - Tous les jours à 14h30
• \`weekly 9h lundi\` - Tous les lundis à 9h00
• \`weekly 14h30 vendredi\` - Tous les vendredis à 14h30
• \`monthly 9h 1\` - Le 1er de chaque mois à 9h00
• \`monthly 14h30 15\` - Le 15 de chaque mois à 14h30

Vous pouvez aussi utiliser les expressions cron standard si vous les connaissez.
`;
    
    await respond({ text: helpText });
  });
  
  // Gestion des mentions
  app.event('app_mention', async ({ event, say }) => {
    const text = event.text;
    const checkPattern = /<@[A-Z0-9]+>\s+check\s+(.+)/i;
    const helpPattern = /<@[A-Z0-9]+>\s+help/i;
    
    if (checkPattern.test(text)) {
      const match = text.match(checkPattern);
      const target = match[1].trim();
      
      try {
        await say({
          text: `Analyse en cours pour ${target}...`,
          thread_ts: event.ts
        });
        
        const data = await getBacklinkData(target);
        const message = utils.formatBacklinkReport(data, target);
        
        await say({
          text: `Résultats pour ${target}`,
          blocks: message,
          thread_ts: event.ts
        });
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        await say({
          text: `Erreur lors de l'analyse de ${target}: ${error.message}`,
          thread_ts: event.ts
        });
      }
    } else if (helpPattern.test(text)) {
      const helpText = `
*Commandes Ahrefs Bot:*

• \`@AhrefsBot check domaine.com\` - Vérifier les backlinks cassés d'un domaine
• Utilisez \`/ahrefs-help\` pour plus d'options
      `;
      
      await say({
        text: helpText,
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
  initializeBot,
  app
};
