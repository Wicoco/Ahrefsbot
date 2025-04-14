const axios = require('axios');
require('dotenv').config();

/**
 * Récupère les backlinks cassés depuis l'API Ahrefs
 * @param {string} domain - Domaine cible
 * @returns {Promise<Array>} - Liste des backlinks cassés
 */
async function getBrokenBacklinks(domain) {
  try {
    // En production, remplacez ce code par l'appel réel à l'API Ahrefs
    console.log(`Récupération des backlinks cassés pour ${domain}`);
    
    // Simulation de données pour démonstration
    // Dans une implémentation réelle, vous utiliseriez:
    // const response = await axios.get(`https://api.ahrefs.com/v2/...`, {
    //   headers: { Authorization: `Bearer ${process.env.AHREFS_API_KEY}` }
    // });
    
    // Données simulées
    const brokenLinks = [];
    
    // Générer quelques backlinks cassés aléatoires
    const errorCodes = [400, 404, 500, 503];
    const sites = ["blog.com", "news.org", "example.net", "referral.site", "partner.co"];
    
    // Générer entre 10 et 30 liens
    const count = Math.floor(Math.random() * 20) + 10;
    
    for (let i = 0; i < count; i++) {
      const site = sites[Math.floor(Math.random() * sites.length)];
      const path = `/page${i}-${Math.random().toString(36).substring(7)}`;
      const errorCode = errorCodes[Math.floor(Math.random() * errorCodes.length)];
      
      brokenLinks.push({
        url: `https://${site}${path}`,
        errorCode: errorCode,
        referringPage: `https://${site}/referrer${Math.floor(Math.random() * 100)}`
      });
    }
    
    console.log(`${brokenLinks.length} backlinks cassés trouvés`);
    return brokenLinks;
    
  } catch (error) {
    console.error(`Erreur lors de la récupération des données Ahrefs: ${error.message}`);
    return [];
  }
}

module.exports = { getBrokenBacklinks };
