// test-all-endpoints.js
require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const API_KEY = process.env.AHREFS_API_KEY;
const TEST_DOMAIN = 'example.com';
const TODAY = new Date().toISOString().split('T')[0];

// Résultats
const results = {
  date: new Date().toISOString(),
  domain_tested: TEST_DOMAIN,
  summary: {
    v3_working: 0,
    v3_failed: 0,
    v2_working: 0,
    v2_failed: 0
  },
  working_endpoints: {
    v3: [],
    v2: []
  },
  failed_endpoints: {
    v3: [],
    v2: []
  }
};

// Fonction pour masquer le token dans les données
function sanitizeData(data) {
  if (!data) return data;
  
  let text = typeof data === 'string' ? data : JSON.stringify(data);
  
  // Masquer le token s'il est présent
  if (API_KEY && API_KEY.length > 5) {
    const tokenPattern = new RegExp(API_KEY.substring(0, 10) + '[^"\\s]*', 'g');
    text = text.replace(tokenPattern, '[REDACTED]');
    text = text.replace(/"token"\s*:\s*"[^"]*"/g, '"token": "[REDACTED]"');
  }
  
  // Masquer les adresses IP
  text = text.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]');
  text = text.replace(/"ip"\s*:\s*"[^"]*"/g, '"ip": "[REDACTED]"');
  
  // Masquer le token en minuscules/majuscules aussi
  text = text.replace(/token\s+is\s+[^"]+/gi, 'token is [REDACTED]');
  
  return typeof data === 'string' ? text : JSON.parse(text);
}

// Fonction pour tester un endpoint v3
async function testV3Endpoint(name, url, params) {
  console.log(`\n[V3] Test de l'endpoint: ${name}`);
  try {
    const response = await axios.get(`https://api.ahrefs.com/v3${url}`, {
      params: params,
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      timeout: 15000 // 15 secondes timeout
    });
    
    console.log(`✅ SUCCÈS: ${name}`);
    
    // Stocker l'endpoint fonctionnel dans les résultats
    results.working_endpoints.v3.push({
      name,
      url
    });
    
    results.summary.v3_working++;
    return true;
  } catch (error) {
    console.error(`❌ ÉCHEC: ${name}`);
    let errorInfo = '';
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      errorInfo = JSON.stringify(sanitizeData(error.response.data));
    } else {
      console.error(`Erreur: ${error.message}`);
      errorInfo = error.message;
    }
    
    // Stocker l'erreur dans les résultats
    results.failed_endpoints.v3.push({
      name,
      url,
      error: sanitizeData(errorInfo)
    });
    
    results.summary.v3_failed++;
    return false;
  }
}

// Fonction pour tester un endpoint v2
async function testV2Endpoint(name, params) {
  console.log(`\n[V2] Test de l'endpoint: ${name}`);
  try {
    const finalParams = {
      ...params,
      token: API_KEY,
      output: 'json'
    };
    
    const response = await axios.get('https://apiv2.ahrefs.com', {
      params: finalParams,
      timeout: 15000 // 15 secondes timeout
    });
    
    console.log(`✅ SUCCÈS: ${name}`);
    
    // Stocker l'endpoint fonctionnel dans les résultats
    results.working_endpoints.v2.push({
      name,
      from: params.from
    });
    
    results.summary.v2_working++;
    return true;
  } catch (error) {
    console.error(`❌ ÉCHEC: ${name}`);
    let errorInfo = '';
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      errorInfo = JSON.stringify(sanitizeData(error.response.data));
    } else if (error.message) {
      console.error(`Erreur: ${error.message}`);
      errorInfo = error.message;
    }
    
    // Si la réponse est un objet avec une propriété error
    if (typeof error.response?.data === 'object' && error.response.data.error) {
      errorInfo = sanitizeData(error.response.data.error);
    }
    
    // Stocker l'erreur dans les résultats
    results.failed_endpoints.v2.push({
      name,
      from: params.from,
      error: sanitizeData(errorInfo)
    });
    
    results.summary.v2_failed++;
    return false;
  }
}

// Sauvegarde des résultats dans un fichier
async function saveResults() {
  try {
    // Créer le dossier results s'il n'existe pas
    const resultsDir = path.join(__dirname, 'results');
    await fs.mkdir(resultsDir, { recursive: true });
    
    // Nom de fichier basé sur la date actuelle
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFileName = `ahrefs_api_report_${timestamp}.json`;
    const jsonFilePath = path.join(resultsDir, jsonFileName);
    
    // Sauvegarder en JSON
    await fs.writeFile(jsonFilePath, JSON.stringify(results, null, 2));
    console.log(`\nRésultats sauvegardés dans: ${jsonFilePath}`);
    
    return jsonFilePath;
  } catch (err) {
    console.error("Erreur lors de la sauvegarde des résultats:", err);
  }
}

// Fonction principale qui exécute tous les tests
async function runTests() {
  console.log("=== DÉBUT DES TESTS API AHREFS ===");
  console.log(`Domaine de test: ${TEST_DOMAIN}`);
  console.log(`Date des tests: ${new Date().toLocaleString()}\n`);
  
  // Liste des endpoints API v3 à tester
  const v3Endpoints = [
    // Endpoints publics (sans l'endpoint des IPs)
    {
      name: "Limites et usage",
      url: "/account/subscription",
      params: {}
    },
    
    // Site Explorer - Vue d'ensemble
    {
      name: "Backlinks Overview",
      url: "/site-explorer/overview",
      params: { target: TEST_DOMAIN, mode: 'domain' }
    },
    {
      name: "Organic Search",
      url: "/site-explorer/organic-search",
      params: { target: TEST_DOMAIN, mode: 'domain' }
    },
    
    // Site Explorer - Backlinks
    {
      name: "Backlinks",
      url: "/site-explorer/backlinks",
      params: { target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    
    // Site Explorer - Keywords
    {
      name: "Mots-clés organiques",
      url: "/site-explorer/organic-keywords",
      params: { target: TEST_DOMAIN, mode: 'domain', select: 'keyword,position,volume', limit: 5 }
    },
    
    // Site Explorer - Contenu
    {
      name: "Contenu Top",
      url: "/site-explorer/top-content",
      params: { target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    
    // Site Explorer - Pages
    {
      name: "Pages les plus liées",
      url: "/site-explorer/best-by-links",
      params: { target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    }
  ];
  
  // Liste des endpoints API v2 à tester
  const v2Endpoints = [
    {
      name: "Backlinks",
      params: { from: 'backlinks', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Domaines référents",
      params: { from: 'refdomains', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Liens brisés",
      params: { from: 'broken_backlinks', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Pages liées",
      params: { from: 'ahrefs_rank', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Anchors",
      params: { from: 'anchors', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Pages entrants",
      params: { from: 'pages', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Domaines liés",
      params: { from: 'linked_domains', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    }
  ];
  
  // Tester les endpoints v3
  console.log("\n=== TESTS API V3 ===");
  for (const endpoint of v3Endpoints) {
    await testV3Endpoint(endpoint.name, endpoint.url, endpoint.params);
  }
  
  // Tester les endpoints v2
  console.log("\n=== TESTS API V2 ===");
  for (const endpoint of v2Endpoints) {
    await testV2Endpoint(endpoint.name, endpoint.params);
  }
  
  // Résumé des résultats
  console.log("\n=== RÉSUMÉ DES TESTS ===");
  console.log(`API v3 - Endpoints fonctionnels: ${results.summary.v3_working}/${v3Endpoints.length}`);
  console.log(`API v2 - Endpoints fonctionnels: ${results.summary.v2_working}/${v2Endpoints.length}`);
  
  // Lister les endpoints fonctionnels
  if (results.summary.v3_working > 0) {
    console.log("\nEndpoints V3 fonctionnels:");
    results.working_endpoints.v3.forEach(endpoint => {
      console.log(`- ${endpoint.name} (${endpoint.url})`);
    });
  }
  
  if (results.summary.v2_working > 0) {
    console.log("\nEndpoints V2 fonctionnels:");
    results.working_endpoints.v2.forEach(endpoint => {
      console.log(`- ${endpoint.name} (from=${endpoint.from})`);
    });
  }
  
  // Analyse des erreurs les plus courantes
  console.log("\nTypes d'erreurs rencontrés:");
  const errorMessages = new Set();
  
  [...results.failed_endpoints.v3, ...results.failed_endpoints.v2].forEach(endpoint => {
    let error = endpoint.error;
    if (error) errorMessages.add(error);
  });
  
  Array.from(errorMessages).forEach(message => {
    console.log(`- ${message}`);
  });
  
  // Sauvegarder les résultats
  const filePath = await saveResults();
  
  console.log("\n=== RECOMMANDATIONS ===");
  if (results.summary.v3_working === 0 && results.summary.v2_working === 0) {
    console.log("Aucun endpoint n'est accessible. Vérifiez votre token API et votre forfait Ahrefs.");
    console.log("Vous devez peut-être générer un nouveau token avec les bonnes autorisations.");
  } else {
    console.log("Utilisez ces endpoints fonctionnels pour construire votre application.");
  }
  
  console.log("\n=== FIN DES TESTS ===");
  return filePath;
}

// Exécuter les tests
runTests().catch(err => {
  console.error("Erreur globale pendant l'exécution des tests:", err);
});
