// test-ahrefs-backlinks.js
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

// Fonction pour masquer le token et les IPs
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
  
  // Masquer les mentions du token
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
      url,
      params: { ...params },
      sample: sanitizeData(JSON.stringify(response.data)).substring(0, 200) + "..."
    });
    
    results.summary.v3_working++;
    return true;
  } catch (error) {
    console.error(`❌ ÉCHEC: ${name}`);
    let errorInfo = '';
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      errorInfo = sanitizeData(error.response.data);
    } else {
      console.error(`Erreur: ${error.message}`);
      errorInfo = error.message;
    }
    
    // Stocker l'erreur dans les résultats
    results.failed_endpoints.v3.push({
      name,
      url,
      params: { ...params },
      error: errorInfo
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
      from: params.from,
      params: { ...params, token: '[REDACTED]' },
      sample: sanitizeData(JSON.stringify(response.data)).substring(0, 200) + "..."
    });
    
    results.summary.v2_working++;
    return true;
  } catch (error) {
    console.error(`❌ ÉCHEC: ${name}`);
    let errorInfo = '';
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      errorInfo = sanitizeData(error.response.data);
    } else {
      console.error(`Erreur: ${error.message}`);
      errorInfo = error.message;
    }
    
    // Stocker l'erreur dans les résultats
    results.failed_endpoints.v2.push({
      name,
      from: params.from,
      params: { ...params, token: '[REDACTED]' },
      error: errorInfo
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
    const jsonFileName = `ahrefs_backlinks_test_${timestamp}.json`;
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
  console.log("=== TESTS AHREFS API BACKLINKS ===");
  console.log(`Domaine de test: ${TEST_DOMAIN}`);
  console.log(`Date des tests: ${new Date().toLocaleString()}\n`);
  
  // Liste des endpoints API v3 liés aux backlinks à tester
  const v3Endpoints = [
    // Site Explorer - Vue d'ensemble
    {
      name: "Backlinks Overview",
      url: "/site-explorer/overview",
      params: { target: TEST_DOMAIN, mode: 'domain' }
    },
    
    // Site Explorer - Backlinks
    {
      name: "Backlinks",
      url: "/site-explorer/backlinks",
      params: { target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    
    // Referring Domains
    {
      name: "Referring Domains",
      url: "/site-explorer/referring-domains",
      params: { target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    
    // Broken Backlinks
    {
      name: "Broken Backlinks",
      url: "/site-explorer/broken-backlinks",
      params: { target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    
    // Best By Links
    {
      name: "Best By Links",
      url: "/site-explorer/best-by-links",
      params: { target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    
    // Link Growth
    {
      name: "Link Growth",
      url: "/site-explorer/metrics",
      params: { 
        target: TEST_DOMAIN, 
        mode: 'domain',
        metrics: 'backlinks,referring_domains',
        date_from: '2023-01-01',
        date_to: TODAY
      }
    }
  ];
  
  // Liste des endpoints API v2 liés aux backlinks à tester
  const v2Endpoints = [
    {
      name: "Backlinks",
      params: { from: 'backlinks', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Nouvelles Backlinks",
      params: { from: 'new_backlinks', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Backlinks Perdues",
      params: { from: 'lost_backlinks', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Domaines référents",
      params: { from: 'refdomains', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Nouveaux Domaines Référents",
      params: { from: 'new_refdomains', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Domaines Référents Perdus",
      params: { from: 'lost_refdomains', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Liens brisés",
      params: { from: 'broken_backlinks', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Anchors",
      params: { from: 'anchors', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Pages Avec Backlinks",
      params: { from: 'pages_backlinks', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    },
    {
      name: "Pages Avec Domaines Référents",
      params: { from: 'pages_info_refdomains', target: TEST_DOMAIN, mode: 'domain', limit: 5 }
    }
  ];
  
  // Tester les endpoints v3
  console.log("\n=== TESTS API V3 BACKLINKS ===");
  for (const endpoint of v3Endpoints) {
    await testV3Endpoint(endpoint.name, endpoint.url, endpoint.params);
  }
  
  // Tester les endpoints v2
  console.log("\n=== TESTS API V2 BACKLINKS ===");
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
  
  // Sauvegarder les résultats
  const filePath = await saveResults();
  
  console.log("\n=== RECOMMANDATIONS ===");
  if (results.summary.v3_working === 0 && results.summary.v2_working === 0) {
    console.log("Aucun endpoint n'est accessible. Vérifiez votre token API et votre forfait Ahrefs.");
    console.log("Vous devez peut-être générer un nouveau token avec les bonnes autorisations (scope 'api').");
  } else {
    console.log("Utilisez ces endpoints fonctionnels pour construire votre module de backlinks.");
  }
  
  console.log("\n=== FIN DES TESTS ===");
  return filePath;
}

// Exécuter les tests
runTests().catch(err => {
  console.error("Erreur globale pendant l'exécution des tests:", err);
});
