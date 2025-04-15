// ahrefsAPIV2.js
/**
 * Module d'interaction avec l'API Ahrefs v2
 * @module ahrefsAPIV2
 */
const axios = require('axios');
require('dotenv').config();

/**
 * Configuration de base de l'API
 */
const API_CONFIG = {
  BASE_URL: 'https://apiv2.ahrefs.com',
  TOKEN: process.env.AHREFS_API_KEY
};

/**
 * Fonction utilitaire pour gérer les erreurs de l'API
 * @param {Error} error - Erreur capturée
 * @throws {Error} Erreur formatée
 */
function handleApiError(error) {
  // Vérifier si l'erreur a une réponse de l'API
  if (error.response) {
    const statusCode = error.response.status;
    const data = error.response.data;
    
    if (statusCode === 401 || statusCode === 403) {
      throw new Error("Accès refusé: vérifiez votre API token et vos permissions");
    }
    
    if (statusCode === 429) {
      throw new Error("Quota dépassé: limite de requêtes atteinte pour votre abonnement");
    }
    
    throw new Error(`Erreur ${statusCode}: ${JSON.stringify(data || 'Réponse vide')}`);
  }
  
  // Erreur générique
  throw new Error(`Erreur de requête: ${error.message}`);
}

/**
 * Fonction générique pour effectuer des requêtes API v2
 * @param {Object} params - Paramètres de la requête
 * @returns {Promise<Object>} - Données de la réponse
 */
async function makeRequest(params = {}) {
  try {
    // Préparation des paramètres de la requête
    const queryParams = {
      token: API_CONFIG.TOKEN,
      ...params
    };
    
    const response = await axios({
      method: 'get',
      url: `${API_CONFIG.BASE_URL}`,
      params: queryParams,
      timeout: 30000 // 30 secondes
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
      output: 'json',
      from: 'backlinks',
      mode: options.mode || 'domain',
      limit: options.limit || 10,
      order_by: options.orderBy || 'ahrefs_rank:desc',
      select: 'url_from,url_to,ahrefs_rank,domain_rating,page_size,anchor,link_type'
    };
    
    const data = await makeRequest(params);
    return data && Array.isArray(data.refpages) ? data.refpages : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des backlinks:", error);
    return [];
  }
}

/**
 * Récupère les backlinks cassés d'un domaine
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires 
 * @returns {Promise<Array>} - Liste des backlinks cassés
 */
async function getBrokenBacklinks(domain, options = {}) {
  try {
    const params = {
      target: domain,
      output: 'json',
      from: 'broken_backlinks',
      mode: options.mode || 'domain',
      limit: options.limit || 10,
      select: 'url_from,url_to,ahrefs_rank,domain_rating,first_seen,link_type'
    };
    
    const data = await makeRequest(params);
    return data && Array.isArray(data.refpages) ? data.refpages : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des backlinks cassés:", error);
    return [];
  }
}

/**
 * Récupère les domaines référents d'un domaine
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array>} - Liste des domaines référents
 */
async function getReferringDomains(domain, options = {}) {
  try {
    const params = {
      target: domain,
      output: 'json',
      from: 'referring_domains',
      mode: options.mode || 'domain',
      limit: options.limit || 10,
      order_by: options.orderBy || 'domain_rating:desc',
      select: 'domain,domain_rating,ahrefs_rank,backlinks,referring_pages,linked_domains'
    };
    
    const data = await makeRequest(params);
    return data && Array.isArray(data.domains) ? data.domains : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des domaines référents:", error);
    return [];
  }
}

/**
 * Récupère les meilleures pages d'un domaine par nombre de backlinks
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array>} - Liste des meilleures pages
 */
async function getBestByLinks(domain, options = {}) {
  try {
    const params = {
      target: domain,
      output: 'json',
      from: 'pages',
      mode: options.mode || 'domain',
      limit: options.limit || 10,
      order_by: 'backlinks:desc',
      select: 'url,ahrefs_rank,backlinks,referring_domains,traffic,keywords,size'
    };
    
    const data = await makeRequest(params);
    return data && Array.isArray(data.pages) ? data.pages : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des meilleures pages:", error);
    return [];
  }
}

/**
 * Récupère les textes d'ancre des backlinks d'un domaine
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array>} - Liste des textes d'ancre
 */
async function getAnchors(domain, options = {}) {
  try {
    const params = {
      target: domain,
      output: 'json',
      from: 'anchors',
      mode: options.mode || 'domain',
      limit: options.limit || 10,
      order_by: 'backlinks:desc',
      select: 'anchor,backlinks,referring_domains,referring_pages'
    };
    
    const data = await makeRequest(params);
    return data && Array.isArray(data.anchors) ? data.anchors : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des textes d'ancre:", error);
    return [];
  }
}

/**
 * Récupère les nouveaux backlinks d'un domaine
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array>} - Liste des nouveaux backlinks
 */
async function getNewBacklinks(domain, options = {}) {
  try {
    // Calculer la date d'il y a 30 jours par défaut
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - (options.days || 30));
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    
    const params = {
      target: domain,
      output: 'json',
      from: 'new_backlinks',
      mode: options.mode || 'domain',
      limit: options.limit || 10,
      date_from: dateFrom,
      select: 'url_from,url_to,ahrefs_rank,domain_rating,first_seen,anchor'
    };
    
    const data = await makeRequest(params);
    return data && Array.isArray(data.refpages) ? data.refpages : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des nouveaux backlinks:", error);
    return [];
  }
}

/**
 * Récupère les backlinks perdus d'un domaine
 * @param {string} domain - Domaine à analyser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array>} - Liste des backlinks perdus
 */
async function getLostBacklinks(domain, options = {}) {
  try {
    // Calculer la date d'il y a 30 jours par défaut
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - (options.days || 30));
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    
    const params = {
      target: domain,
      output: 'json',
      from: 'lost_backlinks',
      mode: options.mode || 'domain',
      limit: options.limit || 10,
      date_from: dateFrom,
      select: 'url_from,url_to,ahrefs_rank,domain_rating,first_seen,last_seen,anchor'
    };
    
    const data = await makeRequest(params);
    return data && Array.isArray(data.refpages) ? data.refpages : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des backlinks perdus:", error);
    return [];
  }
}

/**
 * Récupère les métriques de domaine (Domain Rating, etc.)
 * @param {string} domain - Domaine à analyser
 * @returns {Promise<Object>} - Métriques du domaine
 */
async function getDomainMetrics(domain) {
  try {
    // Obtenir les métriques de base depuis "domain_rating"
    const params = {
      target: domain,
      output: 'json',
      from: 'domain_rating',
      mode: 'domain',
      select: 'domain,domain_rating,ahrefs_rank,backlinks,referring_domains'
    };
    
    const data = await makeRequest(params);
    
    // Vérifier si la réponse contient un tableau avec au moins un objet
    let metrics = {};
    if (data && data.domain && data.domain.length > 0) {
      metrics = data.domain[0];
    }
    
    // Obtenir des informations sur le trafic organique
    const trafficParams = {
      target: domain,
      output: 'json',
      from: 'metrics',
      mode: 'domain',
      select: 'domain,organic_traffic,organic_keywords'
    };
    
    try {
      const trafficData = await makeRequest(trafficParams);
      if (trafficData && trafficData.metrics && trafficData.metrics.length > 0) {
        metrics.organic_traffic = trafficData.metrics[0].organic_traffic;
        metrics.organic_keywords = trafficData.metrics[0].organic_keywords;
      }
    } catch (error) {
      console.error("Impossible d'obtenir les données de trafic:", error);
      metrics.organic_traffic = 0;
      metrics.organic_keywords = 0;
    }
    
    return {
      domainRating: metrics.domain_rating || 0,
      ahrefsRank: metrics.ahrefs_rank || 0,
      totalBacklinks: metrics.backlinks || 0,
      totalReferringDomains: metrics.referring_domains || 0,
      organicTraffic: metrics.organic_traffic || 0,
      organicKeywords: metrics.organic_keywords || 0
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des métriques:", error);
    // Retourner des métriques par défaut en cas d'erreur
    return {
      domainRating: 0,
      ahrefsRank: 0,
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
    // Obtenir les métriques principales
    const metrics = await getDomainMetrics(domain);
    
    // Obtenir d'autres informations en parallèle pour accélérer le processus
    const [backlinks, brokenBacklinks, referringDomains, bestPages, anchors, newBacklinks, lostBacklinks] = await Promise.all([
      getBacklinks(domain, { limit: 5 }),
      getBrokenBacklinks(domain, { limit: 5 }),
      getReferringDomains(domain, { limit: 5 }),
      getBestByLinks(domain, { limit: 5 }),
      getAnchors(domain, { limit: 5 }),
      getNewBacklinks(domain, { limit: 5 }),
      getLostBacklinks(domain, { limit: 5 })
    ]);
    
    // Construire l'objet de résultats
    return {
      success: true,
      domain,
      metrics,
      backlinksSnapshot: backlinks,
      brokenBacklinksSnapshot: brokenBacklinks,
      referringDomainsSnapshot: referringDomains,
      bestPages: bestPages,
      anchorsSnapshot: anchors,
      newBacklinksSnapshot: newBacklinks,
      lostBacklinksSnapshot: lostBacklinks
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

// Exportation de toutes les fonctions du module
const ahrefsAPIV2 = {
  getBacklinks,
  getBrokenBacklinks,
  getDomainMetrics,
  analyzeDomain,
  getReferringDomains,
  getBestByLinks,
  getAnchors,
  getNewBacklinks,
  getLostBacklinks,
  isConfigValid
};

module.exports = ahrefsAPIV2;
