// cli-test.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Importer le module ahrefsAPI personnalisé
const ahrefsAPI = require('./ahrefsAPIV2');

// Fonction principale
async function main() {
  console.log("=== Test du module ahrefsAPI ===");

  // Vérifier la validité de la configuration
  if (!ahrefsAPI.isConfigValid()) {
    console.error("❌ La clé API Ahrefs n'est pas définie. Veuillez l'ajouter à votre fichier .env");
    return;
  }

  // Traiter les arguments de ligne de commande
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  const domain = args[1] || "example.com";
  
  console.log(`\n🚀 Exécution de la commande: ${command} pour ${domain}\n`);
  
  try {
    let result;

    switch (command) {
      case 'backlinks':
        // Récupération des backlinks
        console.log(`📊 Récupération des backlinks pour ${domain}...`);
        result = await ahrefsAPI.getBacklinks(domain, { limit: 10 });
        
        // Afficher les résultats formatés
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
        break;
        
      case 'broken':
        // Récupération des backlinks cassés
        console.log(`🔗 Récupération des backlinks cassés pour ${domain}...`);
        result = await ahrefsAPI.getBrokenBacklinks(domain);
        
        // Afficher les résultats formatés
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
        break;
        
      case 'metrics':
        // Récupération des métriques du domaine
        console.log(`📈 Récupération des métriques pour ${domain}...`);
        result = await ahrefsAPI.getDomainMetrics(domain);
        
        // Afficher les résultats formatés
        console.log("\n=== MÉTRIQUES DU DOMAINE ===");
        console.log(`Domain Rating: ${result.domainRating}`);
        console.log(`Backlinks totaux: ${result.totalBacklinks.toLocaleString()}`);
        console.log(`Domaines référents: ${result.totalReferringDomains.toLocaleString()}`);
        console.log(`Trafic organique estimé: ${result.organicTraffic.toLocaleString()}`);
        console.log(`Mots-clés organiques: ${result.organicKeywords.toLocaleString()}`);
        break;
        
      case 'analyze':
      default:
        // Analyse complète du domaine
        console.log(`🔍 Analyse complète du domaine ${domain}...`);
        result = await ahrefsAPI.analyzeDomain(domain);
        
        // Afficher les résultats formatés
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
    }
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de la commande ${command}:`, error.message);
  }
}

// Exécuter la fonction principale
main().then(() => {
  console.log("\n✅ Test terminé");
}).catch(error => {
  console.error("\n❌ Erreur globale:", error);
}).finally(() => {
  // Terminer le processus après l'exécution
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

