#!/bin/bash

# Script d'installation LXC avec SelfUp
# Compatible avec Proxmox VE et LXC standalone

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Variables globales
LXC_ID=""
LXC_NAME=""
LXC_CPU=""
LXC_RAM=""
LXC_DISK=""
LXC_IP_TYPE=""
LXC_IP=""
LXC_GATEWAY=""
LXC_VLAN=""
LXC_BRIDGE="vmbr0"
LXC_TEMPLATE="ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
LXC_STORAGE="local-lvm"
SELFUP_REPO="https://github.com/RouXx67/SelfUp.git"

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
    echo -e "${CYAN}${BOLD}$1${NC}"
}

# Fonction pour afficher le titre
show_header() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "=================================================================="
    echo "           Script d'Installation LXC avec SelfUp"
    echo "=================================================================="
    echo -e "${NC}"
    echo
}

# Fonction pour valider un nombre
validate_number() {
    local input="$1"
    local min="$2"
    local max="$3"
    
    if [[ ! "$input" =~ ^[0-9]+$ ]]; then
        return 1
    fi
    
    if [[ -n "$min" && "$input" -lt "$min" ]]; then
        return 1
    fi
    
    if [[ -n "$max" && "$input" -gt "$max" ]]; then
        return 1
    fi
    
    return 0
}

# Fonction pour valider une adresse IP
validate_ip() {
    local ip="$1"
    local regex="^([0-9]{1,3}\.){3}[0-9]{1,3}$"
    
    if [[ ! "$ip" =~ $regex ]]; then
        return 1
    fi
    
    IFS='.' read -ra ADDR <<< "$ip"
    for i in "${ADDR[@]}"; do
        if [[ "$i" -gt 255 ]]; then
            return 1
        fi
    done
    
    return 0
}

# Fonction pour vérifier si un ID LXC existe déjà
check_lxc_exists() {
    local id="$1"
    if pct list | grep -q "^$id "; then
        return 0
    fi
    return 1
}

# Formulaire interactif pour la configuration LXC
configure_lxc() {
    show_header
    log_header "Configuration du conteneur LXC"
    echo
    
    # ID du conteneur
    while true; do
        read -p "$(echo -e "${BOLD}ID du conteneur LXC${NC} (ex: 100): ")" LXC_ID
        
        if validate_number "$LXC_ID" 100 999999; then
            if check_lxc_exists "$LXC_ID"; then
                log_error "Le conteneur avec l'ID $LXC_ID existe déjà!"
                continue
            fi
            break
        else
            log_error "Veuillez entrer un ID valide (nombre entre 100 et 999999)"
        fi
    done
    
    # Nom du conteneur
    while true; do
        read -p "$(echo -e "${BOLD}Nom du conteneur${NC} (ex: selfup-prod): ")" LXC_NAME
        
        if [[ -n "$LXC_NAME" && "$LXC_NAME" =~ ^[a-zA-Z0-9-]+$ ]]; then
            break
        else
            log_error "Nom invalide. Utilisez uniquement des lettres, chiffres et tirets"
        fi
    done
    
    # CPU
    while true; do
        read -p "$(echo -e "${BOLD}Nombre de CPU${NC} (ex: 2): ")" LXC_CPU
        
        if validate_number "$LXC_CPU" 1 32; then
            break
        else
            log_error "Veuillez entrer un nombre de CPU valide (1-32)"
        fi
    done
    
    # RAM
    while true; do
        read -p "$(echo -e "${BOLD}RAM en MB${NC} (ex: 2048): ")" LXC_RAM
        
        if validate_number "$LXC_RAM" 512 32768; then
            break
        else
            log_error "Veuillez entrer une quantité de RAM valide (512-32768 MB)"
        fi
    done
    
    # Disque
    while true; do
        read -p "$(echo -e "${BOLD}Taille du disque en GB${NC} (ex: 20): ")" LXC_DISK
        
        if validate_number "$LXC_DISK" 8 1000; then
            break
        else
            log_error "Veuillez entrer une taille de disque valide (8-1000 GB)"
        fi
    done
    
    # Type d'IP
    echo
    log_info "Configuration réseau:"
    echo "1) DHCP (automatique)"
    echo "2) IP statique"
    
    while true; do
        read -p "$(echo -e "${BOLD}Choisissez le type d'IP${NC} (1 ou 2): ")" choice
        
        case $choice in
            1)
                LXC_IP_TYPE="dhcp"
                break
                ;;
            2)
                LXC_IP_TYPE="static"
                
                # IP statique
                while true; do
                    read -p "$(echo -e "${BOLD}Adresse IP${NC} (ex: 192.168.1.100/24): ")" LXC_IP
                    
                    if [[ "$LXC_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
                        break
                    else
                        log_error "Format d'IP invalide. Utilisez le format IP/CIDR (ex: 192.168.1.100/24)"
                    fi
                done
                
                # Passerelle
                while true; do
                    read -p "$(echo -e "${BOLD}Passerelle${NC} (ex: 192.168.1.1): ")" LXC_GATEWAY
                    
                    if validate_ip "$LXC_GATEWAY"; then
                        break
                    else
                        log_error "Adresse IP de passerelle invalide"
                    fi
                done
                break
                ;;
            *)
                log_error "Choix invalide. Entrez 1 ou 2"
                ;;
        esac
    done
    
    # VLAN (optionnel)
    read -p "$(echo -e "${BOLD}VLAN ID${NC} (optionnel, appuyez sur Entrée pour ignorer): ")" LXC_VLAN
    
    if [[ -n "$LXC_VLAN" ]]; then
        if ! validate_number "$LXC_VLAN" 1 4094; then
            log_warning "VLAN ID invalide, ignoré"
            LXC_VLAN=""
        fi
    fi
    
    # Bridge réseau
    read -p "$(echo -e "${BOLD}Bridge réseau${NC} (défaut: vmbr0): ")" bridge_input
    if [[ -n "$bridge_input" ]]; then
        LXC_BRIDGE="$bridge_input"
    fi
    
    # Storage
    read -p "$(echo -e "${BOLD}Storage${NC} (défaut: local-lvm): ")" storage_input
    if [[ -n "$storage_input" ]]; then
        LXC_STORAGE="$storage_input"
    fi
}

# Affichage du résumé de configuration
show_configuration_summary() {
    echo
    log_header "Résumé de la configuration:"
    echo -e "${BOLD}ID:${NC} $LXC_ID"
    echo -e "${BOLD}Nom:${NC} $LXC_NAME"
    echo -e "${BOLD}CPU:${NC} $LXC_CPU"
    echo -e "${BOLD}RAM:${NC} ${LXC_RAM}MB"
    echo -e "${BOLD}Disque:${NC} ${LXC_DISK}GB"
    echo -e "${BOLD}Réseau:${NC} $LXC_IP_TYPE"
    
    if [[ "$LXC_IP_TYPE" == "static" ]]; then
        echo -e "${BOLD}IP:${NC} $LXC_IP"
        echo -e "${BOLD}Passerelle:${NC} $LXC_GATEWAY"
    fi
    
    if [[ -n "$LXC_VLAN" ]]; then
        echo -e "${BOLD}VLAN:${NC} $LXC_VLAN"
    fi
    
    echo -e "${BOLD}Bridge:${NC} $LXC_BRIDGE"
    echo -e "${BOLD}Storage:${NC} $LXC_STORAGE"
    echo
    
    read -p "$(echo -e "${BOLD}Confirmer la création du conteneur ?${NC} (y/N): ")" confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Installation annulée"
        exit 0
    fi
}

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier si on est root
    if [[ $EUID -ne 0 ]]; then
        log_error "Ce script doit être exécuté en tant que root"
        exit 1
    fi
    
    # Vérifier si pct est disponible
    if ! command -v pct &> /dev/null; then
        log_error "La commande 'pct' n'est pas disponible. Ce script nécessite Proxmox VE ou LXC"
        exit 1
    fi
    
    # Vérifier si le template existe
    if ! pveam list local | grep -q "$LXC_TEMPLATE"; then
        log_warning "Template $LXC_TEMPLATE non trouvé localement"
        log_info "Téléchargement du template..."
        pveam download local "$LXC_TEMPLATE" || {
            log_error "Échec du téléchargement du template"
            exit 1
        }
    fi
    
    log_success "Prérequis vérifiés"
}

# Création du conteneur LXC
create_lxc_container() {
    log_info "Création du conteneur LXC..."
    
    # Construction de la commande de création
    local create_cmd="pct create $LXC_ID local:vztmpl/$LXC_TEMPLATE"
    create_cmd+=" --hostname $LXC_NAME"
    create_cmd+=" --cores $LXC_CPU"
    create_cmd+=" --memory $LXC_RAM"
    create_cmd+=" --rootfs $LXC_STORAGE:$LXC_DISK"
    create_cmd+=" --ostype ubuntu"
    create_cmd+=" --arch amd64"
    create_cmd+=" --unprivileged 1"
    create_cmd+=" --onboot 1"
    create_cmd+=" --start 1"
    
    # Configuration réseau
    if [[ "$LXC_IP_TYPE" == "dhcp" ]]; then
        if [[ -n "$LXC_VLAN" ]]; then
            create_cmd+=" --net0 name=eth0,bridge=$LXC_BRIDGE,ip=dhcp,tag=$LXC_VLAN"
        else
            create_cmd+=" --net0 name=eth0,bridge=$LXC_BRIDGE,ip=dhcp"
        fi
    else
        if [[ -n "$LXC_VLAN" ]]; then
            create_cmd+=" --net0 name=eth0,bridge=$LXC_BRIDGE,ip=$LXC_IP,gw=$LXC_GATEWAY,tag=$LXC_VLAN"
        else
            create_cmd+=" --net0 name=eth0,bridge=$LXC_BRIDGE,ip=$LXC_IP,gw=$LXC_GATEWAY"
        fi
    fi
    
    # Exécution de la commande
    log_info "Exécution: $create_cmd"
    eval "$create_cmd" || {
        log_error "Échec de la création du conteneur"
        exit 1
    }
    
    log_success "Conteneur LXC créé avec l'ID $LXC_ID"
}

# Attendre que le conteneur soit prêt
wait_for_container() {
    log_info "Attente du démarrage du conteneur..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if pct exec "$LXC_ID" -- systemctl is-system-running --wait &>/dev/null; then
            log_success "Conteneur prêt"
            return 0
        fi
        
        sleep 2
        ((attempt++))
        echo -n "."
    done
    
    log_warning "Le conteneur met du temps à démarrer, on continue..."
}

# Installation de SelfUp dans le conteneur
install_selfup_in_container() {
    log_info "Installation de SelfUp dans le conteneur..."
    
    # Mise à jour du système
    log_info "Mise à jour du système..."
    pct exec "$LXC_ID" -- apt-get update -qq
    pct exec "$LXC_ID" -- apt-get upgrade -y -qq
    
    # Installation des dépendances de base
    log_info "Installation des dépendances..."
    pct exec "$LXC_ID" -- apt-get install -y -qq \
        curl \
        wget \
        git \
        unzip \
        sqlite3 \
        ca-certificates \
        gnupg \
        software-properties-common
    
    # Installation de Node.js
    log_info "Installation de Node.js..."
    pct exec "$LXC_ID" -- curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    pct exec "$LXC_ID" -- apt-get install -y nodejs
    
    # Clonage du repository SelfUp
    log_info "Téléchargement de SelfUp..."
    pct exec "$LXC_ID" -- git clone "$SELFUP_REPO" /tmp/selfup
    
    # Copie du script d'installation dans le conteneur
    local install_script_path="/tmp/selfup/scripts/install.sh"
    
    # Rendre le script exécutable et l'exécuter
    pct exec "$LXC_ID" -- chmod +x "$install_script_path"
    pct exec "$LXC_ID" -- bash "$install_script_path"
    
    log_success "SelfUp installé avec succès dans le conteneur"
}

# Affichage des informations finales
show_completion_info() {
    echo
    log_success "Installation terminée avec succès!"
    echo
    log_header "Informations du conteneur:"
    echo -e "${BOLD}ID:${NC} $LXC_ID"
    echo -e "${BOLD}Nom:${NC} $LXC_NAME"
    
    # Récupération de l'IP du conteneur
    local container_ip
    if [[ "$LXC_IP_TYPE" == "static" ]]; then
        container_ip=$(echo "$LXC_IP" | cut -d'/' -f1)
    else
        # Tentative de récupération de l'IP DHCP
        container_ip=$(pct exec "$LXC_ID" -- hostname -I | awk '{print $1}' 2>/dev/null || echo "IP non disponible")
    fi
    
    echo -e "${BOLD}IP:${NC} $container_ip"
    echo
    log_header "Accès à SelfUp:"
    echo -e "URL: ${BLUE}http://$container_ip:3001${NC}"
    echo
    log_header "Commandes utiles:"
    echo -e "Entrer dans le conteneur: ${BLUE}pct enter $LXC_ID${NC}"
    echo -e "Arrêter le conteneur: ${BLUE}pct stop $LXC_ID${NC}"
    echo -e "Démarrer le conteneur: ${BLUE}pct start $LXC_ID${NC}"
    echo -e "Statut SelfUp: ${BLUE}pct exec $LXC_ID -- systemctl status selfup${NC}"
    echo -e "Logs SelfUp: ${BLUE}pct exec $LXC_ID -- journalctl -u selfup -f${NC}"
    echo
}

# Fonction principale
main() {
    show_header
    configure_lxc
    show_configuration_summary
    check_prerequisites
    create_lxc_container
    wait_for_container
    install_selfup_in_container
    show_completion_info
}

# Gestion des signaux pour un arrêt propre
trap 'log_error "Installation interrompue"; exit 1' INT TERM

# Exécution du script principal
main "$@"