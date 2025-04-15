// ahrefsAPI.js
/**
 * Module d'interaction avec l'API Ahrefs v3
 * @module ahrefsAPI
 */
const axios = require('axios');
require('dotenv').config();

/**
 * Configuration de base de l'API
 */
const API_CONFIG = {
  BASE_URL: 'https://api.ahrefs.com/v3',
  TOKEN: process.env.AHREFS_API_KEY
};

/**
 * Fonction utilitaire pour gérer les erreurs de l'API
 * @param {Error} error - Erreur capturée
 * @throws {Error} Erreur formatée
 */
function handleApiError(error) {
  if (error.response) {
    const statusCode = error.response.status;
    const data = error.response.data;
    
    if (data && data.error) {
      throw new Error(`Erreur API: ${JSON.stringify(data)}`);
    } else {
      throw new Error(`Erreur API (${statusCode}): ${JSON.stringify(data || 'Réponse vide')}`);
    }
  }
  
  throw new Error(`Erreur de requête: ${error.message}`);
}

/**
 * Fonction générique pour effectuer des requêtes API
 * @param {string} endpoint - Point de terminaison de l'API
 * @param {Object} params - Paramètres de la requête
 * @returns {Promise<Object>} - Données de la réponse
 */
async function makeRequest(endpoint, params = {}) {
  try {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const config = {
      method: 'get',
      url: url,
      headers: {
        'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: params
    };
    
    // Pour le débogage
    // console.log("Requête API:", url);
    // console.log("Paramètres:", JSON.stringify(params, null, 2));
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Récupère les backlinks d'un domaine
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array>} - Liste des backlinks
 */
async function getBacklinks(domain, options = {}) {
  const params = {
    target: domain,
    limit: options.limit || 10,
    order_by: 'domain_rating_source:desc',
    mode: options.mode || 'domain',
    // Champs obligatoires à sélectionner
    select: 'url_from,url_to,anchor,domain_rating_source,first_seen,http_code'
  };
  
  try {
    const result = await makeRequest('/site-explorer/all-backlinks', params);
    // La structure de la réponse est différente, adaptez selon la documentation
    return Array.isArray(result.items) ? result.items : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des backlinks:", error);
    throw error;
  }
}

/**
 * Récupère les backlinks cassés pour un domaine
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array>} - Liste des backlinks cassés
 */
async function getBrokenBacklinks(domain, options = {}) {
  const params = {
    target: domain,
    limit: options.limit || 10,
    order_by: 'domain_rating_source:desc',
    mode: options.mode || 'domain',
    // Champs obligatoires à sélectionner
    select: 'url_from,url_to,anchor,domain_rating_source,http_code'
  };
  
  try {
    const result = await makeRequest('/site-explorer/broken-backlinks', params);
    return Array.isArray(result.items) ? result.items : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des backlinks cassés:", error);
    throw error;
  }
}

/**
 * Récupère les métriques d'un domaine
 * @param {string} domain - Domaine à analyser
 * @returns {Promise<Object>} - Métriques du domaine
 */
async function getDomainMetrics(domain) {
  const params = {
    target: domain,
    mode: 'domain',
    // Champs obligatoires à sélectionner
    select: 'domain_rating,ahrefs_rank,referring_domains,referring_pages,referring_ips,referring_subnets,referring_class_c,external_backlinks,backlinks,traffic_value,traffic_page_value,traffic'
  };
  
  try {
    const result = await makeRequest('/site-explorer', params);
    
    return {
      domainRating: result.domain_rating || 0,
      totalBacklinks: result.backlinks || 0,
      totalReferringDomains: result.referring_domains || 0,
      organicTraffic: result.traffic || 0,
      organicKeywords: result.traffic_value || 0 // Estimation basée sur la valeur du trafic
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des métriques:", error);
    // Retourner des données par défaut en cas d'erreur
    return {
      domainRating: 0,
      totalBacklinks: 0,
      totalReferringDomains: 0,
      organicTraffic: 0,
      organicKeywords: 0
    };
  }
}

/**
 * Effectue une analyse complète d'un domaine
 * @param {string} domain - Domaine à analyser
 * @returns {Promise<Object>} - Résultats de l'analyse
 */
async function analyzeDomain(domain) {
  try {
    // Récupérer les métriques d'abord, pour éviter des requêtes inutiles en cas d'erreur
    const metrics = await getDomainMetrics(domain);
    
    // Ensuite récupérer les backlinks et backlinks cassés en parallèle
    const [backlinks, brokenBacklinks] = await Promise.all([
      getBacklinks(domain, { limit: 10 }).catch(error => {
        console.error("Erreur lors de la récupération des backlinks:", error);
        return [];
      }),
      getBrokenBacklinks(domain, { limit: 10 }).catch(error => {
        console.error("Erreur lors de la récupération des backlinks cassés:", error);
        return [];
      })
    ]);
    
    return {
      success: true,
      domain,
      metrics,
      backlinksSnapshot: backlinks,
      brokenBacklinksSnapshot: brokenBacklinks,
      brokenBacklinksCount: brokenBacklinks.length
    };
  } catch (error) {
    console.error("Erreur lors de l'analyse du domaine:", error);
    return {
      success: false,
      domain,
      error: error.message
    };
  }
}

/**
 * Vérifie si la configuration de l'API est valide
 * @returns {boolean} - True si la configuration est valide
 */
function isConfigValid() {
  return !!API_CONFIG.TOKEN;
}

module.exports = {
  getBacklinks,
  getBrokenBacklinks,
  getDomainMetrics,
  analyzeDomain,
  isConfigValid
};
