#!/bin/bash

# Script de mise à jour SelfUp dans un conteneur LXC
# Usage: ./update_lxc.sh [CONTAINER_ID]

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Variables par défaut
SELFUP_REPO="https://github.com/RouXx67/SelfUp.git"
BACKUP_DIR="/opt/selfup/backup"

# Fonctions d'affichage
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo
    echo -e "${BOLD}${BLUE}=== $1 ===${NC}"
    echo
}

# Fonction pour afficher l'aide
show_help() {
    echo "Usage: $0 [CONTAINER_ID]"
    echo
    echo "Met à jour SelfUp dans un conteneur LXC depuis GitHub"
    echo
    echo "Options:"
    echo "  CONTAINER_ID    ID du conteneur LXC (optionnel, sera demandé si non fourni)"
    echo "  -h, --help      Afficher cette aide"
    echo
    echo "Exemples:"
    echo "  $0 120          # Met à jour le conteneur 120"
    echo "  $0              # Demande l'ID du conteneur"
}

# Vérifier les arguments
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Obtenir l'ID du conteneur
if [[ -n "$1" ]]; then
    LXC_ID="$1"
else
    echo -e "${BOLD}Conteneurs LXC disponibles :${NC}"
    pct list
    echo
    read -p "$(echo -e "${BOLD}ID du conteneur à mettre à jour${NC}: ")" LXC_ID
fi

# Vérifier que le conteneur existe
if ! pct status "$LXC_ID" &>/dev/null; then
    log_error "Le conteneur $LXC_ID n'existe pas"
    exit 1
fi

# Vérifier que le conteneur est démarré
if [[ "$(pct status "$LXC_ID")" != "status: running" ]]; then
    log_info "Démarrage du conteneur $LXC_ID..."
    pct start "$LXC_ID"
    sleep 5
fi

log_header "Mise à jour de SelfUp dans le conteneur $LXC_ID"

# Vérifier que SelfUp est installé
if ! pct exec "$LXC_ID" -- test -d /opt/selfup/app; then
    log_error "SelfUp n'est pas installé dans ce conteneur"
    log_info "Utilisez install_lxc.sh pour l'installation initiale"
    exit 1
fi

# Arrêter le service SelfUp
log_info "Arrêt du service SelfUp..."
pct exec "$LXC_ID" -- systemctl stop selfup

# Créer un backup de la configuration actuelle
log_info "Sauvegarde de la configuration actuelle..."
pct exec "$LXC_ID" -- mkdir -p "$BACKUP_DIR"
pct exec "$LXC_ID" -- cp /opt/selfup/.env "$BACKUP_DIR/.env.backup" 2>/dev/null || true
pct exec "$LXC_ID" -- cp -r /opt/selfup/data "$BACKUP_DIR/data.backup" 2>/dev/null || true

# Sauvegarder l'ancienne version
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
log_info "Sauvegarde de l'ancienne version..."
pct exec "$LXC_ID" -- cp -r /opt/selfup/app "$BACKUP_DIR/app_$TIMESTAMP"

# Télécharger la nouvelle version
log_info "Téléchargement de la dernière version depuis GitHub..."
pct exec "$LXC_ID" -- rm -rf /tmp/selfup_update
pct exec "$LXC_ID" -- git clone "$SELFUP_REPO" /tmp/selfup_update

# Vérifier que le téléchargement a réussi
if ! pct exec "$LXC_ID" -- test -f /tmp/selfup_update/package.json; then
    log_error "Échec du téléchargement de la nouvelle version"
    log_info "Redémarrage du service avec l'ancienne version..."
    pct exec "$LXC_ID" -- systemctl start selfup
    exit 1
fi

# Sauvegarder les node_modules existants si ils sont compatibles
log_info "Vérification de la compatibilité des dépendances..."
NEED_NPM_INSTALL=false

# Comparer les package.json
if ! pct exec "$LXC_ID" -- diff /opt/selfup/app/package.json /tmp/selfup_update/package.json &>/dev/null; then
    log_info "Changements détectés dans package.json, réinstallation des dépendances nécessaire"
    NEED_NPM_INSTALL=true
fi

if ! pct exec "$LXC_ID" -- diff /opt/selfup/app/frontend/package.json /tmp/selfup_update/frontend/package.json &>/dev/null; then
    log_info "Changements détectés dans frontend/package.json, rebuild du frontend nécessaire"
    NEED_NPM_INSTALL=true
fi

# Remplacer les fichiers de l'application
log_info "Installation de la nouvelle version..."
pct exec "$LXC_ID" -- rm -rf /opt/selfup/app
pct exec "$LXC_ID" -- cp -r /tmp/selfup_update /opt/selfup/app
pct exec "$LXC_ID" -- chown -R selfup:selfup /opt/selfup/app

# Restaurer la configuration
log_info "Restauration de la configuration..."
if pct exec "$LXC_ID" -- test -f "$BACKUP_DIR/.env.backup"; then
    pct exec "$LXC_ID" -- cp "$BACKUP_DIR/.env.backup" /opt/selfup/.env
    pct exec "$LXC_ID" -- chown selfup:selfup /opt/selfup/.env
    pct exec "$LXC_ID" -- chmod 600 /opt/selfup/.env
else
    log_warning "Aucune configuration sauvegardée trouvée, création d'une configuration par défaut..."
    pct exec "$LXC_ID" -- bash -c "
        cat > /opt/selfup/.env << 'ENVEOF'
PORT=3001
NODE_ENV=production
DB_PATH=/opt/selfup/data/selfup.db
CHECK_INTERVAL_HOURS=6
DEFAULT_TIMEOUT=10000
FRONTEND_URL=http://localhost:3001
ENVEOF
        chown selfup:selfup /opt/selfup/.env
        chmod 600 /opt/selfup/.env
    "
fi

# Réinstaller les dépendances si nécessaire
if [[ "$NEED_NPM_INSTALL" == "true" ]]; then
    log_info "Réinstallation des dépendances backend..."
    pct exec "$LXC_ID" -- bash -c "cd /opt/selfup/app && sudo -u selfup npm install"
    
    log_info "Réinstallation et build du frontend..."
    pct exec "$LXC_ID" -- bash -c "cd /opt/selfup/app/frontend && sudo -u selfup npm install && sudo -u selfup npm run build"
else
    log_info "Réutilisation des dépendances existantes..."
    # Copier les node_modules depuis le backup
    if pct exec "$LXC_ID" -- test -d "$BACKUP_DIR/app_$TIMESTAMP/node_modules"; then
        pct exec "$LXC_ID" -- cp -r "$BACKUP_DIR/app_$TIMESTAMP/node_modules" /opt/selfup/app/
        pct exec "$LXC_ID" -- chown -R selfup:selfup /opt/selfup/app/node_modules
    fi
    
    if pct exec "$LXC_ID" -- test -d "$BACKUP_DIR/app_$TIMESTAMP/frontend/node_modules"; then
        pct exec "$LXC_ID" -- cp -r "$BACKUP_DIR/app_$TIMESTAMP/frontend/node_modules" /opt/selfup/app/frontend/
        pct exec "$LXC_ID" -- cp -r "$BACKUP_DIR/app_$TIMESTAMP/frontend/dist" /opt/selfup/app/frontend/ 2>/dev/null || true
        pct exec "$LXC_ID" -- chown -R selfup:selfup /opt/selfup/app/frontend/node_modules
        pct exec "$LXC_ID" -- chown -R selfup:selfup /opt/selfup/app/frontend/dist 2>/dev/null || true
    fi
    
    # Si pas de dist, rebuild quand même
    if ! pct exec "$LXC_ID" -- test -d /opt/selfup/app/frontend/dist; then
        log_info "Build du frontend nécessaire..."
        pct exec "$LXC_ID" -- bash -c "cd /opt/selfup/app/frontend && sudo -u selfup npm install && sudo -u selfup npm run build"
    fi
fi

# Nettoyer les fichiers temporaires
pct exec "$LXC_ID" -- rm -rf /tmp/selfup_update

# Redémarrer le service
log_info "Redémarrage du service SelfUp..."
pct exec "$LXC_ID" -- systemctl start selfup

# Attendre et vérifier le statut
sleep 5
if pct exec "$LXC_ID" -- systemctl is-active --quiet selfup; then
    log_success "Mise à jour terminée avec succès !"
    
    # Afficher les informations de version
    if pct exec "$LXC_ID" -- test -f /opt/selfup/app/package.json; then
        VERSION=$(pct exec "$LXC_ID" -- grep '"version"' /opt/selfup/app/package.json | cut -d'"' -f4)
        log_info "Version installée : $VERSION"
    fi
    
    # Récupérer l'IP du conteneur
    CONTAINER_IP=$(pct exec "$LXC_ID" -- hostname -I | awk '{print $1}' 2>/dev/null || echo "IP non disponible")
    
    echo
    log_header "Informations de connexion :"
    echo -e "${BOLD}URL :${NC} http://$CONTAINER_IP:3001"
    echo -e "${BOLD}Statut :${NC} $(pct exec "$LXC_ID" -- systemctl is-active selfup)"
    echo
    log_info "Sauvegarde disponible dans : $BACKUP_DIR/app_$TIMESTAMP"
    
else
    log_error "Échec du redémarrage du service"
    log_info "Vérification des logs..."
    pct exec "$LXC_ID" -- journalctl -u selfup -n 20 --no-pager
    
    log_warning "Restauration de l'ancienne version..."
    pct exec "$LXC_ID" -- rm -rf /opt/selfup/app
    pct exec "$LXC_ID" -- cp -r "$BACKUP_DIR/app_$TIMESTAMP" /opt/selfup/app
    pct exec "$LXC_ID" -- chown -R selfup:selfup /opt/selfup/app
    pct exec "$LXC_ID" -- systemctl start selfup
    
    log_info "Ancienne version restaurée"
    exit 1
fi

echo
log_success "Mise à jour terminée !"