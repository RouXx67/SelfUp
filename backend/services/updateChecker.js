const cron = require('node-cron');
const Database = require('../database/db');
const GotifyService = require('./gotify');
const GitHubProvider = require('../providers/github');
const DockerHubProvider = require('../providers/dockerhub');
const GenericProvider = require('../providers/generic');

class UpdateChecker {
  constructor() {
    this.providers = {
      github: new GitHubProvider(),
      dockerhub: new DockerHubProvider(),
      generic: new GenericProvider()
    };
    this.gotify = new GotifyService();
    this.isRunning = false;
    this.cronJob = null;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Update checker is already running');
      return;
    }

    const interval = process.env.CHECK_INTERVAL_HOURS || 6;
    const cronExpression = `0 */${interval} * * *`; // Every X hours
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      console.log('🔄 Starting scheduled update check...');
      await this.checkAllApps();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;
    console.log(`⏰ Update checker scheduled to run every ${interval} hours`);
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('⏹️  Update checker stopped');
  }

  async checkAllApps() {
    try {
      const apps = await Database.getAllApps();
      const enabledApps = apps.filter(app => app.enabled);
      
      console.log(`🔍 Checking ${enabledApps.length} enabled apps for updates...`);
      
      const results = [];
      for (const app of enabledApps) {
        const result = await this.checkSingleApp(app);
        results.push(result);
        
        // Small delay between checks to avoid rate limiting
        await this.delay(1000);
      }
      
      const updatesFound = results.filter(r => r.hasUpdate).length;
      console.log(`✅ Update check completed. ${updatesFound} updates found.`);
      
      return results;
    } catch (error) {
      console.error('❌ Error in checkAllApps:', error);
      throw error;
    }
  }

  async checkSingleApp(app) {
    const result = {
      appId: app.id,
      appName: app.name,
      currentVersion: app.current_version,
      latestVersion: null,
      hasUpdate: false,
      error: null,
      changelogUrl: null
    };

    try {
      console.log(`🔍 Checking ${app.name}...`);
      
      const provider = this.providers[app.provider] || this.providers.generic;
      const versionInfo = await provider.getLatestVersion(app.check_url);
      
      if (!versionInfo || !versionInfo.version) {
        result.error = 'No version information found';
        return result;
      }

      result.latestVersion = versionInfo.version;
      result.changelogUrl = versionInfo.changelogUrl;

      // Update the latest version in database
      await Database.updateAppVersion(app.id, versionInfo.version);

      // Check if there's an update (and it's not ignored)
      if (app.current_version && 
          versionInfo.version !== app.current_version && 
          versionInfo.version !== app.ignore_version) {
        
        result.hasUpdate = true;
        
        // Create update record
        const updateRecord = await Database.createUpdate({
          app_id: app.id,
          old_version: app.current_version,
          new_version: versionInfo.version,
          changelog_url: versionInfo.changelogUrl
        });

        // Send notification
        await this.sendUpdateNotification(app, versionInfo);
        
        console.log(`🆕 Update found for ${app.name}: ${app.current_version} → ${versionInfo.version}`);
      } else {
        console.log(`✅ ${app.name} is up to date (${versionInfo.version})`);
      }

    } catch (error) {
      console.error(`❌ Error checking ${app.name}:`, error.message);
      result.error = error.message;
    }

    return result;
  }

  async sendUpdateNotification(app, versionInfo) {
    try {
      const title = `🆕 ${app.name} Update Available`;
      const message = `${app.name} ${versionInfo.version} is now available!\n\n` +
                     `Current: ${app.current_version}\n` +
                     `Latest: ${versionInfo.version}\n\n` +
                     (app.update_url ? `Update: ${app.update_url}\n` : '') +
                     (versionInfo.changelogUrl ? `Changelog: ${versionInfo.changelogUrl}` : '');

      const extras = {
        'client::display': {
          'contentType': 'text/markdown'
        },
        app_name: app.name,
        app_id: app.id,
        old_version: app.current_version,
        new_version: versionInfo.version,
        update_url: app.update_url,
        changelog_url: versionInfo.changelogUrl
      };

      await this.gotify.sendNotification(title, message, 5, extras);
      console.log(`📱 Notification sent for ${app.name} update`);
    } catch (error) {
      console.error(`❌ Failed to send notification for ${app.name}:`, error.message);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDate() : null,
      providers: Object.keys(this.providers)
    };
  }
}

module.exports = UpdateChecker;