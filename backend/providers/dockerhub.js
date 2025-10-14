const axios = require('axios');

class DockerHubProvider {
  constructor() {
    this.name = 'dockerhub';
    this.baseUrl = 'https://hub.docker.com/v2';
    this.timeout = parseInt(process.env.DEFAULT_TIMEOUT) || 10000;
  }

  async getLatestVersion(checkUrl) {
    try {
      const { namespace, repository } = this.parseDockerUrl(checkUrl);
      const tagsUrl = `${this.baseUrl}/repositories/${namespace}/${repository}/tags/?page_size=25&ordering=-last_updated`;
      
      const response = await axios.get(tagsUrl, {
        timeout: this.timeout,
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

      // Find the latest non-latest tag (prefer semantic versions)
      const latestTag = this.findLatestTag(tags);
      
      if (!latestTag) {
        throw new Error('No suitable version tag found');
      }

      return {
        version: latestTag.name,
        changelogUrl: `https://hub.docker.com/r/${namespace}/${repository}/tags`,
        releaseDate: latestTag.last_updated,
        imageSize: latestTag.full_size,
        architecture: latestTag.images?.map(img => img.architecture) || []
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Docker image not found on Docker Hub');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Docker Hub API');
      } else {
        throw new Error(`Docker Hub API error: ${error.message}`);
      }
    }
  }

  parseDockerUrl(url) {
    let namespace, repository;

    // Handle different Docker URL formats
    if (url.includes('hub.docker.com')) {
      // https://hub.docker.com/r/linuxserver/radarr
      // https://hub.docker.com/_/nginx
      const match = url.match(/hub\.docker\.com\/(?:r\/|_\/)([^\/]+)(?:\/([^\/\?]+))?/);
      if (match) {
        if (url.includes('/_/')) {
          // Official image
          namespace = 'library';
          repository = match[1];
        } else {
          // User/org image
          namespace = match[1];
          repository = match[2];
        }
      }
    } else if (url.includes('/')) {
      // Direct format: linuxserver/radarr or nginx
      const parts = url.split('/');
      if (parts.length === 2) {
        namespace = parts[0];
        repository = parts[1];
      } else if (parts.length === 1) {
        namespace = 'library';
        repository = parts[0];
      }
    } else {
      // Single name (official image)
      namespace = 'library';
      repository = url;
    }

    if (!namespace || !repository) {
      throw new Error('Invalid Docker image URL format');
    }

    return { namespace, repository };
  }

  findLatestTag(tags) {
    // Filter out unwanted tags
    const filteredTags = tags.filter(tag => {
      const name = tag.name.toLowerCase();
      return !name.includes('latest') && 
             !name.includes('nightly') && 
             !name.includes('dev') && 
             !name.includes('beta') && 
             !name.includes('alpha') && 
             !name.includes('rc') &&
             !name.includes('preview');
    });

    if (filteredTags.length === 0) {
      // Fallback to latest if no other tags
      return tags.find(tag => tag.name === 'latest');
    }

    // Sort by semantic version if possible
    const semanticTags = filteredTags.filter(tag => 
      /^\d+(\.\d+)*/.test(tag.name)
    );

    if (semanticTags.length > 0) {
      // Sort semantic versions
      semanticTags.sort((a, b) => {
        return this.compareVersions(b.name, a.name);
      });
      return semanticTags[0];
    }

    // Fallback to most recently updated
    return filteredTags[0];
  }

  compareVersions(a, b) {
    const aParts = a.split('.').map(n => parseInt(n) || 0);
    const bParts = b.split('.').map(n => parseInt(n) || 0);
    
    const maxLength = Math.max(aParts.length, bParts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  async getImageInfo(checkUrl) {
    try {
      const { namespace, repository } = this.parseDockerUrl(checkUrl);
      const repoUrl = `${this.baseUrl}/repositories/${namespace}/${repository}/`;
      
      const response = await axios.get(repoUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'SelfUp/1.0.0'
        }
      });

      const repo = response.data;
      return {
        name: repo.name,
        namespace: repo.namespace,
        description: repo.description,
        stars: repo.star_count,
        pulls: repo.pull_count,
        lastUpdated: repo.last_updated,
        isOfficial: repo.is_official,
        isAutomated: repo.is_automated
      };
    } catch (error) {
      throw new Error(`Failed to fetch Docker image info: ${error.message}`);
    }
  }

  validateUrl(url) {
    const patterns = [
      /^https:\/\/hub\.docker\.com\/r\/[^\/]+\/[^\/]+/,
      /^https:\/\/hub\.docker\.com\/_\/[^\/]+/,
      /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/,
      /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  getExampleUrls() {
    return [
      'https://hub.docker.com/r/linuxserver/radarr',
      'https://hub.docker.com/_/nginx',
      'linuxserver/radarr',
      'nginx'
    ];
  }
}

module.exports = DockerHubProvider;