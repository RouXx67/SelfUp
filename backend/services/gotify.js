const axios = require('axios');

class GotifyService {
  constructor() {
    this.baseUrl = process.env.GOTIFY_URL;
    this.token = process.env.GOTIFY_TOKEN;
    this.enabled = !!(this.baseUrl && this.token);
    
    if (!this.enabled) {
      console.log('⚠️  Gotify not configured - notifications disabled');
    } else {
      console.log('📱 Gotify service initialized');
    }
  }

  async sendNotification(title, message, priority = 5, extras = {}) {
    if (!this.enabled) {
      console.log('📱 Gotify disabled - notification not sent:', title);
      return false;
    }

    try {
      const payload = {
        title: title,
        message: message,
        priority: priority,
        extras: extras
      };

      const response = await axios.post(
        `${this.baseUrl}/message`,
        payload,
        {
          headers: {
            'X-Gotify-Key': this.token,
            'Content-Type': 'application/json'
          },
          timeout: parseInt(process.env.DEFAULT_TIMEOUT) || 10000
        }
      );

      if (response.status === 200) {
        console.log('📱 Gotify notification sent successfully');
        return true;
      } else {
        console.error('❌ Gotify notification failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending Gotify notification:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Cannot connect to Gotify server. Check GOTIFY_URL configuration.');
      } else if (error.response?.status === 401) {
        console.error('❌ Gotify authentication failed. Check GOTIFY_TOKEN configuration.');
      } else if (error.response?.status === 400) {
        console.error('❌ Invalid Gotify request format.');
      }
      
      return false;
    }
  }

  async testConnection() {
    if (!this.enabled) {
      return { success: false, error: 'Gotify not configured' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/version`, {
        timeout: 5000
      });

      if (response.status === 200) {
        return { 
          success: true, 
          version: response.data.version,
          buildDate: response.data.buildDate
        };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
  }

  async sendTestNotification() {
    const title = '🧪 SelfUp Test Notification';
    const message = 'This is a test notification from SelfUp to verify Gotify integration is working correctly.';
    
    const extras = {
      'client::display': {
        'contentType': 'text/markdown'
      },
      test: true,
      timestamp: new Date().toISOString()
    };

    return await this.sendNotification(title, message, 3, extras);
  }

  isEnabled() {
    return this.enabled;
  }

  getConfig() {
    return {
      enabled: this.enabled,
      url: this.baseUrl ? this.baseUrl.replace(/\/+$/, '') : null,
      hasToken: !!this.token
    };
  }
}

module.exports = GotifyService;