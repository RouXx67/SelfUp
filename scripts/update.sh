#!/bin/bash

# SelfUp Update Script
# Updates SelfUp to the latest version

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
BACKUP_DIR="$SELFUP_DIR/backups"

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

check_installation() {
    if [[ ! -d "$SELFUP_DIR" ]]; then
        log_error "SelfUp installation not found at $SELFUP_DIR"
        exit 1
    fi
    
    if ! systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        log_error "SelfUp service not found"
        exit 1
    fi
    
    log_success "SelfUp installation found"
}

create_backup() {
    log_info "Creating backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/selfup_backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current installation
    cp -r "$SELFUP_DIR/app" "$BACKUP_PATH"
    
    # Backup database
    if [[ -f "$SELFUP_DIR/data/selfup.db" ]]; then
        cp "$SELFUP_DIR/data/selfup.db" "$BACKUP_PATH/selfup.db.backup"
    fi
    
    # Backup environment file
    if [[ -f "$SELFUP_DIR/.env" ]]; then
        cp "$SELFUP_DIR/.env" "$BACKUP_PATH/.env.backup"
    fi
    
    chown -R "$SELFUP_USER:$SELFUP_USER" "$BACKUP_DIR"
    
    log_success "Backup created at $BACKUP_PATH"
}

stop_service() {
    log_info "Stopping SelfUp service..."
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        systemctl stop "$SERVICE_NAME"
        log_success "Service stopped"
    else
        log_warning "Service was not running"
    fi
}

update_application() {
    log_info "Updating application files..."
    
    # Determine source directory safely
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

    # Verify source files exist before removing current installation
    if [[ -f "$SOURCE_DIR/package.json" ]]; then
        log_info "Preparing updated SelfUp files from: $SOURCE_DIR"

        # Stage source into a temporary directory to avoid self-deletion while running from within the app
        TMP_DIR="$(mktemp -d -p /tmp selfup-update-XXXXXX)"
        log_info "Staging files into temporary directory: $TMP_DIR"
        cp -a "$SOURCE_DIR/." "$TMP_DIR/"

        # Optionally clean heavy folders from staging
        rm -rf "$TMP_DIR/node_modules" "$TMP_DIR/frontend/node_modules" "$TMP_DIR/backend/node_modules" 2>/dev/null || true

        # Remove old app directory
        rm -rf "$SELFUP_DIR/app"

        # Copy staged files to installation directory
        mkdir -p "$SELFUP_DIR/app"
        cp -a "$TMP_DIR/." "$SELFUP_DIR/app/"

        # Cleanup temporary directory
        rm -rf "$TMP_DIR"

        # Keep existing environment configuration if present
        if [[ -f "$SELFUP_DIR/.env" ]]; then
            log_info "Keeping existing environment configuration"
        fi

        # Set ownership
        chown -R "$SELFUP_USER:$SELFUP_USER" "$SELFUP_DIR/app"

        log_success "Application files updated"
    else
        log_error "SelfUp source files not found. Please run this script from the SelfUp directory."
        exit 1
    fi
}

update_dependencies() {
    log_info "Updating dependencies..."
    
    cd "$SELFUP_DIR/app"
    
    # Update backend dependencies
    sudo -u "$SELFUP_USER" npm install --production
    
    # Update and rebuild frontend
    cd frontend
    sudo -u "$SELFUP_USER" npm install
    sudo -u "$SELFUP_USER" npm run build
    
    log_success "Dependencies updated and frontend rebuilt"
}

migrate_database() {
    log_info "Checking for database migrations..."
    
    # Here you would add any database migration logic
    # For now, we'll just ensure the database directory exists
    
    DATA_DIR="$SELFUP_DIR/data"
    if [[ ! -d "$DATA_DIR" ]]; then
        mkdir -p "$DATA_DIR"
        chown "$SELFUP_USER:$SELFUP_USER" "$DATA_DIR"
        chmod 755 "$DATA_DIR"
    fi
    
    log_success "Database check completed"
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
        
        # Try to restore from backup
        log_warning "Attempting to restore from backup..."
        restore_from_backup
        exit 1
    fi
}

restore_from_backup() {
    log_info "Restoring from latest backup..."
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        rm -rf "$SELFUP_DIR/app"
        cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$SELFUP_DIR/app"
        chown -R "$SELFUP_USER:$SELFUP_USER" "$SELFUP_DIR/app"
        
        systemctl start "$SERVICE_NAME"
        log_success "Restored from backup: $LATEST_BACKUP"
    else
        log_error "No backup found for restoration"
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only the 5 most recent backups
    if [[ -d "$BACKUP_DIR" ]]; then
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        log_success "Old backups cleaned up"
    fi
}

print_completion_info() {
    log_success "SelfUp update completed!"
    echo
    echo -e "${GREEN}=== Update Summary ===${NC}"
    echo -e "Service: ${BLUE}$SERVICE_NAME${NC}"
    echo -e "Status: ${BLUE}$(systemctl is-active $SERVICE_NAME)${NC}"
    echo -e "Directory: ${BLUE}$SELFUP_DIR${NC}"
    echo
    echo -e "${GREEN}=== Useful Commands ===${NC}"
    echo -e "Check status: ${BLUE}systemctl status $SERVICE_NAME${NC}"
    echo -e "View logs: ${BLUE}journalctl -u $SERVICE_NAME -f${NC}"
    echo -e "Restart service: ${BLUE}systemctl restart $SERVICE_NAME${NC}"
    echo
    echo -e "${YELLOW}=== Backup Location ===${NC}"
    echo -e "Backups stored in: ${BLUE}$BACKUP_DIR${NC}"
}

# Main update process
main() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "     SelfUp Update Script        "
    echo "=================================="
    echo -e "${NC}"
    
    check_root
    check_installation
    create_backup
    stop_service
    update_application
    update_dependencies
    migrate_database
    start_service
    cleanup_old_backups
    print_completion_info
}

# Run main function
main "$@"