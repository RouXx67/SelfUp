<<<<<<< Updated upstream
const express = require('express');
const Database = require('../database/db');
const router = express.Router();

// GET /api/apps - Get all apps
router.get('/', async (req, res) => {
  try {
    const apps = await Database.getAllApps();
    
    // Add update status for each app
    const appsWithStatus = apps.map(app => ({
      ...app,
      hasUpdate: app.latest_version && app.latest_version !== app.current_version,
      enabled: Boolean(app.enabled)
    }));
    
    res.json(appsWithStatus);
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// GET /api/apps/:id - Get app by ID
router.get('/:id', async (req, res) => {
  try {
    const app = await Database.getAppById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    res.json({
      ...app,
      hasUpdate: app.latest_version && app.latest_version !== app.current_version,
      enabled: Boolean(app.enabled)
    });
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ error: 'Failed to fetch app' });
  }
});

// POST /api/apps - Create new app
router.post('/', async (req, res) => {
  try {
    const { name, current_version, check_url, update_url, web_url, icon_url, provider } = req.body;
    
    // Validation
    if (!name || !check_url) {
      return res.status(400).json({ error: 'Name and check_url are required' });
    }
    
    const app = {
      name: name.trim(),
      current_version: current_version?.trim() || null,
      check_url: check_url.trim(),
      update_url: update_url?.trim() || null,
      web_url: web_url?.trim() || null,
      icon_url: icon_url?.trim() || null,
      provider: provider || 'github'
    };
    
    const newApp = await Database.createApp(app);
    res.status(201).json(newApp);
  } catch (error) {
    console.error('Error creating app:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'App with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create app' });
    }
  }
});

// PUT /api/apps/:id - Update app
router.put('/:id', async (req, res) => {
  try {
    const { name, current_version, check_url, update_url, web_url, icon_url, provider, enabled } = req.body;
    
    // Check if app exists
    const existingApp = await Database.getAppById(req.params.id);
    if (!existingApp) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Validation
    if (!name || !check_url) {
      return res.status(400).json({ error: 'Name and check_url are required' });
    }
    
    const app = {
      name: name.trim(),
      current_version: current_version?.trim() || null,
      check_url: check_url.trim(),
      update_url: update_url?.trim() || null,
      web_url: web_url?.trim() || null,
      icon_url: icon_url?.trim() || null,
      provider: provider || 'github',
      enabled: enabled !== undefined ? Boolean(enabled) : true
    };
    
    const updatedApp = await Database.updateApp(req.params.id, app);
    res.json(updatedApp);
  } catch (error) {
    console.error('Error updating app:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'App with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update app' });
    }
  }
});

// DELETE /api/apps/:id - Delete app
router.delete('/:id', async (req, res) => {
  try {
    const result = await Database.deleteApp(req.params.id);
    if (!result.deleted) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    res.json({ message: 'App deleted successfully' });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// POST /api/apps/:id/ignore-version - Ignore a specific version
router.post('/:id/ignore-version', async (req, res) => {
  try {
    const { version } = req.body;
    
    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }
    
    const app = await Database.getAppById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Update the app to ignore this version
    const updatedApp = await Database.updateApp(req.params.id, {
      ...app,
      ignore_version: version
    });
    
    res.json({ message: `Version ${version} will be ignored for ${app.name}` });
  } catch (error) {
    console.error('Error ignoring version:', error);
    res.status(500).json({ error: 'Failed to ignore version' });
  }
});

=======
const express = require('express');
const Database = require('../database/db');
const router = express.Router();

// GET /api/apps - Get all apps
router.get('/', async (req, res) => {
  try {
    const apps = await Database.getAllApps();
    
    // Add update status for each app
    const appsWithStatus = apps.map(app => ({
      ...app,
      hasUpdate: app.latest_version && app.latest_version !== app.current_version,
      enabled: Boolean(app.enabled)
    }));
    
    res.json(appsWithStatus);
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// GET /api/apps/:id - Get app by ID
router.get('/:id', async (req, res) => {
  try {
    const app = await Database.getAppById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    res.json({
      ...app,
      hasUpdate: app.latest_version && app.latest_version !== app.current_version,
      enabled: Boolean(app.enabled)
    });
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ error: 'Failed to fetch app' });
  }
});

// POST /api/apps - Create new app
router.post('/', async (req, res) => {
  try {
    const { name, current_version, check_url, update_url, web_url, icon_url, provider } = req.body;
    
    // Validation
    if (!name || !check_url) {
      return res.status(400).json({ error: 'Name and check_url are required' });
    }
    
    const app = {
      name: name.trim(),
      current_version: current_version?.trim() || null,
      check_url: check_url.trim(),
      update_url: update_url?.trim() || null,
      web_url: web_url?.trim() || null,
      icon_url: icon_url?.trim() || null,
      provider: provider || 'github'
    };
    
    const newApp = await Database.createApp(app);
    res.status(201).json(newApp);
  } catch (error) {
    console.error('Error creating app:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'App with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create app' });
    }
  }
});

// PUT /api/apps/:id - Update app
router.put('/:id', async (req, res) => {
  try {
    const { name, current_version, check_url, update_url, web_url, icon_url, provider, enabled } = req.body;
    
    // Check if app exists
    const existingApp = await Database.getAppById(req.params.id);
    if (!existingApp) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Validation
    if (!name || !check_url) {
      return res.status(400).json({ error: 'Name and check_url are required' });
    }
    
    const app = {
      name: name.trim(),
      current_version: current_version?.trim() || null,
      check_url: check_url.trim(),
      update_url: update_url?.trim() || null,
      web_url: web_url?.trim() || null,
      icon_url: icon_url?.trim() || null,
      provider: provider || 'github',
      enabled: enabled !== undefined ? Boolean(enabled) : true
    };
    
    const updatedApp = await Database.updateApp(req.params.id, app);
    res.json(updatedApp);
  } catch (error) {
    console.error('Error updating app:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'App with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update app' });
    }
  }
});

// DELETE /api/apps/:id - Delete app
router.delete('/:id', async (req, res) => {
  try {
    const result = await Database.deleteApp(req.params.id);
    if (!result.deleted) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    res.json({ message: 'App deleted successfully' });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// POST /api/apps/:id/ignore-version - Ignore a specific version
router.post('/:id/ignore-version', async (req, res) => {
  try {
    const { version } = req.body;
    
    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }
    
    const app = await Database.getAppById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Update the app to ignore this version
    const updatedApp = await Database.updateApp(req.params.id, {
      ...app,
      ignore_version: version
    });
    
    res.json({ message: `Version ${version} will be ignored for ${app.name}` });
  } catch (error) {
    console.error('Error ignoring version:', error);
    res.status(500).json({ error: 'Failed to ignore version' });
  }
});

// POST /api/apps/:id/mark-updated - Mark app as updated
router.post('/:id/mark-updated', async (req, res) => {
  try {
    const app = await Database.getAppById(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Update current_version to match latest_version
    const updatedApp = await Database.updateApp(req.params.id, {
      ...app,
      current_version: app.latest_version || app.current_version
    });
    
    res.json({ 
      message: `${app.name} marked as updated`,
      app: {
        ...updatedApp,
        hasUpdate: false,
        enabled: Boolean(updatedApp.enabled)
      }
    });
  } catch (error) {
    console.error('Error marking app as updated:', error);
    res.status(500).json({ error: 'Failed to mark app as updated' });
  }
});

<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
module.exports = router;