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

    // Fonction pour détecter l'environnement LXC de manière plus robuste
    const detectLXCEnvironment = () => {
      try {
        console.log('🔍 Début de la détection LXC...');
        
        // Méthode 1: Vérifier /proc/1/environ
        if (fs.existsSync('/proc/1/environ')) {
          const environ = fs.readFileSync('/proc/1/environ', 'utf8');
          console.log('📄 /proc/1/environ trouvé, contenu partiel:', environ.substring(0, 200));
          if (environ.includes('container=lxc')) {
            console.log('✅ LXC détecté via /proc/1/environ');
            return true;
          }
        }

        // Méthode 2: Vérifier /proc/1/cgroup
        if (fs.existsSync('/proc/1/cgroup')) {
          const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
          console.log('📄 /proc/1/cgroup trouvé, contenu:', cgroup.substring(0, 300));
          if (cgroup.includes('lxc') || cgroup.includes('/machine.slice/') || cgroup.includes('pve')) {
            console.log('✅ LXC détecté via /proc/1/cgroup');
            return true;
          }
        }

        // Méthode 3: Vérifier les variables d'environnement
        console.log('🔍 Variables d\'environnement:', {
          container: process.env.container,
          LXC_NAME: process.env.LXC_NAME,
          PROXMOX: process.env.PROXMOX
        });
        if (process.env.container === 'lxc' || process.env.LXC_NAME || process.env.PROXMOX) {
          console.log('✅ LXC détecté via variables d\'environnement');
          return true;
        }

        // Méthode 4: Vérifier l'existence de fichiers spécifiques LXC
        if (fs.existsSync('/run/systemd/container')) {
          const containerType = fs.readFileSync('/run/systemd/container', 'utf8').trim();
          console.log('📄 /run/systemd/container trouvé:', containerType);
          if (containerType === 'lxc') {
            console.log('✅ LXC détecté via /run/systemd/container');
            return true;
          }
        }

        // Méthode 5: Vérifier /proc/self/cgroup (plus fiable)
        if (fs.existsSync('/proc/self/cgroup')) {
          const selfCgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
          console.log('📄 /proc/self/cgroup trouvé, contenu:', selfCgroup.substring(0, 300));
          if (selfCgroup.includes('lxc') || selfCgroup.includes('pve')) {
            console.log('✅ LXC détecté via /proc/self/cgroup');
            return true;
          }
        }

        // Méthode 6: Vérifier le hostname (souvent numérique dans LXC)
        const hostname = require('os').hostname();
        console.log('🏷️ Hostname:', hostname);
        if (/^(lxc-)?[0-9]+$/.test(hostname)) {
          console.log('✅ LXC probablement détecté via hostname numérique');
          return true;
        }

        // Méthode 7: Vérifier si le fichier container_id existe (créé par notre script d'installation)
        const installPath = detectInstallationPath();
        if (installPath) {
          const containerIdPath = path.join(installPath, 'container_id');
          if (fs.existsSync(containerIdPath)) {
            console.log('✅ LXC détecté via fichier container_id');
            return true;
          }
        }

        console.log('❌ Aucune méthode de détection LXC n\'a fonctionné');
        return false;
      } catch (error) {
        console.warn('❌ Erreur lors de la détection LXC:', error.message);
        return false;
      }
    };

    // Fonction pour obtenir l'ID du conteneur de manière robuste
    const getContainerId = (installPath) => {
      try {
        // Méthode 1: Lire depuis le fichier container_id
        const containerIdPath = path.join(installPath, 'container_id');
        if (fs.existsSync(containerIdPath)) {
          const id = fs.readFileSync(containerIdPath, 'utf8').trim();
          if (id && /^\d+$/.test(id)) {
            return id;
          }
        }

        // Méthode 2: Utiliser le hostname s'il est numérique
        const hostname = require('os').hostname();
        if (/^\d+$/.test(hostname)) {
          // Sauvegarder l'ID pour les prochaines fois
          try {
            fs.writeFileSync(containerIdPath, hostname);
          } catch (e) {
            console.warn('Impossible de sauvegarder l\'ID du conteneur:', e.message);
          }
          return hostname;
        }

        // Méthode 3: Extraire depuis /proc/1/cgroup
        if (fs.existsSync('/proc/1/cgroup')) {
          const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
          const match = cgroup.match(/lxc[\/\.]([0-9]+)/);
          if (match && match[1]) {
            const id = match[1];
            try {
              fs.writeFileSync(containerIdPath, id);
            } catch (e) {
              console.warn('Impossible de sauvegarder l\'ID du conteneur:', e.message);
            }
            return id;
          }
        }

        // Méthode 4: Variable d'environnement LXC_NAME
        if (process.env.LXC_NAME) {
          const match = process.env.LXC_NAME.match(/([0-9]+)/);
          if (match && match[1]) {
            const id = match[1];
            try {
              fs.writeFileSync(containerIdPath, id);
            } catch (e) {
              console.warn('Impossible de sauvegarder l\'ID du conteneur:', e.message);
            }
            return id;
          }
        }

        return null;
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'ID du conteneur:', error);
        return null;
      }
    };

    // Détecter le chemin d'installation
    const installPath = detectInstallationPath();
    if (!installPath) {
      return res.status(500).json({
        success: false,
        message: 'Impossible de détecter le chemin d\'installation de SelfUp'
      });
    }

    // Vérifier si on est dans un conteneur LXC
    const isLXC = detectLXCEnvironment();
    if (!isLXC) {
      return res.status(400).json({
        success: false,
        message: 'Cette fonction n\'est disponible que dans un conteneur LXC'
      });
    }

    // Obtenir l'ID du conteneur
    const containerId = getContainerId(installPath);
    if (!containerId) {
      return res.status(500).json({
        success: false,
        message: 'Impossible de déterminer l\'ID du conteneur LXC'
      });
    }

    // Vérifier que le script de mise à jour existe sur l'hôte
    const updateScript = '/root/update_lxc.sh';

    // Répondre immédiatement pour éviter le timeout
    res.json({
      success: true,
      message: 'Mise à jour lancée en arrière-plan',
      containerId: containerId,
      installPath: installPath
    });

    // Lancer la mise à jour en arrière-plan
    setTimeout(() => {
      // Créer un fichier de demande de mise à jour que l'hôte peut surveiller
      const updateRequest = {
        timestamp: new Date().toISOString(),
        containerId: containerId,
        installPath: installPath,
        status: 'requested'
      };
      
      try {
        // Créer le répertoire s'il n'existe pas
        const updateDir = path.dirname(path.join(installPath, 'update_request.json'));
        if (!fs.existsSync(updateDir)) {
          fs.mkdirSync(updateDir, { recursive: true });
        }

        fs.writeFileSync(path.join(installPath, 'update_request.json'), JSON.stringify(updateRequest, null, 2));
        console.log('Demande de mise à jour créée pour le conteneur', containerId, 'dans', installPath);
      } catch (error) {
        console.error('Erreur lors de la création de la demande de mise à jour:', error);
      }
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
    const updateRequestPath = '/opt/selfup/update_request.json';
    const updateStatusPath = '/opt/selfup/update_status.json';
    
    let status = { status: 'none' };
    
    // Vérifier s'il y a une demande en cours
    if (fs.existsSync(updateRequestPath)) {
      const request = JSON.parse(fs.readFileSync(updateRequestPath, 'utf8'));
      status = { ...request, status: 'pending' };
    }
    
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