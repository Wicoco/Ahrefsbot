/**
 * Module d'interaction avec l'API Ahrefs
 * @module ahrefsAPI
 */
const axios = require('axios');
require('dotenv').config();

/**
 * Configuration de base de l'API
 */
const API_CONFIG = {
  BASE_URL: 'https://api.ahrefs.com/v3/site-explorer',
  KEY: process.env.AHREFS_API_KEY
};

/**
 * Récupère les backlinks d'un domaine via l'API Ahrefs
 * @param {string} domain - Le domaine à analyser
 * @param {Object} [options={}] - Options de la requête
 * @param {number} [options.limit=100] - Nombre de résultats à récupérer
 * @param {string} [options.mode='domain'] - Mode de ciblage (domain, prefix, url)
 * @param {string} [options.orderBy='domain_rating_source:desc'] - Champ de tri
 * @returns {Promise<Array>} Liste de backlinks
 * @throws {Error} En cas d'échec de la requête API
 */
async function getBacklinks(domain, options = {}) {
  const {
    limit = 100,
    mode = 'domain',
    orderBy = 'domain_rating_source:desc'
  } = options;

  console.log(`🔍 Récupération des backlinks pour ${domain}`);
  
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/all-backlinks`, {
      params: {
        token: API_CONFIG.KEY,
        target: domain,
        mode: mode,
        limit: limit,
        order_by: orderBy,
        output: 'json'
      }
    });

    if (!response.data || !response.data.backlinks) {
      throw new Error('Format de réponse inattendu de l\'API Ahrefs');
    }

    return response.data.backlinks;
  } catch (error) {
    handleApiError(error, `récupération des backlinks pour ${domain}`);
  }
}

/**
 * Récupère les backlinks cassés d'un domaine
 * @param {string} domain - Le domaine à analyser
 * @param {Object} [options={}] - Options de la requête
 * @param {number} [options.limit=100] - Nombre de résultats à récupérer
 * @param {string} [options.mode='domain'] - Mode de ciblage (domain, prefix, url)
 * @returns {Promise<Array>} Liste de backlinks cassés
 * @throws {Error} En cas d'échec de la requête API
 */
async function getBrokenBacklinks(domain, options = {}) {
  const {
    limit = 100,
    mode = 'domain'
  } = options;

  console.log(`🔍 Récupération des backlinks cassés pour ${domain}`);
  
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/broken-backlinks`, {
      params: {
        token: API_CONFIG.KEY,
        target: domain,
        mode: mode,
        limit: limit,
        output: 'json'
      }
    });

    if (!response.data || !response.data.brokenBacklinks) {
      throw new Error('Format de réponse inattendu de l\'API Ahrefs');
    }

    return response.data.brokenBacklinks;
  } catch (error) {
    handleApiError(error, `récupération des backlinks cassés pour ${domain}`);
  }
}

/**
 * Récupère les métriques d'un domaine
 * @param {string} domain - Le domaine à analyser
 * @param {Object} [options={}] - Options de la requête
 * @param {string} [options.mode='domain'] - Mode de ciblage (domain, prefix, url)
 * @returns {Promise<Object>} Métriques du domaine
 * @throws {Error} En cas d'échec de la requête API
 */
async function getDomainMetrics(domain, options = {}) {
  const { mode = 'domain' } = options;

  console.log(`🔍 Récupération des métriques pour ${domain}`);
  
  try {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/metrics`, {
      params: {
        token: API_CONFIG.KEY,
        target: domain,
        mode: mode,
        output: 'json'
      }
    });

    if (!response.data || !response.data.metrics) {
      throw new Error('Format de réponse inattendu de l\'API Ahrefs');
    }

    // Normalisation des données
    return {
      domainRating: response.data.metrics.domain_rating || 0,
      totalBacklinks: response.data.metrics.backlinks || 0,
      totalReferringDomains: response.data.metrics.referring_domains || 0,
      organicTraffic: response.data.metrics.organic_traffic || 0,
      organicKeywords: response.data.metrics.organic_keywords || 0
    };
  } catch (error) {
    handleApiError(error, `récupération des métriques pour ${domain}`);
  }
}

/**
 * Récupère les données complètes d'un domaine
 * @param {string} domain - Le domaine à analyser
 * @returns {Promise<Object>} Données d'analyse complètes
 */
async function analyzeDomain(domain) {
  try {
    if (!API_CONFIG.KEY) {
      throw new Error("Clé API Ahrefs manquante. Définissez AHREFS_API_KEY dans votre fichier .env");
    }

    console.log(`📊 Analyse complète du domaine ${domain}`);

    // Récupération parallèle des données pour plus d'efficacité
    const [backlinks, brokenLinks, metrics] = await Promise.all([
      getBacklinks(domain, { limit: 50 }),
      getBrokenBacklinks(domain),
      getDomainMetrics(domain)
    ]);

    return {
      success: true,
      domain,
      metrics,
      backlinksSnapshot: backlinks,
      brokenBacklinks: brokenLinks,
      brokenBacklinksCount: brokenLinks.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse du domaine ${domain}:`, error);
    return {
      success: false,
      domain,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gère les erreurs de l'API Ahrefs de manière centralisée
 * @private
 * @param {Error} error - L'erreur à traiter
 * @param {string} operation - Description de l'opération qui a échoué
 * @throws {Error} Error avec un message utilisateur amélioré
 */
function handleApiError(error, operation) {
  console.error(`❌ Erreur lors de ${operation}:`, error);
  
  // Cas d'une réponse d'erreur HTTP
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Messages personnalisés selon le code d'erreur
    if (status === 401) {
      throw new Error(`Erreur d'authentification: vérifiez votre clé API Ahrefs`);
    } else if (status === 403) {
      throw new Error(`Accès refusé: votre compte n'a pas les permissions nécessaires`);
    } else if (status === 404) {
      throw new Error(`Endpoint introuvable: l'API pour ${operation} n'existe pas ou a changé`);
    } else if (status === 429) {
      throw new Error(`Quota API dépassé: vous avez atteint la limite de requêtes Ahrefs`);
    }
    
    // Extraction des messages d'erreur de l'API si disponibles
    if (data && data.error) {
      throw new Error(`Erreur API (${status}): ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    throw new Error(`Erreur HTTP ${status} lors de ${operation}`);
  }
  
  // Erreur de réseau (pas de réponse reçue)
  if (error.request) {
    throw new Error(`Erreur de connexion: impossible de contacter l'API Ahrefs`);
  }
  
  // Autres erreurs
  throw new Error(`Erreur lors de ${operation}: ${error.message}`);
}

/**
 * Vérifie si la configuration de l'API est valide
 * @returns {boolean} true si la configuration est valide
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
