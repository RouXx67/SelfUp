# Configuration Gotify pour SelfUp

Ce guide explique comment configurer Gotify pour recevoir des notifications de mises à jour de SelfUp.

## 📱 Qu'est-ce que Gotify ?

[Gotify](https://gotify.net/) est un serveur de notifications push simple, auto-hébergé. Il permet de recevoir des notifications en temps réel sur vos appareils mobiles et dans votre navigateur.

## 🚀 Installation de Gotify

### Option 1 : Docker (Recommandée)

```bash
# Créer le répertoire de données
mkdir -p /opt/gotify/data

# Lancer Gotify avec Docker
docker run -d \
  --name gotify \
  --restart unless-stopped \
  -p 8080:80 \
  -v /opt/gotify/data:/app/data \
  gotify/server
```

### Option 2 : Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  gotify:
    image: gotify/server
    container_name: gotify
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - gotify-data:/app/data
    environment:
      - GOTIFY_DEFAULTUSER_NAME=admin
      - GOTIFY_DEFAULTUSER_PASS=admin123
      # Changez le mot de passe par défaut !

volumes:
  gotify-data:
```

```bash
# Démarrer Gotify
docker-compose up -d
```

### Option 3 : Installation native

```bash
# Télécharger la dernière version
wget https://github.com/gotify/server/releases/latest/download/gotify-linux-amd64

# Rendre exécutable
chmod +x gotify-linux-amd64

# Déplacer vers /usr/local/bin
sudo mv gotify-linux-amd64 /usr/local/bin/gotify

# Créer un utilisateur système
sudo useradd --system --shell /bin/false gotify

# Créer le répertoire de données
sudo mkdir -p /var/lib/gotify
sudo chown gotify:gotify /var/lib/gotify

# Créer le service systemd
sudo tee /etc/systemd/system/gotify.service > /dev/null <<EOF
[Unit]
Description=Gotify Server
After=network.target

[Service]
Type=simple
User=gotify
Group=gotify
WorkingDirectory=/var/lib/gotify
ExecStart=/usr/local/bin/gotify
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Activer et démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable gotify
sudo systemctl start gotify
```

## ⚙️ Configuration initiale de Gotify

### 1. Accès à l'interface web

Ouvrez votre navigateur et allez sur : `http://votre-serveur:8080`

**Identifiants par défaut :**
- Utilisateur : `admin`
- Mot de passe : `admin`

⚠️ **Changez immédiatement le mot de passe par défaut !**

### 2. Créer une application pour SelfUp

1. **Connectez-vous** à l'interface Gotify
2. Allez dans **"Apps"** dans le menu de gauche
3. Cliquez sur **"Create Application"**
4. Remplissez les informations :
   - **Name** : `SelfUp`
   - **Description** : `Notifications de mises à jour SelfUp`
5. Cliquez sur **"Create"**
6. **Copiez le token** généré (vous en aurez besoin pour SelfUp)

![Gotify App Creation](gotify-app-creation.png)

### 3. Installer l'application mobile (Optionnel)

- **Android** : [Google Play Store](https://play.google.com/store/apps/details?id=com.github.gotify)
- **F-Droid** : [F-Droid](https://f-droid.org/packages/com.github.gotify/)
- **iOS** : Pas d'app officielle, utilisez l'interface web

## 🔧 Configuration de SelfUp

### 1. Modifier le fichier de configuration

Éditez le fichier `/opt/selfup/.env` :

```bash
sudo nano /opt/selfup/.env
```

Ajoutez ou modifiez ces lignes :

```bash
# Configuration Gotify
GOTIFY_URL=http://votre-serveur:8080
GOTIFY_TOKEN=votre_token_application_ici
```

**Exemple complet :**
```bash
# Configuration de base
PORT=3001
NODE_ENV=production

# Base de données
DB_PATH=/opt/selfup/data/selfup.db

# Configuration Gotify
GOTIFY_URL=http://192.168.1.100:8080
GOTIFY_TOKEN=AaBbCcDdEeFfGgHhIiJjKkLlMmNn

# Vérification des mises à jour
CHECK_INTERVAL_HOURS=6
DEFAULT_TIMEOUT=10000
```

### 2. Redémarrer SelfUp

```bash
sudo systemctl restart selfup
```

### 3. Vérifier la configuration

```bash
# Vérifier les logs de SelfUp
sudo journalctl -u selfup -f

# Vous devriez voir :
# [INFO] 📱 Gotify service initialized
```

## 🧪 Tester les notifications

### Test via l'interface SelfUp

1. Allez dans **Paramètres** dans SelfUp
2. Cliquez sur **"Tester"** dans la section Gotify
3. Vous devriez recevoir une notification de test

### Test via curl

```bash
curl -X POST "http://votre-serveur:8080/message" \
  -H "X-Gotify-Key: votre_token_ici" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test SelfUp",
    "message": "Ceci est un test de notification depuis SelfUp",
    "priority": 5
  }'
```

### Test via l'API SelfUp

```bash
# Forcer une vérification de mises à jour
curl -X POST http://localhost:3001/api/updates/check-all
```

## 📱 Types de notifications SelfUp

### Notification de mise à jour

```
🆕 Radarr Update Available

Radarr 4.7.0 is now available!

Current: 4.6.4
Latest: 4.7.0

Update: https://wiki.servarr.com/radarr/installation
Changelog: https://github.com/Radarr/Radarr/releases/tag/v4.7.0
```

### Notification d'erreur (si activée)

```
❌ SelfUp Check Error

Failed to check updates for Sonarr

Error: Cannot connect to GitHub API
```

## 🎨 Personnalisation des notifications

### Priorités Gotify

SelfUp utilise différentes priorités :
- **Priority 5** : Mises à jour importantes
- **Priority 3** : Notifications de test
- **Priority 1** : Informations générales

### Filtrage par application mobile

Dans l'app Gotify mobile :
1. Allez dans **Settings**
2. **Notification Settings**
3. Configurez les priorités minimales

## 🔒 Sécurité

### HTTPS avec reverse proxy

Configuration Nginx pour sécuriser Gotify :

```nginx
server {
    listen 443 ssl http2;
    server_name gotify.votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Puis modifiez SelfUp :
```bash
GOTIFY_URL=https://gotify.votre-domaine.com
```

### Authentification par token

- **Ne partagez jamais** vos tokens Gotify
- **Utilisez des tokens différents** pour chaque application
- **Régénérez les tokens** si compromis

## 🔧 Dépannage

### Gotify ne reçoit pas les notifications

1. **Vérifiez la connectivité** :
   ```bash
   curl -I http://votre-serveur:8080
   ```

2. **Vérifiez le token** :
   ```bash
   curl -X GET "http://votre-serveur:8080/application" \
     -H "X-Gotify-Key: votre_token_ici"
   ```

3. **Vérifiez les logs SelfUp** :
   ```bash
   sudo journalctl -u selfup -f | grep -i gotify
   ```

### Erreurs communes

**"Cannot connect to Gotify server"**
- Vérifiez que Gotify est démarré
- Vérifiez l'URL dans la configuration
- Vérifiez les règles de firewall

**"Gotify authentication failed"**
- Vérifiez le token dans la configuration
- Régénérez le token si nécessaire

**"Invalid Gotify request format"**
- Problème de configuration interne, vérifiez les logs détaillés

### Logs Gotify

```bash
# Si installé avec Docker
docker logs gotify

# Si installé nativement
sudo journalctl -u gotify -f
```

## 📊 Monitoring

### Statistiques Gotify

L'interface Gotify fournit :
- Nombre de messages envoyés
- Historique des notifications
- Statistiques par application

### Intégration avec des outils de monitoring

Vous pouvez monitorer Gotify avec :
- **Prometheus** : Métriques disponibles sur `/metrics`
- **Grafana** : Dashboards pour visualiser l'usage
- **Uptime Kuma** : Surveillance de la disponibilité

## 🔄 Sauvegarde et restauration

### Sauvegarde des données Gotify

```bash
# Avec Docker
docker exec gotify tar -czf /tmp/gotify-backup.tar.gz /app/data
docker cp gotify:/tmp/gotify-backup.tar.gz ./gotify-backup.tar.gz

# Installation native
sudo tar -czf gotify-backup.tar.gz -C /var/lib/gotify .
```

### Restauration

```bash
# Arrêter Gotify
docker stop gotify  # ou sudo systemctl stop gotify

# Restaurer les données
docker run --rm -v gotify-data:/app/data -v $(pwd):/backup alpine tar -xzf /backup/gotify-backup.tar.gz -C /app/data

# Redémarrer Gotify
docker start gotify  # ou sudo systemctl start gotify
```

## 🤝 Ressources utiles

- [Documentation officielle Gotify](https://gotify.net/docs/)
- [Repository GitHub Gotify](https://github.com/gotify/server)
- [API Documentation](https://gotify.net/api-docs)
- [Client Android](https://github.com/gotify/android)

---

Avec cette configuration, vous recevrez des notifications push en temps réel pour toutes les mises à jour détectées par SelfUp ! 🚀