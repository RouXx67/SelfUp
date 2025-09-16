const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    const dbDir = path.dirname(process.env.DB_PATH || './data/selfup.db');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(process.env.DB_PATH || './data/selfup.db', (err) => {
      if (err) {
        console.error('Error opening database:', err);
        return;
      }
      console.log('📁 Connected to SQLite database');
      this.createTables();
    });
  }

  createTables() {
    const createAppsTable = `
      CREATE TABLE IF NOT EXISTS apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        current_version TEXT,
        latest_version TEXT,
        check_url TEXT NOT NULL,
        update_url TEXT,
        web_url TEXT,
        icon_url TEXT,
        provider TEXT NOT NULL DEFAULT 'github',
        enabled BOOLEAN DEFAULT 1,
        ignore_version TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createUpdatesTable = `
      CREATE TABLE IF NOT EXISTS updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER,
        old_version TEXT,
        new_version TEXT,
        changelog_url TEXT,
        notified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE
      )
    `;

    this.db.run(createAppsTable, (err) => {
      if (err) console.error('Error creating apps table:', err);
    });

    this.db.run(createUpdatesTable, (err) => {
      if (err) console.error('Error creating updates table:', err);
    });
  }

  // Apps CRUD operations
  getAllApps() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM apps ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getAppById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM apps WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  createApp(app) {
    return new Promise((resolve, reject) => {
      const { name, current_version, check_url, update_url, web_url, icon_url, provider } = app;
      const sql = `
        INSERT INTO apps (name, current_version, check_url, update_url, web_url, icon_url, provider)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [name, current_version, check_url, update_url, web_url, icon_url, provider], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...app });
      });
    });
  }

  updateApp(id, app) {
    return new Promise((resolve, reject) => {
      const { name, current_version, check_url, update_url, web_url, icon_url, provider, enabled } = app;
      const sql = `
        UPDATE apps 
        SET name = ?, current_version = ?, check_url = ?, update_url = ?, 
            web_url = ?, icon_url = ?, provider = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      this.db.run(sql, [name, current_version, check_url, update_url, web_url, icon_url, provider, enabled, id], function(err) {
        if (err) reject(err);
        else resolve({ id, ...app });
      });
    });
  }

  deleteApp(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM apps WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes > 0 });
      });
    });
  }

  updateAppVersion(id, latestVersion) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE apps SET latest_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [latestVersion, id],
        function(err) {
          if (err) reject(err);
          else resolve({ updated: this.changes > 0 });
        }
      );
    });
  }

  // Updates operations
  createUpdate(update) {
    return new Promise((resolve, reject) => {
      const { app_id, old_version, new_version, changelog_url } = update;
      const sql = `
        INSERT INTO updates (app_id, old_version, new_version, changelog_url)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [app_id, old_version, new_version, changelog_url], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...update });
      });
    });
  }

  getRecentUpdates(limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.*, a.name as app_name, a.icon_url
        FROM updates u
        JOIN apps a ON u.app_id = a.id
        ORDER BY u.created_at DESC
        LIMIT ?
      `;
      
      this.db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  markUpdateNotified(updateId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE updates SET notified = 1 WHERE id = ?',
        [updateId],
        function(err) {
          if (err) reject(err);
          else resolve({ updated: this.changes > 0 });
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) console.error('Error closing database:', err);
        else console.log('Database connection closed');
      });
    }
  }
}

module.exports = new Database();