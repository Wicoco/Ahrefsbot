const axios = require('axios');
require('dotenv').config();

/**
 * Récupère les backlinks cassés depuis l'API Ahrefs
 * @param {string} domain - Domaine cible
 * @returns {Promise<Array>} - Liste des backlinks cassés
 */
async function getBrokenBacklinks(domain) {
  try {
    console.log(`Récupération des backlinks cassés pour ${domain}`);
    
    const response = await axios.get(
      `https://api.ahrefs.com/v2/broken-backlinks`, 
      {
        params: {
          target: domain,
          mode: 'prefix',
          limit: 100
        },
        headers: { 
          'Authorization': `Bearer ${process.env.AHREFS_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    // Transformer les données selon la structure requise
    return response.data.brokenBacklinks.map(link => ({
      url: link.url,
      errorCode: link.httpCode,
      referringPage: link.refPage
    }));
    
  } catch (error) {
    console.error(`Erreur lors de la récupération des données Ahrefs: ${error.message}`);
    return [];
  }
}

/**
 * Récupère les statistiques de domaine depuis Ahrefs
 * @param {string} domain - Domaine cible
 * @returns {Promise<Object>} - Statistiques du domaine
 */
async function getDomainMetrics(domain) {
  try {
    const response = await axios.get(
      `https://api.ahrefs.com/v2/domain-metrics`, 
      {
        params: {
          target: domain,
          mode: 'prefix'
        },
        headers: { 
          'Authorization': `Bearer ${process.env.AHREFS_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    return {
      domainRating: response.data.metrics.domainRating,
      organicTraffic: response.data.metrics.organicTraffic,
      totalBacklinks: response.data.metrics.backlinks,
      totalReferringDomains: response.data.metrics.referringDomains
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des métriques: ${error.message}`);
    return {
      domainRating: '-',
      organicTraffic: '-',
      totalBacklinks: '-',
      totalReferringDomains: '-'
    };
  }
}

module.exports = { getBrokenBacklinks, getDomainMetrics };
