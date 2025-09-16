#!/bin/bash

# SelfUp Installation Script
# Compatible with Debian/Ubuntu (including LXC containers)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SELFUP_USER="selfup"
SELFUP_DIR="/opt/selfup"
SERVICE_NAME="selfup"
NODE_VERSION="18"

# Functions
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

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "Cannot detect OS version"
        exit 1
    fi
    
    log_info "Detected OS: $OS $VERSION"
    
    if [[ "$OS" != "ubuntu" && "$OS" != "debian" ]]; then
        log_warning "This script is designed for Ubuntu/Debian. Proceeding anyway..."
    fi
}

update_system() {
    log_info "Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq
    log_success "System updated"
}

install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Install basic dependencies
    apt-get install -y -qq \
        curl \
        wget \
        gnupg \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        git \
        unzip \
        sqlite3
    
    log_success "System dependencies installed"
}

install_nodejs() {
    log_info "Installing Node.js $NODE_VERSION..."
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$CURRENT_VERSION" -ge "$NODE_VERSION" ]]; then
            log_success "Node.js $CURRENT_VERSION is already installed"
            return
        else
            log_warning "Node.js $CURRENT_VERSION detected, upgrading to version $NODE_VERSION..."
            # Remove conflicting packages
            apt-get remove -y nodejs nodejs-doc libnode72 || true
            apt-get autoremove -y || true
        fi
    fi
    
    # Clean any existing NodeSource repository
    rm -f /etc/apt/sources.list.d/nodesource.list
    
    # Install Node.js from NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    
    # Force install to resolve conflicts
    apt-get install -y --fix-broken nodejs || {
        log_warning "Conflict detected, attempting to resolve..."
        apt-get remove -y libnode72 nodejs-doc || true
        apt-get install -y nodejs
    }
    
    # Verify installation
    if command -v node &> /dev/null; then
        NODE_INSTALLED_VERSION=$(node -v)
        NPM_INSTALLED_VERSION=$(npm -v)
        log_success "Node.js $NODE_INSTALLED_VERSION and npm $NPM_INSTALLED_VERSION installed"
    else
        log_error "Failed to install Node.js"
        exit 1
    fi
}

create_user() {
    log_info "Creating SelfUp user..."
    
    if id "$SELFUP_USER" &>/dev/null; then
        log_warning "User $SELFUP_USER already exists"
    else
        useradd --system --shell /bin/bash --home-dir "$SELFUP_DIR" --create-home "$SELFUP_USER"
        log_success "User $SELFUP_USER created"
    fi
}

download_selfup() {
    log_info "Setting up SelfUp application..."
    
    # Create directory if it doesn't exist
    mkdir -p "$SELFUP_DIR"
    
    # If this script is run from the SelfUp directory, copy files
    if [[ -f "$(dirname "$0")/../package.json" ]]; then
        log_info "Copying SelfUp files from current directory..."
        cp -r "$(dirname "$0")/.." "$SELFUP_DIR/app"
    else
        # Download from GitHub if not running from local directory
        log_info "Downloading SelfUp from GitHub..."
        
        # Install git if not present
        if ! command -v git &> /dev/null; then
            apt-get install -y git
        fi
        
        # Clone the repository
        git clone https://github.com/RouXx67/SelfUp.git "$SELFUP_DIR/app" || {
            log_error "Failed to download SelfUp from GitHub"
            exit 1
        }
    fi
    
    # Set ownership
    chown -R "$SELFUP_USER:$SELFUP_USER" "$SELFUP_DIR"
    
    log_success "SelfUp files ready"
}

install_app_dependencies() {
    log_info "Installing application dependencies..."
    
    cd "$SELFUP_DIR/app"
    
    # Install backend dependencies
    sudo -u "$SELFUP_USER" npm install --production
    
    # Install frontend dependencies and build
    cd frontend
    sudo -u "$SELFUP_USER" npm install
    sudo -u "$SELFUP_USER" npm run build
    
    log_success "Application dependencies installed and frontend built"
}

setup_environment() {
    log_info "Setting up environment configuration..."
    
    ENV_FILE="$SELFUP_DIR/.env"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        cat > "$ENV_FILE" << EOF
# SelfUp Configuration
PORT=3001
NODE_ENV=production

# Database
DB_PATH=$SELFUP_DIR/data/selfup.db

# Gotify Configuration (optional)
# GOTIFY_URL=http://localhost:8080
# GOTIFY_TOKEN=your_gotify_token_here

# Update Check Configuration
CHECK_INTERVAL_HOURS=6
DEFAULT_TIMEOUT=10000

# Frontend URL (for CORS if needed)
FRONTEND_URL=http://localhost:3001
EOF
        
        chown "$SELFUP_USER:$SELFUP_USER" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
        
        log_success "Environment file created at $ENV_FILE"
        log_warning "Please edit $ENV_FILE to configure Gotify if needed"
    else
        log_warning "Environment file already exists at $ENV_FILE"
    fi
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=SelfUp - Self-hosted Services Update Monitor
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SELFUP_USER
Group=$SELFUP_USER
WorkingDirectory=$SELFUP_DIR/app
Environment=NODE_ENV=production
EnvironmentFile=$SELFUP_DIR/.env
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=selfup

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$SELFUP_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log_success "Systemd service created and enabled"
}

setup_data_directory() {
    log_info "Setting up data directory..."
    
    DATA_DIR="$SELFUP_DIR/data"
    mkdir -p "$DATA_DIR"
    chown "$SELFUP_USER:$SELFUP_USER" "$DATA_DIR"
    chmod 755 "$DATA_DIR"
    
    log_success "Data directory created"
}

start_service() {
    log_info "Starting SelfUp service..."
    
    systemctl start "$SERVICE_NAME"
    sleep 3
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "SelfUp service started successfully"
    else
        log_error "Failed to start SelfUp service"
        log_info "Check logs with: journalctl -u $SERVICE_NAME -f"
        exit 1
    fi
}

setup_firewall() {
    log_info "Configuring firewall (if ufw is installed)..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 3001/tcp comment "SelfUp"
        log_success "Firewall rule added for port 3001"
    else
        log_warning "UFW not installed, skipping firewall configuration"
        log_warning "Make sure port 3001 is accessible if needed"
    fi
}

print_completion_info() {
    log_success "SelfUp installation completed!"
    echo
    echo -e "${GREEN}=== Installation Summary ===${NC}"
    echo -e "Service: ${BLUE}$SERVICE_NAME${NC}"
    echo -e "Directory: ${BLUE}$SELFUP_DIR${NC}"
    echo -e "User: ${BLUE}$SELFUP_USER${NC}"
    echo -e "Port: ${BLUE}3001${NC}"
    echo -e "Config: ${BLUE}$SELFUP_DIR/.env${NC}"
    echo
    echo -e "${GREEN}=== Next Steps ===${NC}"
    echo -e "1. Edit configuration: ${BLUE}nano $SELFUP_DIR/.env${NC}"
    echo -e "2. Access SelfUp: ${BLUE}http://$(hostname -I | awk '{print $1}'):3001${NC}"
    echo -e "3. Check service status: ${BLUE}systemctl status $SERVICE_NAME${NC}"
    echo -e "4. View logs: ${BLUE}journalctl -u $SERVICE_NAME -f${NC}"
    echo
    echo -e "${YELLOW}=== Useful Commands ===${NC}"
    echo -e "Start service: ${BLUE}systemctl start $SERVICE_NAME${NC}"
    echo -e "Stop service: ${BLUE}systemctl stop $SERVICE_NAME${NC}"
    echo -e "Restart service: ${BLUE}systemctl restart $SERVICE_NAME${NC}"
    echo -e "Update SelfUp: ${BLUE}$SELFUP_DIR/scripts/update.sh${NC}"
}

# Main installation process
main() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "    SelfUp Installation Script    "
    echo "=================================="
    echo -e "${NC}"
    
    check_root
    detect_os
    update_system
    install_dependencies
    install_nodejs
    create_user
    download_selfup
    install_app_dependencies
    setup_environment
    setup_data_directory
    create_systemd_service
    setup_firewall
    start_service
    print_completion_info
}

# Run main function
main "$@"