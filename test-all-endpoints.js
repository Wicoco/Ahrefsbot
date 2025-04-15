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
  v2: { working: [], failed: [] },
  v3: { working: [], failed: [] }
};

// Fonction pour tester un endpoint v3
async function testV3Endpoint(name, url, params) {
  console.log(`\n[V3] Test de l'endpoint: ${name}`);
  try {
    const response = await axios.get(`https://api.ahrefs.com/v3${url}`, {
      params: params,
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      timeout: 10000 // 10 secondes timeout
    });
    
    console.log(`✅ SUCCÈS: ${name}`);
    console.log(`Statut: ${response.status}`);
    
    // Sauvegarder les premiers 500 caractères des données
    const dataSample = JSON.stringify(response.data, null, 2).substring(0, 500);
    console.log(`Aperçu des données: ${dataSample}${dataSample.length >= 500 ? '...' : ''}`);
    
    results.v3.working.push({
      name,
      url,
      params,
      status: response.status,
      dataSample
    });
    
    return true;
  } catch (error) {
    console.error(`❌ ÉCHEC: ${name}`);
    let errorDetails = { message: error.message };
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      console.error(`Données: ${JSON.stringify(error.response.data, null, 2)}`);
      errorDetails = {
        status: error.response.status,
        data: error.response.data
      };
    }
    
    results.v3.failed.push({
      name,
      url,
      params,
      error: errorDetails
    });
    
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
      timeout: 10000 // 10 secondes timeout
    });
    
    console.log(`✅ SUCCÈS: ${name}`);
    console.log(`Statut: ${response.status}`);
    
    // Sauvegarder les premiers 500 caractères des données
    const dataSample = JSON.stringify(response.data, null, 2).substring(0, 500);
    console.log(`Aperçu des données: ${dataSample}${dataSample.length >= 500 ? '...' : ''}`);
    
    results.v2.working.push({
      name,
      params,
      status: response.status,
      dataSample
    });
    
    return true;
  } catch (error) {
    console.error(`❌ ÉCHEC: ${name}`);
    let errorDetails = { message: error.message };
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      console.error(`Données: ${JSON.stringify(error.response.data, null, 2)}`);
      errorDetails = {
        status: error.response.status,
        data: error.response.data
      };
    }
    
    results.v2.failed.push({
      name,
      params,
      error: errorDetails
    });
    
    return false;
  }
}

async function saveResults() {
  const resultsDir = path.join(__dirname, 'results');
  try {
    await fs.mkdir(resultsDir, { recursive: true });
  } catch (err) {
    // Ignore if directory exists
  }
  
  const fileName = `ahrefs_api_test_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(resultsDir, fileName);
  
  await fs.writeFile(filePath, JSON.stringify(results, null, 2));
  console.log(`\nRésultats sauvegardés dans: ${filePath}`);
}

async function runTests() {
  console.log("=== DÉBUT DES TESTS API AHREFS ===");
  console.log(`Domaine de test: ${TEST_DOMAIN}`);
  console.log(`Date: ${TODAY}\n`);
  
  // Liste des endpoints API v3 à tester
  const v3Endpoints = [
    // Compte et informations générales
    {
      name: "Informations du compte",
      url: "/account/info",
      params: {}
    },
    {
      name: "Quota du compte",
      url: "/account/quota",
      params: {}
    },
    
    // Site Explorer - Métriques générales
    {
      name: "Domain Rating",
      url: "/site-explorer/domain-rating",
      params: { target: TEST_DOMAIN, date: TODAY }
    },
    {
      name: "URL Rating",
      url: "/site-explorer/url-rating",
      params: { target: TEST_DOMAIN, date: TODAY }
    },
    {
      name: "Métriques",
      url: "/site-explorer/metrics",
      params: { target: TEST_DOMAIN, mode: 'domain', date: TODAY }
    },
    
    // Site Explorer - Backlinks
    {
      name: "Backlinks",
      url: "/site-explorer/backlinks",
      params: { target: TEST_DOMAIN, mode: 'domain', order_by: 'ahrefs_rank:desc', date: TODAY, limit: 5 }
    },
    {
      name: "Backlinks brisés",
      url: "/site-explorer/broken-backlinks",
      params: { target: TEST_DOMAIN, mode: 'domain', date: TODAY, limit: 5 }
    },
    {
      name: "Nouvelles backlinks",
      url: "/site-explorer/new-backlinks",
      params: { target: TEST_DOMAIN, mode: 'domain', date: TODAY, limit: 5 }
    },
    
    // Site Explorer - Domaines référents
    {
      name: "Domaines référents",
      url: "/site-explorer/referring-domains",
      params: { target: TEST_DOMAIN, mode: 'domain', order_by: 'domain_rating:desc', date: TODAY, limit: 5 }
    },
    {
      name: "Nouveaux domaines référents",
      url: "/site-explorer/new-referring-domains",
      params: { target: TEST_DOMAIN, mode: 'domain', date: TODAY, limit: 5 }
    },
    
    // Site Explorer - Pages
    {
      name: "Meilleures pages par trafic",
      url: "/site-explorer/top-pages",
      params: { target: TEST_DOMAIN, mode: 'domain', order_by: 'traffic:desc', date: TODAY, limit: 5 }
    },
    {
      name: "Pages les plus liées",
      url: "/site-explorer/best-by-links",
      params: { target: TEST_DOMAIN, mode: 'domain', date: TODAY, limit: 5 }
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
  console.log(`API v3 - Endpoints fonctionnels: ${results.v3.working.length}/${v3Endpoints.length}`);
  console.log(`API v2 - Endpoints fonctionnels: ${results.v2.working.length}/${v2Endpoints.length}`);
  
  // Lister les endpoints fonctionnels
  if (results.v3.working.length > 0) {
    console.log("\nEndpoints V3 fonctionnels:");
    results.v3.working.forEach(endpoint => console.log(`- ${endpoint.name} (${endpoint.url})`));
  }
  
  if (results.v2.working.length > 0) {
    console.log("\nEndpoints V2 fonctionnels:");
    results.v2.working.forEach(endpoint => console.log(`- ${endpoint.name} (from=${endpoint.params.from})`));
  }
  
  // Sauvegarder les résultats dans un fichier
  await saveResults();
  
  console.log("\n=== FIN DES TESTS ===");
}

runTests().catch(err => {
  console.error("Erreur globale:", err);
});
