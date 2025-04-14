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
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Domain Rating:*\n${data.domainRating}`
          },
          {
            "type": "mrkdwn",
            "text": `*Trafic organique:*\n${data.organicTraffic}`
          }
        ]
      }
    ];
  }
  
  /**
   * Formate un message détaillé pour les backlinks cassés
   */
  function formatBrokenLinksMessage(domain, brokenLinks, errorCounts, metrics, reportId) {
    // Créer les blocs pour le message Slack
    const blocks = [
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
        "text": {
          "type": "mrkdwn",
          "text": `:warning: *${brokenLinks.length} backlinks cassés détectés!*\n\nCes liens pointent vers votre site mais rencontrent des erreurs.`
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Domain Rating:*\n${metrics?.domainRating || "N/A"}`
          },
          {
            "type": "mrkdwn",
            "text": `*Total backlinks:*\n${metrics?.totalBacklinks || "N/A"}`
          }
        ]
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Domaines référents:*\n${metrics?.referringDomains || "N/A"}`
          },
          {
            "type": "mrkdwn",
            "text": `*Trafic organique:*\n${metrics?.organicTraffic || "N/A"}`
          }
        ]
      }
    ];
  
    // Ajouter le résumé des erreurs
    const errorTypes = [];
    for (const [code, count] of Object.entries(errorCounts)) {
      let errorDesc = "Autre";
      if (code === "404") errorDesc = "Page non trouvée";
      else if (code === "500") errorDesc = "Erreur serveur";
      else if (code === "403") errorDesc = "Accès interdit";
      else if (code === "401") errorDesc = "Authentification requise";
      else if (code === "410") errorDesc = "Ressource supprimée";
      
      errorTypes.push(`• Code ${code} (${errorDesc}): ${count} liens`);
    }
  
    blocks.push(
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Types d'erreurs:*\n${errorTypes.join("\n")}`
        }
      },
      {
        "type": "divider"
      }
    );
    
    // Ajouter les détails des liens
    return formatDetailedLinks(blocks, brokenLinks);
  }
  
  /**
   * Formate les détails des liens cassés
   */
  function formatDetailedLinks(blocks, brokenLinks, limit = 10) {
    // Ajouter un en-tête pour les liens
    blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Détails des liens cassés:*"
      }
    });
    
    blocks.push({
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `Affichage des ${Math.min(brokenLinks.length, limit)} liens sur ${brokenLinks.length}`
        }
      ]
    });
    
    blocks.push({
      "type": "divider"
    });
  
    // Limiter le nombre de liens affichés
    const linksToShow = brokenLinks.slice(0, limit);
    
    linksToShow.forEach((link, index) => {
      blocks.push(
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*${index + 1}. URL cassée:* \`${link.url}\`\n*Code:* ${link.errorCode}\n*Page référente:* <${link.referringPage}|Voir la page>`
          }
        },
        {
          "type": "divider"
        }
      );
    });
  
    // Ajouter un avertissement si tous les liens ne sont pas affichés
    if (brokenLinks.length > limit) {
        blocks.push({
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": `...et ${brokenLinks.length - limit} autres liens. Voir la liste complète dans Ahrefs.`
            }
          ]
        });
      }
    
      return blocks;
    }
    
    /**
     * Compte les erreurs par code HTTP
     */
    function getErrorCounts(brokenLinks) {
      const counts = {};
      brokenLinks.forEach(link => {
        const code = link.errorCode.toString();
        counts[code] = (counts[code] || 0) + 1;
      });
      return counts;
    }
    
    /**
     * Parse le texte d'une commande en arguments
     */
    function parseCommandText(text) {
      if (!text) return [];
      
      const args = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '"' || char === '"' || char === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        
        if (char === ' ' && !inQuotes) {
          if (current) {
            args.push(current);
            current = '';
          }
          continue;
        }
        
        current += char;
      }
      
      if (current) {
        args.push(current);
      }
      
      return args;
    }
    
    /**
     * Transforme un format horaire simplifié en expression cron
     */
    function parseSimplifiedCron(simplifiedFormat) {
      // Vérifier si le format est déjà une expression cron valide
      if (/^(\d+|\*)\s+(\d+|\*)\s+(\d+|\*)\s+(\d+|\*)\s+(\d+|\*)$/.test(simplifiedFormat)) {
        return simplifiedFormat; // Retourne l'expression cron telle quelle
      }
      
      // Patterns pour les formats simplifiés
      const dailyPattern = /^daily\s+(\d{1,2})h(?:(\d{2}))?$/i;
      const weeklyPattern = /^weekly\s+(\d{1,2})h(?:(\d{2}))?\s+([a-zé]+)$/i;
      const monthlyPattern = /^monthly\s+(\d{1,2})h(?:(\d{2}))?\s+(\d{1,2})$/i;
      
      let match;
      
      // Correspondance des jours de la semaine
      const weekdays = {
        'dimanche': 0, 'lundi': 1, 'mardi': 2, 'mercredi': 3, 
        'jeudi': 4, 'vendredi': 5, 'samedi': 6
      };
      
      // Format quotidien: "daily 9h" ou "daily 14h30"
      if ((match = dailyPattern.exec(simplifiedFormat))) {
        const hour = match[1];
        const minute = match[2] || '0';
        return `${minute} ${hour} * * *`;
      }
      
      // Format hebdomadaire: "weekly 9h lundi" ou "weekly 14h30 mercredi"
      else if ((match = weeklyPattern.exec(simplifiedFormat))) {
        const hour = match[1];
        const minute = match[2] || '0';
        const day = match[3];
        
        if (!weekdays.hasOwnProperty(day)) {
          throw new Error(`Jour de semaine invalide: ${day}. Utilisez un de: ${Object.keys(weekdays).join(', ')}`);
        }
        
        return `${minute} ${hour} * * ${weekdays[day]}`;
      }
      
      // Format mensuel: "monthly 9h 1" ou "monthly 14h30 15"
      else if ((match = monthlyPattern.exec(simplifiedFormat))) {
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
      cronToText,
      formatBrokenLinksMessage,
      formatDetailedLinks,
      getErrorCounts
    };
  