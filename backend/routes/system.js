const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const GotifyService = require('../services/gotify');
const router = express.Router();

// Route pour vérifier s'il y a des mises à jour disponibles
router.get('/check-updates', async (req, res) => {
    try {
        // Vérifier si Git est installé
        exec('git --version', (gitError) => {
            if (gitError) {
                return res.json({ 
                    success: false,
                    hasUpdates: false, 
                    error: 'Git n\'est pas installé sur ce système' 
                });
            }

            // Vérifier si on est dans un repository git
            if (!fs.existsSync('.git')) {
                return res.json({ 
                    success: false,
                    hasUpdates: false, 
                    error: 'Ce répertoire n\'est pas un repository Git. Vérifiez l\'installation.' 
                });
            }

            // Récupérer le commit actuel
            exec('git rev-parse HEAD', (error, currentCommit) => {
                if (error) {
                    return res.json({ 
                        success: false,
                        hasUpdates: false, 
                        error: 'Impossible de récupérer le commit actuel: ' + error.message 
                    });
                }

                currentCommit = currentCommit.trim();

                // Récupérer le dernier commit distant
                exec('git ls-remote origin HEAD', (error, remoteOutput) => {
                    if (error) {
                        return res.json({ 
                            success: false,
                            hasUpdates: false, 
                            error: 'Impossible de contacter le repository distant. Vérifiez la connexion internet.' 
                        });
                    }

                    const remoteCommit = remoteOutput.split('\t')[0];
                    const hasUpdates = currentCommit !== remoteCommit;

                    res.json({
                        success: true,
                        hasUpdates,
                        currentCommit: currentCommit.substring(0, 7),
                        remoteCommit: remoteCommit.substring(0, 7),
                        message: hasUpdates ? 'Mise à jour disponible' : 'Système à jour'
                    });
                });
            });
        });

    } catch (error) {
        console.error('Erreur lors de la vérification des mises à jour:', error);
        res.status(500).json({ 
            success: false,
            hasUpdates: false, 
            error: 'Erreur interne du serveur: ' + error.message 
        });
    }
});

// Route pour déclencher une mise à jour
router.post('/update', async (req, res) => {
  try {
    // Fonction pour détecter automatiquement le chemin d'installation
    const detectInstallationPath = () => {
      const possiblePaths = [
        '/opt/selfup',
        '/home/selfup',
        '/var/www/selfup',
        process.cwd(), // Répertoire courant
        path.dirname(process.argv[1]) // Répertoire du script principal
      ];

      for (const testPath of possiblePaths) {
        if (fs.existsSync(path.join(testPath, 'backend', 'server.js')) || 
            fs.existsSync(path.join(testPath, 'server.js'))) {
          return testPath;
        }
      }
      return null;
    };

    // Détecter le chemin d'installation
    const installPath = detectInstallationPath();
    if (!installPath) {
      return res.status(500).json({
        success: false,
        message: 'Impossible de détecter le chemin d\'installation de SelfUp'
      });
    }

    // Chemin vers le script de mise à jour
    const updateScript = path.join(installPath, 'scripts', 'update.sh');
    
    // Vérifier que le script existe
    if (!fs.existsSync(updateScript)) {
      return res.status(404).json({
        success: false,
        message: 'Script de mise à jour non trouvé: ' + updateScript
      });
    }

    // Répondre immédiatement pour éviter le timeout
    res.json({
      success: true,
      message: 'Mise à jour lancée en arrière-plan',
      installPath: installPath,
      updateScript: updateScript
    });

    // Lancer la mise à jour en arrière-plan
    setTimeout(() => {
      const { spawn } = require('child_process');
      
      console.log('🚀 Lancement de la mise à jour avec le script:', updateScript);
      
      // Exécuter le script de mise à jour
      const updateProcess = spawn('bash', [updateScript], {
        cwd: installPath,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Logger la sortie du script
      updateProcess.stdout.on('data', (data) => {
        console.log('📝 Update stdout:', data.toString());
      });

      updateProcess.stderr.on('data', (data) => {
        console.error('❌ Update stderr:', data.toString());
      });

      updateProcess.on('close', (code) => {
        console.log(`✅ Script de mise à jour terminé avec le code: ${code}`);
        
        // Créer un fichier de statut
        const statusFile = path.join(installPath, 'update_status.json');
        const status = {
          timestamp: new Date().toISOString(),
          exitCode: code,
          status: code === 0 ? 'success' : 'error',
          message: code === 0 ? 'Mise à jour terminée avec succès' : 'Erreur lors de la mise à jour'
        };
        
        try {
          fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
        } catch (error) {
          console.error('Erreur lors de l\'écriture du statut:', error);
        }
      });

      updateProcess.on('error', (error) => {
        console.error('❌ Erreur lors du lancement du script de mise à jour:', error);
      });

      // Détacher le processus pour qu'il continue même si le serveur redémarre
      updateProcess.unref();
      
    }, 1000);

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur: ' + error.message
    });
  }
});

// Route pour vérifier le statut de la mise à jour
router.get('/update/status', (req, res) => {
  try {
    // Fonction pour détecter automatiquement le chemin d'installation
    const detectInstallationPath = () => {
      const possiblePaths = [
        '/opt/selfup',
        '/home/selfup',
        '/var/www/selfup',
        process.cwd(), // Répertoire courant
        path.dirname(process.argv[1]) // Répertoire du script principal
      ];

      for (const testPath of possiblePaths) {
        if (fs.existsSync(path.join(testPath, 'backend', 'server.js')) || 
            fs.existsSync(path.join(testPath, 'server.js'))) {
          return testPath;
        }
      }
      return '/opt/selfup'; // Valeur par défaut
    };

    const installPath = detectInstallationPath();
    const updateStatusPath = path.join(installPath, 'update_status.json');
    
    let status = { status: 'none' };
    
    // Vérifier s'il y a un statut de mise à jour
    if (fs.existsSync(updateStatusPath)) {
      status = JSON.parse(fs.readFileSync(updateStatusPath, 'utf8'));
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut: ' + error.message
    });
  }
});

// Route pour obtenir la configuration Gotify actuelle
router.get('/gotify/config', (req, res) => {
  try {
    const gotifyService = new GotifyService();
    const config = gotifyService.getConfig();
    
    res.json({
      success: true,
      config: {
        enabled: config.enabled,
        url: config.url,
        hasToken: config.hasToken
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la config Gotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration'
    });
  }
});

// Route pour sauvegarder la configuration Gotify
router.post('/gotify/config', (req, res) => {
  try {
    const { url, token } = req.body;
    
    if (!url || !token) {
      return res.status(400).json({
        success: false,
        message: 'URL et token sont requis'
      });
    }

    // Valider l'URL
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'URL invalide'
      });
    }

    // Lire le fichier .env existant
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Mettre à jour ou ajouter les variables Gotify
    const lines = envContent.split('\n');
    let urlUpdated = false;
    let tokenUpdated = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('GOTIFY_URL=')) {
        lines[i] = `GOTIFY_URL=${url}`;
        urlUpdated = true;
      } else if (lines[i].startsWith('GOTIFY_TOKEN=')) {
        lines[i] = `GOTIFY_TOKEN=${token}`;
        tokenUpdated = true;
      }
    }

    // Ajouter les variables si elles n'existent pas
    if (!urlUpdated) {
      lines.push(`GOTIFY_URL=${url}`);
    }
    if (!tokenUpdated) {
      lines.push(`GOTIFY_TOKEN=${token}`);
    }

    // Sauvegarder le fichier .env
    fs.writeFileSync(envPath, lines.join('\n'));

    // Mettre à jour les variables d'environnement du processus
    process.env.GOTIFY_URL = url;
    process.env.GOTIFY_TOKEN = token;

    res.json({
      success: true,
      message: 'Configuration Gotify sauvegardée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la config Gotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la sauvegarde de la configuration'
    });
  }
});

// Route pour tester la configuration Gotify
router.post('/gotify/test', async (req, res) => {
  try {
    const gotifyService = new GotifyService();
    
    if (!gotifyService.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'Gotify n\'est pas configuré'
      });
    }

    const result = await gotifyService.sendTestNotification();
    
    if (result) {
      res.json({
        success: true,
        message: 'Notification de test envoyée avec succès'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Échec de l\'envoi de la notification de test'
      });
    }

  } catch (error) {
    console.error('Erreur lors du test Gotify:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test de la notification'
    });
  }
});

module.exports = router;