#!/bin/bash

# Script de surveillance des demandes de mise à jour
# À exécuter sur l'hôte Proxmox en tant que service ou cron job
# Usage: ./update_monitor.sh

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"
}

# Fonction pour traiter une demande de mise à jour
process_update_request() {
    local container_id="$1"
    local request_file="/var/lib/lxc/$container_id/rootfs/opt/selfup/update_request.json"
    local status_file="/var/lib/lxc/$container_id/rootfs/opt/selfup/update_status.json"
    
    if [[ ! -f "$request_file" ]]; then
        return 0
    fi
    
    log_info "Demande de mise à jour détectée pour le conteneur $container_id"
    
    # Créer le statut initial
    cat > "$status_file" << EOF
{
  "status": "processing",
  "timestamp": "$(date -Iseconds)",
  "containerId": "$container_id",
  "message": "Mise à jour en cours..."
}
EOF
    
    # Exécuter le script de mise à jour
    if ./update_lxc.sh "$container_id"; then
        # Succès
        cat > "$status_file" << EOF
{
  "status": "completed",
  "timestamp": "$(date -Iseconds)",
  "containerId": "$container_id",
  "message": "Mise à jour terminée avec succès"
}
EOF
        log_success "Mise à jour du conteneur $container_id terminée avec succès"
    else
        # Échec
        cat > "$status_file" << EOF
{
  "status": "failed",
  "timestamp": "$(date -Iseconds)",
  "containerId": "$container_id",
  "message": "Échec de la mise à jour"
}
EOF
        log_error "Échec de la mise à jour du conteneur $container_id"
    fi
    
    # Supprimer le fichier de demande
    rm -f "$request_file"
    
    # Nettoyer le fichier de statut après 1 heure
    (sleep 3600 && rm -f "$status_file") &
}

# Fonction principale de surveillance
monitor_updates() {
    log_info "Démarrage de la surveillance des mises à jour SelfUp"
    
    while true; do
        # Parcourir tous les conteneurs LXC
        for container_dir in /var/lib/lxc/*/; do
            if [[ -d "$container_dir" ]]; then
                container_id=$(basename "$container_dir")
                
                # Vérifier si c'est un conteneur avec SelfUp
                selfup_dir="$container_dir/rootfs/opt/selfup"
                if [[ -d "$selfup_dir" ]]; then
                    process_update_request "$container_id"
                fi
            fi
        done
        
        # Attendre 30 secondes avant la prochaine vérification
        sleep 30
    done
}

# Fonction pour installer le service systemd
install_service() {
    local script_path="$(realpath "$0")"
    local service_file="/etc/systemd/system/selfup-update-monitor.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=SelfUp Update Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(dirname "$script_path")
ExecStart=$script_path monitor
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable selfup-update-monitor.service
    systemctl start selfup-update-monitor.service
    
    log_success "Service selfup-update-monitor installé et démarré"
}

# Gestion des arguments
case "${1:-monitor}" in
    "monitor")
        monitor_updates
        ;;
    "install-service")
        install_service
        ;;
    "status")
        systemctl status selfup-update-monitor.service
        ;;
    "logs")
        journalctl -u selfup-update-monitor.service -f
        ;;
    *)
        echo "Usage: $0 [monitor|install-service|status|logs]"
        echo ""
        echo "  monitor         Surveiller les demandes de mise à jour (défaut)"
        echo "  install-service Installer comme service systemd"
        echo "  status          Afficher le statut du service"
        echo "  logs            Afficher les logs du service"
        exit 1
        ;;
esac