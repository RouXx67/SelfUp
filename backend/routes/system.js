const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Route pour déclencher une mise à jour
router.post('/update', async (req, res) => {
  try {
    // Vérifier si on est dans un conteneur LXC
    const isLXC = fs.existsSync('/proc/1/environ') && 
                  fs.readFileSync('/proc/1/environ', 'utf8').includes('container=lxc');
    
    if (!isLXC) {
      return res.status(400).json({
        success: false,
        message: 'Cette fonction n\'est disponible que dans un conteneur LXC'
      });
    }

    // Vérifier si le script de mise à jour existe sur l'hôte
    // Le script sera exécuté depuis l'hôte Proxmox
    const updateScript = '/root/update_lxc.sh'; // Chemin sur l'hôte
    
    // Obtenir l'ID du conteneur LXC actuel
    let containerId = null;
    try {
      // Lire l'ID depuis le hostname ou un fichier de configuration
      const hostname = require('os').hostname();
      
      // Si le hostname est l'ID du conteneur, l'utiliser
      if (/^\d+$/.test(hostname)) {
        containerId = hostname;
      } else {
        // Sinon, essayer de le lire depuis un fichier créé lors de l'installation
        if (fs.existsSync('/opt/selfup/container_id')) {
          containerId = fs.readFileSync('/opt/selfup/container_id', 'utf8').trim();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID du conteneur:', error);
    }

    if (!containerId) {
      return res.status(500).json({
        success: false,
        message: 'Impossible de déterminer l\'ID du conteneur LXC'
      });
    }

    // Répondre immédiatement pour éviter le timeout
    res.json({
      success: true,
      message: 'Mise à jour lancée en arrière-plan',
      containerId: containerId
    });

    // Lancer la mise à jour en arrière-plan
    // Note: Cette commande sera exécutée depuis le conteneur mais tentera
    // d'appeler le script sur l'hôte via une méthode appropriée
    setTimeout(() => {
      // Créer un fichier de demande de mise à jour que l'hôte peut surveiller
      const updateRequest = {
        timestamp: new Date().toISOString(),
        containerId: containerId,
        status: 'requested'
      };
      
      try {
        fs.writeFileSync('/opt/selfup/update_request.json', JSON.stringify(updateRequest, null, 2));
        console.log('Demande de mise à jour créée pour le conteneur', containerId);
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

module.exports = router;