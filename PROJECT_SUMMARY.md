# SelfUp - Project Summary

## Overview
SelfUp is a comprehensive web application designed for tracking updates of self-hosted services. Created by a passionate self-hoster rather than a professional developer, it centralizes monitoring of applications and sends notifications via Gotify when new versions are available.

## Core Features

### Dashboard & Application Management
- **Intuitive Dashboard**: Centralized view of all monitored applications with status indicators
- **Application Tracking**: Add, edit, and remove applications to monitor
- **Version Management**: Track current and latest versions of each service
- **Application Status**: Enable/disable monitoring for individual applications
- **Bulk Operations**: Check updates for all applications simultaneously

### Update Checking System
- **Automated Checks**: Scheduled update verification based on configurable intervals (default: every 6 hours)
- **Manual Verification**: On-demand update checks through the interface
- **Multi-Provider Support**:
  - GitHub Releases (for applications hosted on GitHub)
  - Docker Hub (for Docker container images)
  - Generic API/Web (for custom APIs or web pages)
- **Version Ignore**: Ability to ignore specific versions to prevent repeated notifications

### Notification System
- **Gotify Integration**: Push notifications sent to Gotify server when updates are detected
- **Detailed Notifications**: Include version changes, changelog links, and update URLs
- **Test Notifications**: Verify Gotify configuration through test messages
- **Notification History**: Track which updates have been notified

### Preset System
- **Pre-configured Applications**: Library of popular self-hosted applications with ready-to-use configurations
- **Category Organization**: Applications organized by categories (media, network, security, etc.)
- **One-click Setup**: Apply presets with custom naming and URLs
- **Extensible Library**: Easy to add new presets to the JSON configuration

### Update History
- **Comprehensive Log**: Detailed history of all detected updates
- **Version Tracking**: See transition from old to new versions
- **Timestamp Information**: When updates were detected
- **Notification Status**: Track which updates have been notified

### System Management
- **Self-Update Capability**: Built-in system to update SelfUp itself
- **Health Monitoring**: System status checks and API health verification
- **Theme Support**: Light/dark mode toggle with system preference detection
- **Configuration Management**: Environment-based configuration through .env files

### Installation & Deployment
- **Multiple Installation Methods**:
  - Standard manual installation
  - Automated LXC/Proxmox container setup
  - Docker deployment options
- **Systemd Service**: Proper service management for production deployment
- **Environment Configuration**: Flexible configuration through environment variables

### Technical Features
- **Responsive Design**: Works on desktop and mobile devices
- **RESTful API**: Complete backend API for all frontend interactions
- **Database Storage**: SQLite-based storage for applications and update history
- **Cron Scheduling**: Automated background tasks for update checking
- **Error Handling**: Comprehensive error handling and user feedback
- **Security Measures**: Helmet.js protection, CORS configuration, input validation

## Supported Providers
1. **GitHub**: Track releases from GitHub repositories
2. **Docker Hub**: Monitor Docker image tags and versions
3. **Generic**: Custom API endpoints or web pages for version checking

## User Interface
- **Modern Dashboard**: Clean, intuitive interface with card-based layout
- **Dark/Light Mode**: Theme switching with automatic system preference detection
- **Responsive Design**: Works on various screen sizes
- **Interactive Elements**: Hover effects, loading states, and visual feedback
- **Form Validation**: Client-side validation for user inputs

## Configuration Options
- **Update Interval**: Configurable check frequency through environment variables
- **Database Path**: Customizable database location
- **Gotify Settings**: Notification server URL and token configuration
- **Network Timeouts**: Configurable timeout settings for API requests

## Deployment Flexibility
- **Container Support**: Docker and LXC/Proxmox deployment options
- **Systemd Integration**: Proper service management on Linux systems
- **Reverse Proxy Ready**: Compatible with Nginx/Apache reverse proxy setups
- **Multi-architecture**: Works on various system architectures

## Technical Stack
- **Backend**: Node.js with Express.js
- **Frontend**: React 18 with Vite
- **Database**: SQLite3
- **Styling**: Tailwind CSS
- **API Communication**: Axios
- **Scheduling**: node-cron
- **Notifications**: Gotify integration

## Unique Value Proposition
SelfUp stands out by focusing specifically on update monitoring for self-hosted services, providing a dedicated solution for a common need in the self-hosting community. Its preset system and multi-provider support make it easy to monitor a wide variety of applications with minimal configuration.