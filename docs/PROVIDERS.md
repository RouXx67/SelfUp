# Guide des Providers SelfUp

Ce guide explique comment créer et utiliser les providers dans SelfUp pour supporter de nouveaux services et APIs.

## 📋 Providers disponibles

### GitHub Provider
- **Utilisation** : Repositories GitHub avec releases
- **Format URL** : `https://github.com/owner/repo` ou `https://api.github.com/repos/owner/repo/releases/latest`
- **Exemples** :
  - `https://github.com/Radarr/Radarr`
  - `https://github.com/linuxserver/docker-radarr`

### Docker Hub Provider
- **Utilisation** : Images Docker Hub
- **Format URL** : `namespace/repository` ou `https://hub.docker.com/r/namespace/repository`
- **Exemples** :
  - `linuxserver/radarr`
  - `nginx`
  - `https://hub.docker.com/r/linuxserver/sonarr`

### Generic Provider
- **Utilisation** : APIs personnalisées ou pages web
- **Format URL** : URL HTTP/HTTPS vers JSON ou HTML
- **Exemples** :
  - `https://api.example.com/version`
  - `https://example.com/releases.json`

## 🔧 Créer un nouveau provider

### 1. Structure de base

Créez un fichier dans `backend/providers/monprovider.js` :

```javascript
const axios = require('axios');

class MonProvider {
  constructor() {
    this.name = 'monprovider';
    this.timeout = parseInt(process.env.DEFAULT_TIMEOUT) || 10000;
  }

  async getLatestVersion(checkUrl) {
    try {
      // Votre logique de récupération de version
      const response = await axios.get(checkUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'SelfUp/1.0.0'
        }
      });

      return {
        version: '1.2.3',                    // Version (obligatoire)
        changelogUrl: 'https://...',         // URL du changelog (optionnel)
        releaseDate: '2024-01-01',          // Date de release (optionnel)
        // Autres métadonnées spécifiques...
      };
    } catch (error) {
      throw new Error(`Erreur ${this.name}: ${error.message}`);
    }
  }

  validateUrl(url) {
    // Validation de l'URL
    try {
      new URL(url);
      return url.includes('monservice.com');
    } catch {
      return false;
    }
  }

  getExampleUrls() {
    return [
      'https://api.monservice.com/version',
      'https://monservice.com/releases'
    ];
  }
}

module.exports = MonProvider;
```

### 2. Enregistrer le provider

Ajoutez votre provider dans `backend/services/updateChecker.js` :

```javascript
const MonProvider = require('../providers/monprovider');

class UpdateChecker {
  constructor() {
    this.providers = {
      github: new GitHubProvider(),
      dockerhub: new DockerHubProvider(),
      generic: new GenericProvider(),
      monprovider: new MonProvider()  // Ajoutez ici
    };
    // ...
  }
}
```

### 3. Ajouter au frontend

Ajoutez votre provider dans `frontend/src/pages/AddApp.jsx` :

```javascript
const providers = [
  { value: 'github', label: 'GitHub Releases', example: 'https://github.com/owner/repo' },
  { value: 'dockerhub', label: 'Docker Hub', example: 'namespace/repository' },
  { value: 'generic', label: 'API/Web générique', example: 'https://api.example.com/version' },
  { value: 'monprovider', label: 'Mon Service', example: 'https://api.monservice.com/version' }
];
```

## 📝 Exemples de providers

### Provider pour Proxmox

```javascript
class ProxmoxProvider {
  constructor() {
    this.name = 'proxmox';
  }

  async getLatestVersion(checkUrl) {
    // Proxmox utilise une API spécifique
    const response = await axios.get('https://www.proxmox.com/en/downloads/category/iso-images-pve');
    
    // Parser la page HTML pour extraire la version
    const $ = cheerio.load(response.data);
    const versionMatch = $('.download-link').first().text().match(/(\d+\.\d+)/);
    
    if (!versionMatch) {
      throw new Error('Version Proxmox non trouvée');
    }

    return {
      version: versionMatch[1],
      changelogUrl: 'https://www.proxmox.com/en/proxmox-ve/releases',
      releaseDate: new Date().toISOString()
    };
  }

  validateUrl(url) {
    return url.includes('proxmox') || url === 'proxmox';
  }
}
```

### Provider pour Portainer

```javascript
class PortainerProvider {
  constructor() {
    this.name = 'portainer';
  }

  async getLatestVersion(checkUrl) {
    // Utilise l'API GitHub de Portainer
    const response = await axios.get('https://api.github.com/repos/portainer/portainer/releases/latest');
    
    const release = response.data;
    let version = release.tag_name;
    
    // Nettoyer la version (enlever le préfixe si présent)
    if (version.startsWith('v')) {
      version = version.substring(1);
    }

    return {
      version: version,
      changelogUrl: release.html_url,
      releaseDate: release.published_at,
      assets: release.assets.map(asset => ({
        name: asset.name,
        downloadUrl: asset.browser_download_url
      }))
    };
  }

  validateUrl(url) {
    return url.includes('portainer') || url === 'portainer';
  }
}
```

### Provider pour Tteck Scripts

```javascript
class TteckProvider {
  constructor() {
    this.name = 'tteck';
  }

  async getLatestVersion(checkUrl) {
    // Tteck utilise GitHub pour ses scripts
    const response = await axios.get('https://api.github.com/repos/tteck/Proxmox/commits/main');
    
    const commit = response.data;
    const shortSha = commit.sha.substring(0, 7);
    const commitDate = commit.commit.author.date;

    return {
      version: shortSha,
      changelogUrl: `https://github.com/tteck/Proxmox/commit/${commit.sha}`,
      releaseDate: commitDate,
      message: commit.commit.message
    };
  }

  validateUrl(url) {
    return url.includes('tteck') || url === 'tteck-scripts';
  }
}
```

## 🧪 Tester un provider

### Test unitaire

Créez un fichier de test `test-provider.js` :

```javascript
const MonProvider = require('./backend/providers/monprovider');

async function testProvider() {
  const provider = new MonProvider();
  
  try {
    const result = await provider.getLatestVersion('https://api.monservice.com/version');
    console.log('✅ Provider test réussi:', result);
  } catch (error) {
    console.error('❌ Provider test échoué:', error.message);
  }
}

testProvider();
```

### Test via l'API

```bash
# Ajouter une app avec votre provider
curl -X POST http://localhost:3001/api/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test App",
    "provider": "monprovider",
    "check_url": "https://api.monservice.com/version"
  }'

# Tester la vérification
curl -X POST http://localhost:3001/api/updates/check \
  -H "Content-Type: application/json" \
  -d '{"appId": 1}'
```

## 🔍 Bonnes pratiques

### Gestion des erreurs
```javascript
async getLatestVersion(checkUrl) {
  try {
    const response = await axios.get(checkUrl, { timeout: this.timeout });
    // ...
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Service non trouvé');
    } else if (error.response?.status === 429) {
      throw new Error('Limite de taux dépassée');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Impossible de se connecter au service');
    } else {
      throw new Error(`Erreur API: ${error.message}`);
    }
  }
}
```

### Headers appropriés
```javascript
const response = await axios.get(checkUrl, {
  timeout: this.timeout,
  headers: {
    'User-Agent': 'SelfUp/1.0.0',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  }
});
```

### Validation robuste
```javascript
validateUrl(url) {
  const patterns = [
    /^https:\/\/api\.monservice\.com\/.*$/,
    /^https:\/\/monservice\.com\/releases$/,
    /^monservice-app$/
  ];
  
  return patterns.some(pattern => pattern.test(url));
}
```

### Parsing sécurisé
```javascript
// Pour JSON
const data = response.data;
if (!data || typeof data !== 'object') {
  throw new Error('Réponse JSON invalide');
}

const version = data.version || data.tag_name || data.latest;
if (!version) {
  throw new Error('Aucune information de version trouvée');
}

// Pour HTML avec cheerio
const $ = cheerio.load(response.data);
const versionElement = $('.version').first();
if (!versionElement.length) {
  throw new Error('Élément version non trouvé');
}
```

## 📚 Ressources utiles

- [Axios Documentation](https://axios-http.com/docs/intro)
- [Cheerio Documentation](https://cheerio.js.org/) (pour parser HTML)
- [Node.js URL API](https://nodejs.org/api/url.html)
- [Regex101](https://regex101.com/) (pour tester les expressions régulières)

## 🤝 Contribuer

Si vous créez un provider utile, n'hésitez pas à :
1. Créer une Pull Request
2. Ajouter des tests
3. Documenter les URLs supportées
4. Fournir des exemples d'utilisation

Les providers les plus demandés :
- [ ] Proxmox VE
- [ ] Portainer
- [ ] Tteck Scripts
- [ ] Home Assistant
- [ ] Nextcloud
- [ ] Jellyfin
- [ ] Plex