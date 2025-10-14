const axios = require('axios');

class GitHubProvider {
  constructor() {
    this.name = 'github';
    this.timeout = parseInt(process.env.DEFAULT_TIMEOUT) || 10000;
  }

  async getLatestVersion(checkUrl) {
    try {
      // Support different GitHub URL formats
      const apiUrl = this.convertToApiUrl(checkUrl);
      
      const response = await axios.get(apiUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'SelfUp/1.0.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const release = response.data;
      
      // Extract version from tag_name (remove 'v' prefix if present)
      let version = release.tag_name;
      if (version.startsWith('v')) {
        version = version.substring(1);
      }

      return {
        version: version,
        changelogUrl: release.html_url,
        releaseDate: release.published_at,
        prerelease: release.prerelease,
        draft: release.draft,
        assets: release.assets?.map(asset => ({
          name: asset.name,
          downloadUrl: asset.browser_download_url,
          size: asset.size
        })) || []
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('GitHub repository or release not found');
      } else if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to GitHub API');
      } else {
        throw new Error(`GitHub API error: ${error.message}`);
      }
    }
  }

  convertToApiUrl(url) {
    // Convert various GitHub URL formats to API URL
    
    // Already an API URL
    if (url.includes('api.github.com')) {
      return url;
    }

    // Extract owner and repo from different URL formats
    let match;
    
    // https://github.com/owner/repo/releases/latest
    match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/releases\/latest)?/);
    if (match) {
      const [, owner, repo] = match;
      return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    }

    // https://github.com/owner/repo
    match = url.match(/github\.com\/([^\/]+)\/([^\/]+)$/);
    if (match) {
      const [, owner, repo] = match;
      return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    }

    throw new Error('Invalid GitHub URL format');
  }

  async getAllReleases(checkUrl, limit = 10) {
    try {
      const apiUrl = this.convertToApiUrl(checkUrl).replace('/latest', '');
      
      const response = await axios.get(`${apiUrl}?per_page=${limit}`, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'SelfUp/1.0.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.data.map(release => ({
        version: release.tag_name.startsWith('v') ? 
                 release.tag_name.substring(1) : 
                 release.tag_name,
        changelogUrl: release.html_url,
        releaseDate: release.published_at,
        prerelease: release.prerelease,
        draft: release.draft
      }));
    } catch (error) {
      throw new Error(`Failed to fetch GitHub releases: ${error.message}`);
    }
  }

  async getRepositoryInfo(checkUrl) {
    try {
      const apiUrl = this.convertToApiUrl(checkUrl)
        .replace('/releases/latest', '')
        .replace('api.github.com/repos/', 'api.github.com/repos/');
      
      const repoUrl = apiUrl.includes('/releases') ? 
        apiUrl.split('/releases')[0] : 
        apiUrl;

      const response = await axios.get(repoUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'SelfUp/1.0.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const repo = response.data;
      return {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        lastUpdate: repo.updated_at,
        homepage: repo.homepage,
        topics: repo.topics || []
      };
    } catch (error) {
      throw new Error(`Failed to fetch repository info: ${error.message}`);
    }
  }

  validateUrl(url) {
    const patterns = [
      /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/,
      /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/releases\/latest\/?$/,
      /^https:\/\/api\.github\.com\/repos\/[^\/]+\/[^\/]+\/releases\/latest$/
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  getExampleUrls() {
    return [
      'https://github.com/Radarr/Radarr',
      'https://github.com/Radarr/Radarr/releases/latest',
      'https://api.github.com/repos/Radarr/Radarr/releases/latest'
    ];
  }
}

module.exports = GitHubProvider;