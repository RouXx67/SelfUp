<<<<<<< HEAD
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const Database = require('./database/db');
const appsRoutes = require('./routes/apps');
const updatesRoutes = require('./routes/updates');
const systemRoutes = require('./routes/system');
const presetsRoutes = require('./routes/presets');
const versionsRoutes = require('./routes/versions');
const UpdateChecker = require('./services/updateChecker');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Initialize database
Database.init();

// Routes
app.use('/api/apps', appsRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/presets', presetsRoutes);
app.use('/api/versions', versionsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SelfUp server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize update checker
  const updateChecker = new UpdateChecker();
  updateChecker.start();
  console.log('🔄 Update checker started');
});

=======
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const Database = require('./database/db');
const appsRoutes = require('./routes/apps');
const updatesRoutes = require('./routes/updates');
const systemRoutes = require('./routes/system');
const presetsRoutes = require('./routes/presets');
const versionsRoutes = require('./routes/versions');
const UpdateChecker = require('./services/updateChecker');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Initialize database
Database.init();

// Routes
app.use('/api/apps', appsRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/presets', presetsRoutes);
app.use('/api/versions', versionsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SelfUp server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize update checker
  const updateChecker = new UpdateChecker();
  updateChecker.start();
  console.log('🔄 Update checker started');
});

>>>>>>> b08feef1ff04506242c7993eae757930ba05a009
module.exports = app;