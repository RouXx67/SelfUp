const axios = require('axios');
const cheerio = require('cheerio');

class GenericProvider {
  constructor() {
    this.name = 'generic';
    this.timeout = parseInt(process.env.DEFAULT_TIMEOUT) || 10000;
  }

  async getLatestVersion(checkUrl) {
    try {
      // Try different approaches based on URL
      if (this.isJsonApi(checkUrl)) {
        return await this.getVersionFromJson(checkUrl);
      } else if (this.isHtmlPage(checkUrl)) {
        return await this.getVersionFromHtml(checkUrl);
      } else {
        throw new Error('Unsupported URL format for generic provider');
      }
    } catch (error) {
      throw new Error(`Generic provider error: ${error.message}`);
    }
  }

  async getVersionFromJson(url) {
    const response = await axios.get(url, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'SelfUp/1.0.0',
        'Accept': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = response.data;
    
    // Try common JSON patterns for version information
    let version = null;
    let changelogUrl = null;

    // Common version field names
    const versionFields = ['version', 'tag_name', 'name', 'latest', 'current'];
    for (const field of versionFields) {
      if (data[field]) {
        version = data[field];
        if (version.startsWith('v')) {
          version = version.substring(1);
        }
        break;
      }
    }

    // Common changelog field names
    const changelogFields = ['html_url', 'changelog_url', 'release_url', 'url'];
    for (const field of changelogFields) {
      if (data[field]) {
        changelogUrl = data[field];
        break;
      }
    }

    if (!version) {
      throw new Error('No version information found in JSON response');
    }

    return {
      version: version,
      changelogUrl: changelogUrl,
      releaseDate: data.published_at || data.created_at || data.date,
      raw: data
    };
  }

  async getVersionFromHtml(url) {
    const response = await axios.get(url, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'SelfUp/1.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Page returned status ${response.status}`);
    }

    const $ = cheerio.load(response.data);
    let version = null;
    let changelogUrl = null;

    // Try different selectors to find version information
    const versionSelectors = [
      '.version',
      '.latest-version',
      '.current-version',
      '[data-version]',
      '.tag-name',
      '.release-version',
      'h1, h2, h3',
      '.badge',
      '.label'
    ];

    for (const selector of versionSelectors) {
      const element = $(selector).first();
      if (element.length) {
        let text = element.text().trim();
        
        // Extract version pattern from text
        const versionMatch = text.match(/v?(\d+(?:\.\d+)*(?:\.\d+)*(?:-[\w\d]+)?)/);
        if (versionMatch) {
          version = versionMatch[1];
          break;
        }
      }
    }

    // Look for changelog links
    const changelogSelectors = [
      'a[href*="changelog"]',
      'a[href*="release"]',
      'a[href*="changes"]',
      'a[href*="history"]'
    ];

    for (const selector of changelogSelectors) {
      const link = $(selector).first();
      if (link.length) {
        changelogUrl = link.attr('href');
        if (changelogUrl && !changelogUrl.startsWith('http')) {
          // Convert relative URL to absolute
          const baseUrl = new URL(url);
          changelogUrl = new URL(changelogUrl, baseUrl).href;
        }
        break;
      }
    }

    if (!version) {
      throw new Error('No version information found on the page');
    }

    return {
      version: version,
      changelogUrl: changelogUrl,
      source: 'html'
    };
  }

  isJsonApi(url) {
    return url.includes('/api/') || 
           url.includes('.json') || 
           url.includes('api.') ||
           url.includes('/v1/') ||
           url.includes('/v2/');
  }

  isHtmlPage(url) {
    return url.startsWith('http') && !this.isJsonApi(url);
  }

  async testUrl(url) {
    try {
      const result = await this.getLatestVersion(url);
      return {
        success: true,
        version: result.version,
        changelogUrl: result.changelogUrl,
        method: result.source || 'json'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  getExampleUrls() {
    return [
      'https://api.example.com/version',
      'https://example.com/releases.json',
      'https://example.com/releases',
      'https://example.com/changelog'
    ];
  }

  getHelp() {
    return {
      description: 'Generic provider for custom APIs and web pages',
      jsonSupport: 'Supports JSON APIs with common version fields (version, tag_name, name, latest)',
      htmlSupport: 'Supports HTML pages with version information in common selectors',
      examples: this.getExampleUrls()
    };
  }
}

module.exports = GenericProvider;