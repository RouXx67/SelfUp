const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('../database/db');
const router = express.Router();

// Charger les presets depuis le fichier JSON
const loadPresets = () => {
  try {
    const presetsPath = path.join(__dirname, '../data/presets.json');
    const presetsData = fs.readFileSync(presetsPath, 'utf8');
    return JSON.parse(presetsData);
  } catch (error) {
    console.error('Erreur lors du chargement des presets:', error);
    return { presets: [] };
  }
};

// GET /api/presets - Obtenir tous les presets
router.get('/', (req, res) => {
  try {
    const { category, tags } = req.query;
    const presetsData = loadPresets();
    let presets = presetsData.presets;

    // Filtrer par catégorie si spécifiée
    if (category) {
      presets = presets.filter(preset => preset.category === category);
    }

    // Filtrer par tags si spécifiés
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
      presets = presets.filter(preset => 
        preset.tags && preset.tags.some(tag => 
          tagList.includes(tag.toLowerCase())
        )
      );
    }

    res.json({
      success: true,
      presets: presets,
      total: presets.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des presets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des presets'
    });
  }
});

// GET /api/presets/categories - Obtenir toutes les catégories
router.get('/categories', (req, res) => {
  try {
    const presetsData = loadPresets();
    const categories = [...new Set(presetsData.presets.map(preset => preset.category))];
    
    res.json({
      success: true,
      categories: categories.sort()
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories'
    });
  }
});

// GET /api/presets/:id - Obtenir un preset spécifique
router.get('/:id', (req, res) => {
  try {
    const presetsData = loadPresets();
    const preset = presetsData.presets.find(p => p.id === req.params.id);
    
    if (!preset) {
      return res.status(404).json({
        success: false,
        message: 'Preset non trouvé'
      });
    }

    res.json({
      success: true,
      preset: preset
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du preset:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du preset'
    });
  }
});

// POST /api/presets/:id/apply - Appliquer un preset (créer une application)
router.post('/:id/apply', async (req, res) => {
  try {
    const presetsData = loadPresets();
    const preset = presetsData.presets.find(p => p.id === req.params.id);
    
    if (!preset) {
      return res.status(404).json({
        success: false,
        message: 'Preset non trouvé'
      });
    }

    const { customName, customUrl, customVersion } = req.body;

    // Créer l'application basée sur le preset
    const appData = {
      name: customName || preset.name,
      current_version: customVersion || 'unknown',
      check_url: preset.check_url,
      update_url: preset.web_url,
      web_url: customUrl || preset.web_url,
      icon_url: preset.icon_url,
      provider: preset.provider || 'github'
    };

    // Vérifier si une application avec ce nom existe déjà
    const existingApps = await Database.getAllApps();
    const existingApp = existingApps.find(app => 
      app.name.toLowerCase() === appData.name.toLowerCase()
    );

    if (existingApp) {
      return res.status(409).json({
        success: false,
        message: `Une application nommée "${appData.name}" existe déjà`
      });
    }

    // Créer l'application
    const newApp = await Database.createApp(appData);

    res.json({
      success: true,
      message: `Application "${appData.name}" créée avec succès`,
      app: {
        ...newApp,
        hasUpdate: false,
        enabled: true
      },
      preset: preset
    });

  } catch (error) {
    console.error('Erreur lors de l\'application du preset:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'application du preset: ' + error.message
    });
  }
});

// GET /api/presets/search - Rechercher dans les presets
router.get('/search/:query', (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const presetsData = loadPresets();
    
    const results = presetsData.presets.filter(preset => 
      preset.name.toLowerCase().includes(query) ||
      preset.description.toLowerCase().includes(query) ||
      (preset.tags && preset.tags.some(tag => tag.toLowerCase().includes(query)))
    );

    res.json({
      success: true,
      results: results,
      total: results.length,
      query: req.params.query
    });
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
});

module.exports = router;