// cli-test.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const ahrefsAPI = require('./ahrefsAPI.js');

// Fonction pour afficher les backlinks
async function displayBacklinks(domain) {
  try {
    console.log(`📊 Récupération des backlinks pour ${domain}...`);
    const result = await ahrefsAPI.getBacklinks(domain, { limit: 10 });
    console.log(`\n✅ ${result.length} backlinks récupérés:`);
    result.slice(0, 5).forEach((link, index) => {
      console.log(`\n--- Backlink ${index + 1} ---`);
      console.log(`De: ${link.url_from || 'N/A'}`);
      console.log(`Vers: ${link.url_to || 'N/A'}`);
      console.log(`Texte d'ancrage: ${link.anchor || 'N/A'}`);
      console.log(`DR source: ${link.domain_rating_source || 'N/A'}`);
    });
    if (result.length > 5) {
      console.log(`\n... et ${result.length - 5} autres backlinks`);
    }
  } catch (error) {
    if (error.message.includes("token is missing the required 'api' scope")) {
      console.error(`❌ Erreur 400: La clé API n'a pas les autorisations nécessaires. Veuillez vérifier vos paramètres Ahrefs.`);
    } else {
      console.error(`❌ Erreur lors de la récupération des backlinks:`, error.message);
    }
  }
}

// Fonction pour afficher les backlinks cassés
async function displayBrokenBacklinks(domain) {
  try {
    console.log(`🔗 Récupération des backlinks cassés pour ${domain}...`);
    const result = await ahrefsAPI.getBrokenBacklinks(domain);
    console.log(`\n✅ ${result.length} backlinks cassés trouvés:`);
    result.slice(0, 5).forEach((link, index) => {
      console.log(`\n--- Backlink cassé ${index + 1} ---`);
      console.log(`De: ${link.url_from || 'N/A'}`);
      console.log(`Vers: ${link.url_to || 'N/A'}`);
      console.log(`Code HTTP: ${link.http_code || 'N/A'}`);
    });
    if (result.length > 5) {
      console.log(`\n... et ${result.length - 5} autres backlinks cassés`);
    }
  } catch (error) {
    if (error.message.includes("token is missing the required 'api' scope")) {
      console.error(`❌ Erreur 400: La clé API n'a pas les autorisations nécessaires. Veuillez vérifier vos paramètres Ahrefs.`);
    } else {
      console.error(`❌ Erreur lors de la récupération des backlinks cassés:`, error.message);
    }
  }
}

// Fonction pour afficher les métriques du domaine
async function displayDomainMetrics(domain) {
  try {
    console.log(`📈 Récupération des métriques pour ${domain}...`);
    const result = await ahrefsAPI.getDomainMetrics(domain);
    console.log("\n=== MÉTRIQUES DU DOMAINE ===");
    console.log(`Domain Rating: ${result.domainRating}`);
    console.log(`Backlinks totaux: ${result.totalBacklinks.toLocaleString()}`);
    console.log(`Domaines référents: ${result.totalReferringDomains.toLocaleString()}`);
    console.log(`Trafic organique estimé: ${result.organicTraffic.toLocaleString()}`);
    console.log(`Mots-clés organiques: ${result.organicKeywords.toLocaleString()}`);
  } catch (error) {
    if (error.message.includes("token is missing the required 'api' scope")) {
      console.error(`❌ Erreur 400: La clé API n'a pas les autorisations nécessaires. Veuillez vérifier vos paramètres Ahrefs.`);
    } else {
      console.error(`❌ Erreur lors de la récupération des métriques:`, error.message);
    }
  }
}

// Fonction pour l'analyse complète du domaine
async function analyzeDomain(domain) {
  try {
    console.log(`🔍 Analyse complète du domaine ${domain}...`);
    const result = await ahrefsAPI.analyzeDomain(domain);
    if (result.success) {
      console.log("\n=== RÉSUMÉ DE L'ANALYSE ===");
      console.log(`Domaine: ${result.domain}`);
      console.log(`Domain Rating: ${result.metrics.domainRating}`);
      console.log(`Backlinks totaux: ${result.metrics.totalBacklinks.toLocaleString()}`);
      console.log(`Domaines référents: ${result.metrics.totalReferringDomains.toLocaleString()}`);
      console.log(`Backlinks cassés: ${result.brokenBacklinksCount}`);
      
      if (result.backlinksSnapshot && result.backlinksSnapshot.length > 0) {
        console.log("\n=== ÉCHANTILLON DE BACKLINKS ===");
        result.backlinksSnapshot.slice(0, 3).forEach((link, index) => {
          console.log(`\n--- Backlink ${index + 1} ---`);
          console.log(`De: ${link.url_from || 'N/A'}`);
          console.log(`Vers: ${link.url_to || 'N/A'}`);
          console.log(`DR source: ${link.domain_rating_source || 'N/A'}`);
        });
      }
    } else {
      console.log(`❌ L'analyse a échoué: ${result.error}`);
    }
  } catch (error) {
    if (error.message.includes("token is missing the required 'api' scope")) {
      console.error(`❌ Erreur 400: La clé API n'a pas les autorisations nécessaires. Veuillez vérifier vos paramètres Ahrefs.`);
    } else {
      console.error(`❌ Erreur lors de l'analyse:`, error.message);
    }
  }
}

// Fonction principale
async function main() {
  console.log("=== Test du module ahrefsAPI ===");

  if (!ahrefsAPI.isConfigValid()) {
    console.error("❌ La clé API Ahrefs n'est pas définie. Veuillez l'ajouter à votre fichier .env");
    return;
  }

  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  const domain = args[1] || "stereolabs.com";

  console.log(`\n🚀 Exécution de la commande: ${command} pour ${domain}\n`);

  switch (command) {
    case 'backlinks':
      await displayBacklinks(domain);
      break;
    case 'broken':
      await displayBrokenBacklinks(domain);
      break;
    case 'metrics':
      await displayDomainMetrics(domain);
      break;
    case 'analyze':
    default:
      await analyzeDomain(domain);
  }
}

main().then(() => {
  console.log("\n✅ Test terminé");
}).catch(error => {
  console.error("\n❌ Erreur globale:", error);
}).finally(() => {
  setTimeout(() => process.exit(0), 500);
});

/**
 * Mode d'emploi:
 * 
 * 1. Test d'analyse complète (par défaut):
 *    node cli-test.js 
 *    node cli-test.js analyze example.com
 * 
 * 2. Récupération des backlinks:
 *    node cli-test.js backlinks example.com
 * 
 * 3. Récupération des backlinks cassés:
 *    node cli-test.js broken example.com
 * 
 * 4. Récupération des métriques du domaine:
 *    node cli-test.js metrics example.com
 */

