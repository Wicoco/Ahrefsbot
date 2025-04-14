/**
 * Module d'interaction avec l'API Ahrefs
 */
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
    
    // Appel à l'API Ahrefs
    const response = await axios.get('https://api.ahrefs.com/v1/brokenBacklinks', {
      params: {
        token: process.env.AHREFS_API_KEY,
        target: domain,
        limit: 100,
        mode: 'domain',
        output: 'json'
      }
    });
    
    // Vérification et traitement de la réponse
    if (response.data && response.data.brokenBacklinks) {
      return response.data.brokenBacklinks;
    }
    
    throw new Error('Format de réponse inattendu de l\'API Ahrefs');
    
  } catch (error) {
    console.error(`Erreur lors de la récupération des backlinks cassés pour ${domain}:`, error);
    throw new Error(`Échec de l'API Ahrefs: ${error.message}`);
  }
}

/**
 * Récupère les métriques du domaine depuis l'API Ahrefs
 * @param {string} domain - Domaine cible
 * @returns {Promise<Object>} - Métriques du domaine
 */
async function getDomainMetrics(domain) {
  try {
    console.log(`Récupération des métriques pour ${domain}`);
    
    // Appel à l'API Ahrefs
    const response = await axios.get('https://api.ahrefs.com/v1/domainMetrics', {
      params: {
        token: process.env.AHREFS_API_KEY,
        target: domain,
        output: 'json'
      }
    });
    
    // Vérification et traitement de la réponse
    if (response.data && response.data.metrics) {
      return {
        domainRating: response.data.metrics.domainRating || 0,
        totalBacklinks: response.data.metrics.totalBacklinks || 0,
        totalReferringDomains: response.data.metrics.totalReferringDomains || 0,
        organicTraffic: response.data.metrics.organicTraffic || 0
      };
    }
    
    throw new Error('Format de réponse inattendu de l\'API Ahrefs');
    
  } catch (error) {
    console.error(`Erreur lors de la récupération des métriques pour ${domain}:`, error);
    throw new Error(`Échec de l'API Ahrefs: ${error.message}`);
  }
}

/**
 * Récupère les données complètes d'un domaine
 * @param {string} domain - Domaine cible
 * @returns {Promise<Object>} - Données complètes
 */
async function getBacklinkData(domain) {
  try {
    // Récupérer les backlinks cassés
    const brokenLinks = await getBrokenBacklinks(domain);
    // Récupérer les métriques du domaine
    const metrics = await getDomainMetrics(domain);
    
    return {
      brokenBacklinks: brokenLinks.length,
      referringDomains: metrics.totalReferringDomains,
      domainRating: metrics.domainRating,
      organicTraffic: metrics.organicTraffic,
      totalBacklinks: metrics.totalBacklinks,
      brokenLinks: brokenLinks // Liste complète pour affichage détaillé
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des données pour ${domain}:`, error);
    throw error;
  }
}

module.exports = {
  getBrokenBacklinks,
  getDomainMetrics,
  getBacklinkData
};
