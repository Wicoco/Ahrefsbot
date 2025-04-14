/**
 * Utilitaires pour le bot Ahrefs
 */

// Constantes pour les limites de Slack et les codes d'erreur HTTP
const MAX_SLACK_BLOCKS = 50;
const HTTP_ERROR_CODES = {
  "400": "Requête incorrecte",
  "401": "Authentification requise",
  "403": "Accès interdit",
  "404": "Page non trouvée",
  "405": "Méthode non autorisée",
  "408": "Délai d'attente dépassé",
  "410": "Ressource supprimée",
  "429": "Trop de requêtes",
  "500": "Erreur serveur interne",
  "502": "Mauvaise passerelle",
  "503": "Service indisponible",
  "504": "Délai de passerelle dépassé"
};

/**
 * Formate un nombre pour l'affichage (avec séparateurs de milliers)
 * @param {number|string} num - Nombre à formater
 * @returns {string} - Nombre formaté
 */
function formatNumber(num) {
  if (num === undefined || num === null) return "N/A";
  return new Intl.NumberFormat('fr-FR').format(Number(num));
}

/**
 * Formate les données de backlinks pour l'affichage dans Slack
 * @param {Object} data - Données de backlinks
 * @param {string} domain - Nom de domaine concerné
 * @returns {Array} Blocs formatés pour Slack
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
          "text": `*Backlinks cassés:*\n${formatNumber(data.brokenBacklinks)}`
        },
        {
          "type": "mrkdwn",
          "text": `*Domaines référents:*\n${formatNumber(data.referringDomains)}`
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
          "text": `*Trafic organique:*\n${formatNumber(data.organicTraffic)}`
        }
      ]
    }
  ];
}

/**
 * Formate un message détaillé pour les backlinks cassés
 * @param {string} domain - Domaine analysé
 * @param {Array} brokenLinks - Liste des backlinks cassés
 * @param {Object} errorCounts - Décompte des erreurs par code
 * @param {Object} metrics - Métriques du domaine
 * @param {string} reportId - Identifiant du rapport (optionnel)
 * @returns {Array} - Blocs formatés pour Slack
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
        "text": `:warning: *${formatNumber(brokenLinks.length)} backlinks cassés détectés!*\n\nCes liens pointent vers votre site mais rencontrent des erreurs.`
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
          "text": `*Total backlinks:*\n${formatNumber(metrics?.totalBacklinks)}`
        }
      ]
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": `*Domaines référents:*\n${formatNumber(metrics?.referringDomains)}`
        },
        {
          "type": "mrkdwn",
          "text": `*Trafic organique:*\n${formatNumber(metrics?.organicTraffic)}`
        }
      ]
    }
  ];

  // Ajouter le résumé des erreurs
  const errorTypes = [];
  for (const [code, count] of Object.entries(errorCounts)) {
    const errorDesc = HTTP_ERROR_CODES[code] || "Autre";
    errorTypes.push(`• Code ${code} (${errorDesc}): ${formatNumber(count)} liens`);
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
  const detailedBlocks = formatDetailedLinks(blocks, brokenLinks);
  
  // S'assurer que le message respecte les limites de Slack
  return ensureMessageLimits(detailedBlocks);
}

/**
 * Calcule la distribution des codes d'erreur dans une liste de backlinks cassés
 * @param {Array} brokenLinks - Liste des liens cassés
 * @returns {Object} - Décompte des erreurs par code
 */
function getErrorCounts(brokenLinks) {
  const counts = {};
  for (const link of brokenLinks) {
    const code = link.status_code || "unknown";
    counts[code] = (counts[code] || 0) + 1;
  }
  return counts;
}

/**
 * Formate les détails des liens cassés
 * @param {Array} blocks - Blocs Slack existants auxquels ajouter les détails
 * @param {Array} brokenLinks - Liste des liens cassés à formater
 * @param {number} limit - Nombre maximum de liens à afficher (défaut: 10)
 * @returns {Array} Blocs Slack mis à jour
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
        "text": `Affichage des ${Math.min(brokenLinks.length, limit)} liens sur ${formatNumber(brokenLinks.length)}`
      }
    ]
  });
  
  blocks.push({
    "type": "divider"
  });

  // Limiter le nombre de liens affichés
  const linksToShow = brokenLinks.slice(0, limit);
  
  // Ajouter chaque lien cassé
  for (const link of linksToShow) {
    const status = link.status_code ? `Code ${link.status_code}` : "Erreur inconnue";
    const errorDesc = HTTP_ERROR_CODES[link.status_code] || "";
    const statusText = errorDesc ? `${status} - ${errorDesc}` : status;
    
    blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*URL source:* ${link.source_url || "N/A"}\n*URL cible:* ${link.target_url || "N/A"}\n*Statut:* ${statusText}`
      }
    });
  }
  
  // Si plus de liens que la limite
  if (brokenLinks.length > limit) {
    blocks.push({
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `:information_source: ${brokenLinks.length - limit} autres liens cassés ne sont pas affichés.`
        }
      ]
    });
  }
  
  return blocks;
}

/**
 * Vérifie si un message Slack dépasse les limites et le tronque si nécessaire
 * @param {Array} blocks - Blocs de message Slack
 * @returns {Array} - Blocs ajustés pour respecter les limites de Slack
 */
function ensureMessageLimits(blocks) {
  if (blocks.length <= MAX_SLACK_BLOCKS) return blocks;
  
  const headerBlocks = blocks.slice(0, 5); // Garder l'en-tête
  const footerBlocks = [
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `⚠️ Message tronqué : ${blocks.length - MAX_SLACK_BLOCKS + 6} blocs supplémentaires n'ont pas pu être affichés en raison des limites de Slack.`
        }
      ]
    }
  ];
  
  // Ajouter autant de blocs de contenu que possible
  const contentBlocks = blocks.slice(5, MAX_SLACK_BLOCKS - headerBlocks.length - footerBlocks.length);
  
  return [...headerBlocks, ...contentBlocks, ...footerBlocks];
}

/**
 * Parse le texte d'une commande en arguments
 * @param {string} text - Texte de la commande
 * @returns {Array} - Arguments extraits
 */
function parseCommandText(text) {
  if (!text) return [];
  
  const args = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Gérer les caractères d'échappement
    if (char === '\\' && i < text.length - 1) {
      current += text[++i]; // Ajouter le caractère suivant
      continue;
    }
    
    // Gérer différents types de guillemets
    if ((char === '"' || char === '"' || char === '"') && (quoteChar === '' || quoteChar === char)) {
      inQuotes = !inQuotes;
      if (inQuotes) quoteChar = char;
      else quoteChar = '';
      continue;
    }
    
    // Traiter les espaces
    if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    
    current += char;
  }
  
  // Ajouter le dernier argument
  if (current) args.push(current);
  
  // Avertissement si des guillemets ne sont pas fermés
  if (inQuotes) {
    console.warn("Attention: guillemets non fermés dans la commande:", text);
  }
  
  return args;
}

/**
 * Transforme un format horaire simplifié en expression cron
 * @param {string} simplifiedFormat - Format horaire simplifié
 * @returns {string} - Expression cron équivalente
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
 * @param {string} cronExpression - Expression cron à convertir
 * @returns {string} - Description en langage naturel
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

/**
 * Valide le format d'un nom de domaine
 * @param {string} domain - Nom de domaine à valider
 * @returns {boolean} - Vrai si le domaine est valide
 */
function isValidDomain(domain) {
  // Regex pour valider un nom de domaine
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

/**
 * Génère un graphique ASCII simple pour visualiser les erreurs
 * @param {Object} errorCounts - Comptage des erreurs par code
 * @returns {string} - Graphique ASCII
 */
function generateErrorGraph(errorCounts) {
  const maxCount = Math.max(...Object.values(errorCounts));
  if (maxCount === 0) return "Aucune erreur détectée.";
  
  const graphWidth = 20; // Largeur maximale du graphique
  
  let graph = '';
  
  // Trier les codes d'erreur par fréquence
  const sortedCodes = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Limiter aux 5 codes les plus fréquents
  
  for (const [code, count] of sortedCodes) {
    const barLength = Math.round((count / maxCount) * graphWidth);
    const bar = '█'.repeat(barLength);
    const errorDesc = HTTP_ERROR_CODES[code] || "Autre";
    graph += `Code ${code} (${errorDesc}): ${bar} ${formatNumber(count)}\n`;
  }
  
  return graph;
}

module.exports = {
  formatBacklinkReport,
  parseCommandText,
  parseSimplifiedCron,
  cronToText,
  formatBrokenLinksMessage,
  formatDetailedLinks,
  getErrorCounts,
  ensureMessageLimits,
  isValidDomain,
  generateErrorGraph,
  formatNumber
};
