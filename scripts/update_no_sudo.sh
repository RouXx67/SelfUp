#!/bin/bash

# SelfUp Update Script (No Sudo Version)
# Updates SelfUp without requiring root privileges
# Designed for containerized environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Auto-detect paths
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELFUP_DIR="$(dirname "$CURRENT_DIR")"
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

check_installation() {
    if [[ ! -f "$SELFUP_DIR/package.json" ]]; then
        log_error "SelfUp installation not found at $SELFUP_DIR"
        log_info "Current directory: $CURRENT_DIR"
        log_info "Expected SelfUp directory: $SELFUP_DIR"
        exit 1
    fi
    
    log_success "SelfUp installation found at $SELFUP_DIR"
}

create_backup() {
    log_info "Creating backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/selfup_backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current installation (excluding node_modules and logs)
    mkdir -p "$BACKUP_PATH"
    
    # Backup backend
    if [[ -d "$SELFUP_DIR/backend" ]]; then
        cp -r "$SELFUP_DIR/backend" "$BACKUP_PATH/"
    fi
    
    # Backup frontend source (not build)
    if [[ -d "$SELFUP_DIR/frontend/src" ]]; then
        mkdir -p "$BACKUP_PATH/frontend"
        cp -r "$SELFUP_DIR/frontend/src" "$BACKUP_PATH/frontend/"
        cp -r "$SELFUP_DIR/frontend/public" "$BACKUP_PATH/frontend/" 2>/dev/null || true
        cp "$SELFUP_DIR/frontend/package.json" "$BACKUP_PATH/frontend/" 2>/dev/null || true
    fi
    
    # Backup configuration files
    cp "$SELFUP_DIR/package.json" "$BACKUP_PATH/" 2>/dev/null || true
    cp "$SELFUP_DIR/.env" "$BACKUP_PATH/" 2>/dev/null || true
    cp "$SELFUP_DIR/.env.example" "$BACKUP_PATH/" 2>/dev/null || true
    
    # Backup database if it exists
    if [[ -f "$SELFUP_DIR/data/selfup.db" ]]; then
        mkdir -p "$BACKUP_PATH/data"
        cp "$SELFUP_DIR/data/selfup.db" "$BACKUP_PATH/data/"
    fi
    
    log_success "Backup created at $BACKUP_PATH"
}

# Diagnostic détaillé du port
port_diagnose() {
    local port=$1
    log_info "Diagnostic du port ${port}"
    if command -v ss >/dev/null 2>&1; then
        log_info "ss -ltnp | grep :${port}"
        ss -ltnp | grep ":${port} " || true
    fi
    if command -v lsof >/dev/null 2>&1; then
        log_info "lsof -iTCP:${port} -sTCP:LISTEN"
        lsof -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true
    fi
    if command -v fuser >/dev/null 2>&1; then
        log_info "fuser ${port}/tcp"
        fuser ${port}/tcp 2>/dev/null || true
    fi
}

update_dependencies() {
    log_info "Updating dependencies..."
    
    cd "$SELFUP_DIR"
    
    # Update backend dependencies
    if [[ -f "package.json" ]]; then
        log_info "Installing backend dependencies..."
        npm install --production --no-audit --no-fund
    fi
    
    # Update and rebuild frontend
    if [[ -d "frontend" ]]; then
        cd frontend
        if [[ -f "package.json" ]]; then
            log_info "Installing frontend dependencies (including dev)..."
            if [[ -f "package-lock.json" ]]; then
                npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund
            else
                npm install --include=dev --no-audit --no-fund
            fi
            
            # Ensure Vite is available even if npm runs in production mode
            if ! npx --yes vite --version >/dev/null 2>&1; then
                log_warning "Vite not found; installing it as a devDependency"
                npm install -D vite
            fi
            
            log_info "Building frontend..."
            npm run build
        fi
    fi
    
    log_success "Dependencies updated and frontend rebuilt"
}

migrate_database() {
    log_info "Checking database..."
    
    DATA_DIR="$SELFUP_DIR/data"
    if [[ ! -d "$DATA_DIR" ]]; then
        mkdir -p "$DATA_DIR"
        chmod 755 "$DATA_DIR" 2>/dev/null || true
    fi
    
    log_success "Database check completed"
}

# Utility: check if a TCP port is in use (localhost)
is_port_in_use() {
    local port=$1
    # Méthodes rapides
    timeout 1 bash -c "</dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1 && return 0
    command -v curl >/dev/null 2>&1 && curl -s --max-time 1 http://127.0.0.1:${port}/ >/dev/null 2>&1 && return 0
    command -v ss >/dev/null 2>&1 && ss -ltn | grep -q ":${port} " && return 0
    # Dernier recours: sonde Node (renvoie 0 si déjà occupé)
    if command -v node >/dev/null 2>&1; then
        node -e "const net=require('net');const p=${port};const s=net.createServer();s.once('error',e=>process.exit(0));s.once('listening',()=>s.close(()=>process.exit(1)));s.listen(p);" >/dev/null 2>&1
        [ $? -eq 0 ] && return 0
    fi
    return 1
}

# Trouver le PID écoutant sur un port donné
find_pid_by_port() {
    local port=$1
    local pid=""
    if command -v ss >/dev/null 2>&1; then
        pid=$(ss -ltnp | grep ":${port} " | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n1)
    fi
    if [[ -z "$pid" ]] && command -v lsof >/dev/null 2>&1; then
        pid=$(lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -n1)
    fi
    if [[ -z "$pid" ]] && command -v fuser >/dev/null 2>&1; then
        pid=$(fuser ${port}/tcp 2>/dev/null | tr -d ' ')
    fi
    echo "$pid"
}

find_free_port() {
    local start=${1:-3001}
    local end=${2:-3010}
    local p=$start
    while [ $p -le $end ]; do
        if is_port_in_use "$p"; then
            p=$((p+1))
            continue
        else
            echo "$p"
            return 0
        fi
    done
    # fallback to start if none found
    echo "$start"
}

start_application() {
    log_info "Starting application..."
    
    cd "$SELFUP_DIR"
    
    export NODE_ENV=production
    
    DEFAULT_PORT=3001
    PORT_TO_USE="${PORT:-}"
    if [[ -z "$PORT_TO_USE" ]] && [[ -f "$SELFUP_DIR/.env" ]]; then
        PORT_TO_USE=$(grep -E '^PORT=' "$SELFUP_DIR/.env" | tail -n1 | cut -d= -f2 | tr -d '\r')
    fi
    [[ -z "$PORT_TO_USE" ]] && PORT_TO_USE="$DEFAULT_PORT"

    log_info "Préparation du démarrage sur le port ${PORT_TO_USE}"
    port_diagnose "$PORT_TO_USE"

    for i in 1 2 3; do
        if is_port_in_use "$PORT_TO_USE"; then
            log_warning "Port ${PORT_TO_USE} occupé; tentative de libération (${i}/3)"
            PID_BY_PORT=$(find_pid_by_port "$PORT_TO_USE")
            if [[ -n "$PID_BY_PORT" ]]; then
                log_info "Arrêt du PID=${PID_BY_PORT} sur le port ${PORT_TO_USE}"
                kill -TERM "$PID_BY_PORT" 2>/dev/null || true
                sleep 3
                if kill -0 "$PID_BY_PORT" 2>/dev/null; then
                    kill -KILL "$PID_BY_PORT" 2>/dev/null || true
                fi
            } else {
                stop_application
            fi
            sleep 2
            port_diagnose "$PORT_TO_USE"
        else
            break
        fi
    done

    if is_port_in_use "$PORT_TO_USE"; then
        log_error "Le port ${PORT_TO_USE} reste occupé; restauration du backup"
        restore_from_backup
        exit 1
    fi

    export PORT="$PORT_TO_USE"

    nohup env PORT="$PORT_TO_USE" NODE_ENV=production node backend/server.js > logs/app.log 2>&1 &
    APP_PID=$!

    sleep 3

    if kill -0 "$APP_PID" 2>/dev/null; then
        log_success "Application démarrée (PID: $APP_PID) sur le port $PORT_TO_USE"
        echo "$APP_PID" > "$SELFUP_DIR/app.pid"
    else
        log_error "Échec du démarrage de l'application"
        log_info "Consultez les logs: $SELFUP_DIR/logs/app.log"
        if [[ -f "$SELFUP_DIR/logs/app.log" ]]; then
            log_info "Dernières 60 lignes de app.log:"
            tail -n 60 "$SELFUP_DIR/logs/app.log" || true
        fi
        log_warning "Restauration depuis le backup..."
        restore_from_backup
        exit 1
    fi
}

restore_from_backup() {
    log_info "Restoring from latest backup..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n1)
        if [[ -n "$LATEST_BACKUP" ]]; then
            # Restore backend
            if [[ -d "$BACKUP_DIR/$LATEST_BACKUP/backend" ]]; then
                rm -rf "$SELFUP_DIR/backend"
                cp -r "$BACKUP_DIR/$LATEST_BACKUP/backend" "$SELFUP_DIR/"
            fi
            
            # Restore frontend source
            if [[ -d "$BACKUP_DIR/$LATEST_BACKUP/frontend" ]]; then
                rm -rf "$SELFUP_DIR/frontend/src"
                cp -r "$BACKUP_DIR/$LATEST_BACKUP/frontend/src" "$SELFUP_DIR/frontend/"
            fi
            
            # Restore config files
            cp "$BACKUP_DIR/$LATEST_BACKUP/package.json" "$SELFUP_DIR/" 2>/dev/null || true
            cp "$BACKUP_DIR/$LATEST_BACKUP/.env" "$SELFUP_DIR/" 2>/dev/null || true
            
            log_success "Restored from backup: $LATEST_BACKUP"
        else
            log_error "No backup found for restoration"
        fi
    else
        log_error "Backup directory not found"
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
    echo -e "Directory: ${BLUE}$SELFUP_DIR${NC}"
    
    if [[ -f "$SELFUP_DIR/app.pid" ]]; then
        PID=$(cat "$SELFUP_DIR/app.pid")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "Status: ${GREEN}Running (PID: $PID)${NC}"
        else
            echo -e "Status: ${RED}Not Running${NC}"
        fi
    else
        echo -e "Status: ${YELLOW}Unknown${NC}"
    fi
    
    echo
    echo -e "${GREEN}=== Useful Commands ===${NC}"
    echo -e "Check processes: ${BLUE}ps aux | grep node${NC}"
    echo -e "View logs: ${BLUE}tail -f $SELFUP_DIR/logs/app.log${NC}"
    echo -e "Stop app: ${BLUE}kill \$(cat $SELFUP_DIR/app.pid)${NC}"
    echo
    echo -e "${YELLOW}=== Backup Location ===${NC}"
    echo -e "Backups stored in: ${BLUE}$BACKUP_DIR${NC}"
}

# Main update process
main() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "   SelfUp Update Script (No Sudo) "
    echo "=================================="
    echo -e "${NC}"
    
    # Create logs directory
    mkdir -p "$SELFUP_DIR/logs"
    
    check_installation
    create_backup
    stop_application
    update_dependencies
    migrate_database
    start_application
    cleanup_old_backups
    print_completion_info
}

# Run main function
main "$@"