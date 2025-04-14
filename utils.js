/**
 * Utilitaires pour le bot Ahrefs
 */

/**
 * Formate les données de backlinks pour l'affichage dans Slack
 */
function formatBacklinkReport(data, domain) {
    // Format des blocs pour Slack
    return [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `Rapport de backlinks pour ${domain}`,
          "emoji": true
        }
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Backlinks cassés:*\n${data.brokenBacklinks}`
          },
          {
            "type": "mrkdwn",
            "text": `*Domaines référents:*\n${data.referringDomains}`
          }
        ]
      }
      // ...autres blocs comme avant
    ];
  }
  
  /**
   * Analyse le texte de commande pour extraire les paramètres
   * Gère correctement les guillemets pour les expressions contenant des espaces
   */
  function parseCommandText(text) {
    const parts = [];
    let currentPart = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '"' || char === '"' || char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      
      if (char === ' ' && !inQuotes) {
        if (currentPart) {
          parts.push(currentPart);
          currentPart = '';
        }
      } else {
        currentPart += char;
      }
    }
    
    if (currentPart) {
      parts.push(currentPart);
    }
    
    return parts;
  }
  
  /**
   * Convertit un format horaire simplifié en expression cron standard
   */
  function parseSimplifiedCron(simplifiedFormat) {
    // Normaliser la chaîne (minuscules et espaces)
    const format = simplifiedFormat.trim().toLowerCase();
    
    // Vérifier d'abord si c'est déjà une expression cron valide
    if (/^(\d+|\*)\s+(\d+|\*)\s+(\d+|\*)\s+(\d+|\*)\s+(\d+|\*)$/.test(format)) {
      return format; // Déjà une expression cron
    }
  
    // Correspondances pour les jours de la semaine
    const weekdays = {
      'dimanche': 0, 'lundi': 1, 'mardi': 2, 'mercredi': 3,
      'jeudi': 4, 'vendredi': 5, 'samedi': 6,
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
  
    // Modèle pour le format simplifié
    const dailyPattern = /^daily\s+(\d{1,2})h(\d{2})?$/;
    const weeklyPattern = /^weekly\s+(\d{1,2})h(\d{2})?\s+(\w+)$/;
    const monthlyPattern = /^monthly\s+(\d{1,2})h(\d{2})?\s+(\d{1,2})$/;
  
    let match;
  
    // Format quotidien: "daily 9h" ou "daily 14h30"
    if ((match = dailyPattern.exec(format))) {
      const hour = match[1];
      const minute = match[2] || '0';
      return `${minute} ${hour} * * *`;
    }
    
    // Format hebdomadaire: "weekly 9h lundi" ou "weekly 14h30 vendredi"
    else if ((match = weeklyPattern.exec(format))) {
      const hour = match[1];
      const minute = match[2] || '0';
      const day = match[3];
      
      if (!weekdays.hasOwnProperty(day)) {
        throw new Error(`Jour de semaine invalide: ${day}. Utilisez un de: ${Object.keys(weekdays).join(', ')}`);
      }
      
      return `${minute} ${hour} * * ${weekdays[day]}`;
    }
    
    // Format mensuel: "monthly 9h 1" ou "monthly 14h30 15"
    else if ((match = monthlyPattern.exec(format))) {
      const hour = match[1];
      const minute = match[2] || '0';
      const day = match[3];
      
      if (day < 1 || day > 31) {
        throw new Error(`Jour du mois invalide: ${day}. Utilisez un nombre entre 1 et 31.`);
      }
      
      return `${minute} ${hour} ${day} * *`;
    }
    
    // Si aucun format ne correspond
    throw new Error(`Format d'horaire non reconnu: ${simplifiedFormat}. Utilisez "daily 9h", "weekly 9h lundi", ou "monthly 9h 1".`);
  }
  
  /**
   * Convertit une expression cron en texte explicatif
   */
  function cronToText(cronExpression) {
    const parts = cronExpression.split(' ');
    const minute = parts[0];
    const hour = parts[1];
    const dayOfMonth = parts[2];
    const month = parts[3];
    const dayOfWeek = parts[4];
    
    const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    
    // Format quotidien
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `tous les jours à ${hour}h${minute !== '0' ? minute : ''}`;
    }
    
    // Format hebdomadaire
    else if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      return `tous les ${weekdays[dayOfWeek]} à ${hour}h${minute !== '0' ? minute : ''}`;
    }
    
    // Format mensuel
    else if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
      return `le ${dayOfMonth} de chaque mois à ${hour}h${minute !== '0' ? minute : ''}`;
    }
    
    // Autre format (retourner l'expression cron originale)
    else {
      return `selon l'expression cron: ${cronExpression}`;
    }
  }
  
  module.exports = {
    formatBacklinkReport,
    parseCommandText,
    parseSimplifiedCron,
    cronToText
  };
  