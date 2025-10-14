#!/bin/bash

# Docker Hub Checker Script
# Example script for checking Docker Hub images manually

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
    echo "Usage: $0 <image> [current_tag]"
    echo
    echo "Examples:"
    echo "  $0 linuxserver/radarr"
    echo "  $0 linuxserver/radarr latest"
    echo "  $0 nginx 1.21"
    echo "  $0 library/nginx"
    exit 1
}

parse_image_name() {
    local image="$1"
    
    if [[ "$image" == *"/"* ]]; then
        # Format: namespace/repository
        namespace=$(echo "$image" | cut -d'/' -f1)
        repository=$(echo "$image" | cut -d'/' -f2)
    else
        # Official image (library namespace)
        namespace="library"
        repository="$image"
    fi
    
    echo "$namespace $repository"
}

check_dockerhub_tags() {
    local image="$1"
    local current_tag="$2"
    
    log_info "Checking Docker Hub tags for $image..."
    
    # Parse image name
    read -r namespace repository <<< "$(parse_image_name "$image")"
    
    # Docker Hub API URL
    local api_url="https://hub.docker.com/v2/repositories/$namespace/$repository/tags/?page_size=25&ordering=-last_updated"
    
    # Fetch tags info
    local response
    if ! response=$(curl -s "$api_url"); then
        log_error "Failed to fetch tags information"
        return 1
    fi
    
    # Check if API returned an error
    if echo "$response" | grep -q '"detail"'; then
        local error_message=$(echo "$response" | grep '"detail"' | cut -d'"' -f4)
        log_error "Docker Hub API error: $error_message"
        return 1
    fi
    
    # Extract repository information
    local repo_url="https://hub.docker.com/v2/repositories/$namespace/$repository/"
    local repo_response
    if repo_response=$(curl -s "$repo_url"); then
        local description=$(echo "$repo_response" | grep '"description"' | cut -d'"' -f4 | head -n1)
        local star_count=$(echo "$repo_response" | grep '"star_count"' | cut -d':' -f2 | cut -d',' -f1 | tr -d ' ')
        local pull_count=$(echo "$repo_response" | grep '"pull_count"' | cut -d':' -f2 | cut -d',' -f1 | tr -d ' ')
    fi
    
    # Display repository info
    echo
    echo -e "${GREEN}=== Docker Hub Repository Information ===${NC}"
    echo -e "Image: ${BLUE}$namespace/$repository${NC}"
    if [[ -n "$description" ]]; then
        echo -e "Description: ${BLUE}$description${NC}"
    fi
    if [[ -n "$star_count" ]]; then
        echo -e "Stars: ${BLUE}$star_count${NC}"
    fi
    if [[ -n "$pull_count" ]]; then
        echo -e "Pulls: ${BLUE}$pull_count${NC}"
    fi
    
    # Extract and display tags
    echo
    echo -e "${GREEN}=== Recent Tags ===${NC}"
    
    local tags_found=false
    local latest_semantic_tag=""
    
    # Parse tags from JSON response
    echo "$response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -n10 | while read -r tag; do
        tags_found=true
        
        # Get tag details
        local tag_info=$(echo "$response" | grep -A 10 "\"name\":\"$tag\"")
        local last_updated=$(echo "$tag_info" | grep '"last_updated"' | cut -d'"' -f4 | head -n1)
        local full_size=$(echo "$tag_info" | grep '"full_size"' | cut -d':' -f2 | cut -d',' -f1 | tr -d ' ')
        
        # Format size
        local size_mb=""
        if [[ -n "$full_size" && "$full_size" != "null" ]]; then
            size_mb=$(( full_size / 1024 / 1024 ))
            size_mb="${size_mb}MB"
        fi
        
        # Format date
        local formatted_date=""
        if [[ -n "$last_updated" ]]; then
            formatted_date=$(date -d "$last_updated" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$last_updated")
        fi
        
        # Display tag info
        echo -e "  ${BLUE}$tag${NC}"
        if [[ -n "$formatted_date" ]]; then
            echo -e "    Updated: $formatted_date"
        fi
        if [[ -n "$size_mb" ]]; then
            echo -e "    Size: $size_mb"
        fi
        
        # Check if this is a semantic version tag
        if [[ "$tag" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] && [[ -z "$latest_semantic_tag" ]]; then
            latest_semantic_tag="$tag"
        fi
        
        echo
    done
    
    # Compare with current tag if provided
    if [[ -n "$current_tag" ]]; then
        echo -e "${GREEN}=== Version Comparison ===${NC}"
        
        # Find the current tag in the list
        if echo "$response" | grep -q "\"name\":\"$current_tag\""; then
            log_success "Current tag '$current_tag' exists on Docker Hub"
            
            # If we found a latest semantic version, compare
            if [[ -n "$latest_semantic_tag" && "$latest_semantic_tag" != "$current_tag" ]]; then
                log_warning "Newer semantic version available: $current_tag → $latest_semantic_tag"
            fi
        else
            log_warning "Current tag '$current_tag' not found in recent tags"
        fi
    fi
    
    # Show Docker pull command
    echo -e "${GREEN}=== Docker Commands ===${NC}"
    echo -e "Pull latest: ${BLUE}docker pull $namespace/$repository${NC}"
    if [[ -n "$latest_semantic_tag" ]]; then
        echo -e "Pull specific version: ${BLUE}docker pull $namespace/$repository:$latest_semantic_tag${NC}"
    fi
}

# Main script
main() {
    if [[ $# -lt 1 ]]; then
        usage
    fi
    
    local image="$1"
    local current_tag="$2"
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    check_dockerhub_tags "$image" "$current_tag"
}

# Run main function
main "$@"