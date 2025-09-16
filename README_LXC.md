# Script d'Installation LXC pour SelfUp

Ce script permet de créer automatiquement un conteneur LXC et d'y installer SelfUp avec une interface de configuration interactive.

## Prérequis

- Proxmox VE ou système avec LXC installé
- Accès root
- Connexion internet pour télécharger les dépendances

## Utilisation

1. Rendez le script exécutable :
```bash
chmod +x scripts/install_lxc.sh
```

2. Exécutez le script en tant que root :
```bash
sudo ./scripts/install_lxc.sh
```

## Configuration Interactive

Le script vous demandera de configurer les paramètres suivants :

### Paramètres du Conteneur
- **ID du conteneur** : Identifiant unique (ex: 100, 101, etc.)
- **Nom du conteneur** : Nom descriptif (ex: selfup-prod)
- **CPU** : Nombre de cœurs CPU (1-32)
- **RAM** : Quantité de mémoire en MB (512-32768)
- **Disque** : Taille du disque en GB (8-1000)

### Configuration Réseau
- **Type d'IP** : 
  - DHCP (automatique)
  - IP statique (avec adresse IP et passerelle)
- **VLAN** : ID VLAN optionnel (1-4094)
- **Bridge** : Interface réseau (défaut: vmbr0)

### Stockage
- **Storage** : Pool de stockage Proxmox (défaut: local-lvm)

## Fonctionnalités

### ✅ Validation des Entrées
- Vérification des formats d'IP
- Validation des plages de valeurs
- Contrôle de l'existence des IDs de conteneur

### ✅ Installation Automatique
- Création du conteneur LXC avec les paramètres spécifiés
- Installation automatique d'Ubuntu 22.04
- Installation de Node.js 18
- Clonage et installation de SelfUp
- Configuration du service systemd

### ✅ Gestion d'Erreurs
- Vérification des prérequis
- Gestion des erreurs de création
- Nettoyage en cas d'interruption

## Après l'Installation

Une fois l'installation terminée, vous pourrez :

1. **Accéder à SelfUp** : `http://IP_DU_CONTENEUR:3001`
2. **Entrer dans le conteneur** : `pct enter ID_CONTENEUR`
3. **Vérifier le service** : `pct exec ID_CONTENEUR -- systemctl status selfup`
4. **Consulter les logs** : `pct exec ID_CONTENEUR -- journalctl -u selfup -f`

## Commandes Utiles

```bash
# Démarrer le conteneur
pct start ID_CONTENEUR

# Arrêter le conteneur
pct stop ID_CONTENEUR

# Redémarrer le conteneur
pct reboot ID_CONTENEUR

# Entrer dans le conteneur
pct enter ID_CONTENEUR

# Supprimer le conteneur
pct destroy ID_CONTENEUR
```

## Configuration SelfUp

Le fichier de configuration SelfUp se trouve dans le conteneur à :
```
/opt/selfup/.env
```

Pour le modifier :
```bash
pct exec ID_CONTENEUR -- nano /opt/selfup/.env
pct exec ID_CONTENEUR -- systemctl restart selfup
```

## Dépannage

### Le conteneur ne démarre pas
```bash
# Vérifier les logs du conteneur
pct config ID_CONTENEUR
journalctl -u pve-container@ID_CONTENEUR
```

### SelfUp ne fonctionne pas
```bash
# Vérifier le service dans le conteneur
pct exec ID_CONTENEUR -- systemctl status selfup
pct exec ID_CONTENEUR -- journalctl -u selfup -n 50
```

### Problèmes réseau
```bash
# Vérifier la configuration réseau
pct exec ID_CONTENEUR -- ip addr show
pct exec ID_CONTENEUR -- ping 8.8.8.8
```

## Sécurité

- Le conteneur est créé en mode non-privilégié par défaut
- SelfUp s'exécute avec un utilisateur dédié
- Le service est configuré avec des restrictions de sécurité

## Support

Pour plus d'informations sur SelfUp, consultez :
- [Documentation SelfUp](../README.md)
- [Configuration Gotify](../docs/GOTIFY.md)
- [Providers](../docs/PROVIDERS.md)