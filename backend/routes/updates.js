const express = require('express');
const Database = require('../database/db');
const UpdateChecker = require('../services/updateChecker');
const router = express.Router();

// GET /api/updates - Get recent updates
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const updates = await Database.getRecentUpdates(limit);
    res.json(updates);
  } catch (error) {
    console.error('Error fetching updates:', error);
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
});

// POST /api/updates/check - Manual check for updates
router.post('/check', async (req, res) => {
  try {
    const { appId } = req.body;
    const updateChecker = new UpdateChecker();
    
    if (appId) {
      // Check specific app
      const app = await Database.getAppById(appId);
      if (!app) {
        return res.status(404).json({ error: 'App not found' });
      }
      
      const result = await updateChecker.checkSingleApp(app);
      res.json({
        message: `Check completed for ${app.name}`,
        result: result
      });
    } else {
      // Check all apps
      const results = await updateChecker.checkAllApps();
      res.json({
        message: 'Check completed for all apps',
        results: results
      });
    }
  } catch (error) {
    console.error('Error checking updates:', error);
    res.status(500).json({ error: 'Failed to check updates' });
  }
});

// POST /api/updates/check-all - Force check all apps
router.post('/check-all', async (req, res) => {
  try {
    const updateChecker = new UpdateChecker();
    const results = await updateChecker.checkAllApps();
    
    const summary = {
      total: results.length,
      updates_found: results.filter(r => r.hasUpdate).length,
      errors: results.filter(r => r.error).length
    };
    
    res.json({
      message: 'Bulk check completed',
      summary: summary,
      results: results
    });
  } catch (error) {
    console.error('Error in bulk check:', error);
    res.status(500).json({ error: 'Failed to perform bulk check' });
  }
});

// GET /api/updates/stats - Get update statistics
router.get('/stats', async (req, res) => {
  try {
    const apps = await Database.getAllApps();
    const recentUpdates = await Database.getRecentUpdates(50);
    
    const stats = {
      total_apps: apps.length,
      enabled_apps: apps.filter(app => app.enabled).length,
      apps_with_updates: apps.filter(app => 
        app.latest_version && 
        app.latest_version !== app.current_version &&
        app.latest_version !== app.ignore_version
      ).length,
      recent_updates: recentUpdates.length,
      last_check: apps.reduce((latest, app) => {
        const appDate = new Date(app.updated_at);
        return appDate > latest ? appDate : latest;
      }, new Date(0))
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/updates/:id/mark-notified - Mark update as notified
router.post('/:id/mark-notified', async (req, res) => {
  try {
    const result = await Database.markUpdateNotified(req.params.id);
    if (!result.updated) {
      return res.status(404).json({ error: 'Update not found' });
    }
    
    res.json({ message: 'Update marked as notified' });
  } catch (error) {
    console.error('Error marking update as notified:', error);
    res.status(500).json({ error: 'Failed to mark update as notified' });
  }
});

module.exports = router;