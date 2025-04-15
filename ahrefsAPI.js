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
  KEY: process.env.AHREFS_API_KEY
};

/**
 * Récupère la date actuelle au format YYYY-MM-DD
 * @returns {string} Date formatée
 */
function getCurrentDate() {
  const today = new Date();
  return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
}

/**
 * Fonction utilitaire pour gérer les erreurs de l'API
 * @param {Error} error - Erreur capturée
 * @throws {Error} Erreur formatée
 */
function handleApiError(error) {
  // Vérifier si l'erreur a une réponse de l'API
  if (error.response && error.response.data) {
    const data = error.response.data;
    
    // Vérifier le type d'erreur (format d'erreur Ahrefs)
    if (Array.isArray(data) && data[0] === "Error") {
      // Format d'erreur Ahrefs ["Error", ["CodeErreur", "MessageErreur"]]
      if (Array.isArray(data[1]) && data[1].length >= 2) {
        const [code, message] = data[1];
        
        // Gérer les erreurs d'autorisation
        if (code === "AuthorizationFailed" || code === "NotAuthorized") {
          throw new Error("Accès refusé: votre compte n'a pas les permissions nécessaires");
        }
        
        // Gérer les erreurs de paramètres manquants
        if (message.includes("missing argument")) {
          throw new Error(`Erreur API (400): "${message}"`);
        }
        
        throw new Error(`Erreur API (${code}): "${message}"`);
      }
    }
    
    // Autres formats d'erreur
    throw new Error(`Erreur API: ${JSON.stringify(data)}`);
  }
  
  // Erreur générique
  throw new Error(`Erreur de requête: ${error.message}`);
}

/**
 * Fonction générique pour effectuer des requêtes API
 * @param {string} endpoint - Point de terminaison de l'API
 * @param {Object} params - Paramètres de la requête
 * @returns {Promise<Object>} - Donnée de la réponse
 */
async function makeRequest(endpoint, params = {}) {
  try {
    // Ajouter la date du jour aux paramètres si non spécifiée
    if (!params.date) {
      params.date = getCurrentDate();
    }
    
    const response = await axios({
      method: 'get',
      url: `${API_CONFIG.BASE_URL}${endpoint}`,
      params,
      headers: {
        'Authorization': `Bearer ${API_CONFIG.KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
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
  try {
    const params = {
      target: domain,
      limit: options.limit || 10,
      order_by: 'domain_rating_source:desc',
      mode: 'exact'
    };

    const response = await makeRequest('/site-explorer/backlinks', params);
    
    if (!response || !response.items) {
      return [];
    }
    
    return response.items;
  } catch (error) {
    throw error;
  }
}

/**
 * Récupère les backlinks cassés pour un domaine
 * @param {string} domain - Domaine à analyser
 * @returns {Promise<Array>} - Liste des backlinks cassés
 */
async function getBrokenBacklinks(domain) {
  try {
    const params = {
      target: domain,
      limit: 10,
      mode: 'exact'
    };

    const response = await makeRequest('/site-explorer/broken-backlinks', params);
    
    if (!response || !response.items) {
      return [];
    }
    
    return response.items;
  } catch (error) {
    throw error;
  }
}

/**
 * Récupère les métriques d'un domaine
 * @param {string} domain - Domaine à analyser
 * @returns {Promise<Object>} - Métriques du domaine
 */
async function getDomainMetrics(domain) {
  try {
    // Obtenez d'abord le Domain Rating
    const drParams = {
      target: domain,
      output_type: 'json',
      mode: 'exact'
    };
    
    const overviewParams = {
      target: domain,
      output_type: 'json',
      mode: 'exact'
    };
    
    const backlinksParams = {
      target: domain,
      output_type: 'json',
      mode: 'domain'
    };
    
    // Utilitaire pour gérer les réponses manquantes
    const safeGetValue = (obj, defaultValue = 0) => {
      if (!obj) return defaultValue;
      return obj.value !== undefined ? obj.value : defaultValue;
    };
    
    try {
      // Effectuer plusieurs requêtes en parallèle
      const [drResponse, overviewResponse, backlinksResponse] = await Promise.all([
        makeRequest('/site-explorer/domain-rating', drParams).catch(() => null),
        makeRequest('/site-explorer/overview', overviewParams).catch(() => null),
        makeRequest('/site-explorer/metrics', backlinksParams).catch(() => null)
      ]);
      
      // Construire l'objet de métriques
      return {
        domainRating: drResponse?.domain?.domain_rating || 0,
        totalBacklinks: safeGetValue(backlinksResponse?.metrics?.backlinks),
        totalReferringDomains: safeGetValue(backlinksResponse?.metrics?.referring_domains),
        organicTraffic: safeGetValue(overviewResponse?.metrics?.traffic),
        organicKeywords: safeGetValue(overviewResponse?.metrics?.organic_keywords)
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des métriques combinées:", error);
      // Retourner des données par défaut en cas d'erreur
      return {
        domainRating: 0,
        totalBacklinks: 0,
        totalReferringDomains: 0,
        organicTraffic: 0,
        organicKeywords: 0
      };
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Effectue une analyse complète d'un domaine
 * @param {string} domain - Domaine à analyser
 * @returns {Promise<Object>} - Résultats de l'analyse
 */
async function analyzeDomain(domain) {
  try {
    // Obtenir plusieurs métriques en parallèle
    const [backlinks, brokenBacklinks, metrics] = await Promise.all([
      getBacklinks(domain, { limit: 5 }).catch(error => {
        console.error("❌ Erreur lors de la récupération des backlinks:", error);
        return [];
      }),
      getBrokenBacklinks(domain).catch(error => {
        console.error("❌ Erreur lors de la récupération des backlinks cassés:", error);
        return [];
      }),
      getDomainMetrics(domain).catch(error => {
        console.error("❌ Erreur lors de la récupération des métriques:", error);
        throw error;
      })
    ]);
    
    // Construire l'objet de résultats
    return {
      success: true,
      domain,
      metrics,
      backlinksSnapshot: backlinks,
      brokenBacklinksCount: brokenBacklinks.length
    };
  } catch (error) {
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
  return !!API_CONFIG.KEY;
}

module.exports = {
  getBacklinks,
  getBrokenBacklinks,
  getDomainMetrics,
  analyzeDomain,
  isConfigValid
};
