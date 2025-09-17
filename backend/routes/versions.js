const express = require('express');
const GitHubProvider = require('../providers/github');
const DockerHubProvider = require('../providers/dockerhub');
const GenericProvider = require('../providers/generic');
const router = express.Router();

// GET /api/versions/:provider - Récupérer les versions disponibles pour une URL donnée
router.get('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { url, limit = 10 } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL est requise'
      });
    }

    let providerInstance;
    
    // Sélectionner le bon provider
    switch (provider.toLowerCase()) {
      case 'github':
        providerInstance = new GitHubProvider();
        break;
      case 'dockerhub':
        providerInstance = new DockerHubProvider();
        break;
      case 'generic':
        providerInstance = new GenericProvider();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Provider non supporté. Utilisez: github, dockerhub, ou generic'
        });
    }

    // Valider l'URL pour le provider
    if (!providerInstance.validateUrl(url)) {
      return res.status(400).json({
        success: false,
        message: `URL invalide pour le provider ${provider}`
      });
    }

    let versions = [];

    // Récupérer les versions selon le provider
    if (provider.toLowerCase() === 'github') {
      // GitHub a une méthode getAllReleases
      versions = await providerInstance.getAllReleases(url, parseInt(limit));
    } else if (provider.toLowerCase() === 'dockerhub') {
      // Pour Docker Hub, on doit adapter la méthode existante
      versions = await getDockerHubVersions(providerInstance, url, parseInt(limit));
    } else if (provider.toLowerCase() === 'generic') {
      // Pour generic, on ne peut récupérer que la dernière version
      const latestVersion = await providerInstance.getLatestVersion(url);
      versions = [latestVersion];
    }

    // Formater la réponse
    const formattedVersions = versions.map(version => ({
      version: version.version,
      releaseDate: version.releaseDate || version.last_updated,
      changelogUrl: version.changelogUrl,
      prerelease: version.prerelease || false,
      draft: version.draft || false,
      assets: version.assets || []
    }));

    res.json({
      success: true,
      provider: provider,
      url: url,
      versions: formattedVersions,
      total: formattedVersions.length
    });

  } catch (error) {
    console.error(`Erreur lors de la récupération des versions (${req.params.provider}):`, error);
    res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des versions: ${error.message}`
    });
  }
});

// Fonction helper pour récupérer les versions Docker Hub
async function getDockerHubVersions(providerInstance, checkUrl, limit = 10) {
  try {
    const { namespace, repository } = providerInstance.parseDockerUrl(checkUrl);
    const tagsUrl = `${providerInstance.baseUrl}/repositories/${namespace}/${repository}/tags/?page_size=${limit}&ordering=-last_updated`;
    
    const axios = require('axios');
    const response = await axios.get(tagsUrl, {
      timeout: providerInstance.timeout,
      headers: {
        'User-Agent': 'SelfUp/1.0.0'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Docker Hub API returned status ${response.status}`);
    }

    const tags = response.data.results;
    if (!tags || tags.length === 0) {
      throw new Error('No tags found for this Docker image');
    }

    // Filtrer et formater les tags (exclure 'latest' et autres tags non-versionnés)
    return tags
      .filter(tag => {
        const name = tag.name.toLowerCase();
        // Exclure les tags non-versionnés
        return name !== 'latest' && 
               name !== 'stable' && 
               name !== 'main' && 
               name !== 'master' &&
               !name.includes('dev') &&
               !name.includes('beta') &&
               !name.includes('alpha') &&
               !name.includes('rc');
      })
      .map(tag => ({
        version: tag.name,
        releaseDate: tag.last_updated,
        changelogUrl: `https://hub.docker.com/r/${namespace}/${repository}/tags`,
        imageSize: tag.full_size,
        architecture: tag.images?.map(img => img.architecture) || []
      }))
      .slice(0, limit);

  } catch (error) {
    throw new Error(`Failed to fetch Docker Hub versions: ${error.message}`);
  }
}

// GET /api/versions/providers - Obtenir la liste des providers supportés
router.get('/', (req, res) => {
  res.json({
    success: true,
    providers: [
      {
        name: 'github',
        displayName: 'GitHub',
        description: 'Récupère les versions depuis les releases GitHub',
        examples: [
          'https://github.com/owner/repo',
          'https://api.github.com/repos/owner/repo/releases/latest'
        ]
      },
      {
        name: 'dockerhub',
        displayName: 'Docker Hub',
        description: 'Récupère les versions depuis les tags Docker Hub',
        examples: [
          'https://hub.docker.com/r/linuxserver/radarr',
          'linuxserver/radarr'
        ]
      },
      {
        name: 'generic',
        displayName: 'Generic',
        description: 'Récupère la version depuis une URL générique',
        examples: [
          'https://api.example.com/version'
        ]
      }
    ]
  });
});

module.exports = router;