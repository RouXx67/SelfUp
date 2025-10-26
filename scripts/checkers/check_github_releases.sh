#!/bin/bash

# GitHub Releases Checker Script
# Example script for checking GitHub releases manually

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

usage() {
    echo "Usage: $0 <owner/repo> [current_version]"
    echo
    echo "Examples:"
    echo "  $0 Radarr/Radarr"
    echo "  $0 Radarr/Radarr 4.6.4"
    echo "  $0 linuxserver/docker-radarr"
    exit 1
}

check_github_release() {
    local repo="$1"
    local current_version="$2"
    
    log_info "Checking GitHub releases for $repo..."
    
    # GitHub API URL
    local api_url="https://api.github.com/repos/$repo/releases/latest"
    
    # Fetch latest release info
    local response
    if ! response=$(curl -s "$api_url"); then
        log_error "Failed to fetch release information"
        return 1
    fi
    
    # Check if API returned an error
    if echo "$response" | grep -q '"message"'; then
        local error_message=$(echo "$response" | grep '"message"' | cut -d'"' -f4)
        log_error "GitHub API error: $error_message"
        return 1
    fi
    
    # Extract information
    local tag_name=$(echo "$response" | grep '"tag_name"' | cut -d'"' -f4)
    local name=$(echo "$response" | grep '"name"' | cut -d'"' -f4 | head -n1)
    local published_at=$(echo "$response" | grep '"published_at"' | cut -d'"' -f4)
    local html_url=$(echo "$response" | grep '"html_url"' | cut -d'"' -f4 | head -n1)
    local prerelease=$(echo "$response" | grep '"prerelease"' | cut -d':' -f2 | cut -d',' -f1 | tr -d ' ')
    
    # Clean version (remove 'v' prefix if present)
    local latest_version="$tag_name"
    if [[ "$latest_version" == v* ]]; then
        latest_version="${latest_version:1}"
    fi
    
    # Display results
    echo
    echo -e "${GREEN}=== GitHub Release Information ===${NC}"
    echo -e "Repository: ${BLUE}$repo${NC}"
    echo -e "Latest Version: ${BLUE}$latest_version${NC}"
    echo -e "Release Name: ${BLUE}$name${NC}"
    echo -e "Published: ${BLUE}$published_at${NC}"
    echo -e "Prerelease: ${BLUE}$prerelease${NC}"
    echo -e "URL: ${BLUE}$html_url${NC}"
    
    # Compare versions if current version provided
    if [[ -n "$current_version" ]]; then
        echo
        if [[ "$current_version" == "$latest_version" ]]; then
            log_success "You are running the latest version ($current_version)"
        else
            log_warning "Update available: $current_version → $latest_version"
            echo -e "Release URL: ${BLUE}$html_url${NC}"
        fi
    fi
    
    # Show download assets if available
    local assets_count=$(echo "$response" | grep -c '"browser_download_url"' || true)
    if [[ "$assets_count" -gt 0 ]]; then
        echo
        echo -e "${GREEN}=== Download Assets ===${NC}"
        echo "$response" | grep '"browser_download_url"' | cut -d'"' -f4 | while read -r url; do
            local filename=$(basename "$url")
            echo -e "  ${BLUE}$filename${NC}: $url"
        done
    fi
}

# Main script
main() {
    if [[ $# -lt 1 ]]; then
        usage
    fi
    
    local repo="$1"
    local current_version="$2"
    
    # Validate repo format
    if [[ ! "$repo" =~ ^[^/]+/[^/]+$ ]]; then
        log_error "Invalid repository format. Use: owner/repo"
        usage
    fi
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    check_github_release "$repo" "$current_version"
}

# Run main function
main "$@"