# AI Rules & Tech Stack Guidelines

## Tech Stack Overview

• **Backend**: Node.js with Express.js framework for REST API services
• **Frontend**: React 18 with React Router for SPA navigation
• **Database**: SQLite3 for lightweight, file-based data storage
• **Styling**: Tailwind CSS for utility-first responsive design
• **Build Tools**: Vite for frontend development and build process
• **API Communication**: Axios for HTTP requests between frontend and backend
• **Scheduling**: node-cron for automated update checking tasks
• **Notifications**: Gotify integration for push notifications
• **Containerization**: Docker support with multi-stage builds
• **Deployment**: Systemd service management for production deployment

## Library Usage Rules

### Backend Libraries
- **Express.js**: Only for REST API routes and middleware
- **SQLite3**: Only for database operations, no other databases allowed
- **Axios**: Only for external HTTP requests to providers (GitHub, Docker Hub)
- **Cheerio**: Only for HTML parsing in generic provider
- **node-cron**: Only for scheduled update checking tasks
- **No additional backend libraries** without explicit approval

### Frontend Libraries
- **React**: Only functional components with hooks
- **React Router**: Only for client-side routing
- **Axios**: Only for API calls to backend
- **Tailwind CSS**: Only for styling, no custom CSS files except index.css
- **react-icons**: Only for icons, prefer Fi icons (Feather Icons)
- **react-hot-toast**: Only for notifications and user feedback
- **date-fns**: Only for date formatting and manipulation
- **No additional frontend libraries** without explicit approval

### Provider System Rules
- Each provider must be a separate class file in backend/providers/
- Providers must implement getLatestVersion() and validateUrl() methods
- Providers must handle their own error cases and timeouts
- Providers must return consistent version information format
- No external dependencies allowed within provider files

### UI Component Rules
- All components must be functional React components
- Use Tailwind CSS exclusively for styling
- Components should be in separate files in frontend/src/components/
- Reuse existing components when possible
- Follow existing patterns for forms, cards, and data display

### API Design Rules
- All API routes must be RESTful
- Use consistent JSON response format
- Implement proper error handling with HTTP status codes
- Keep routes organized by resource in backend/routes/
- Use middleware for common functionality (validation, logging)

### Security Rules
- Never expose database queries directly in API responses
- Validate all user inputs on both frontend and backend
- Use environment variables for configuration
- Implement proper CORS and helmet security middleware
- No sensitive data should be stored in frontend code

### Update System Rules
- Update checking must be non-blocking and asynchronous
- Handle network timeouts gracefully
- Log all update check activities
- Send notifications only for actual version changes
- Respect rate limits of external services

### Testing Guidelines
- Manual testing required for all new features
- Test both success and error cases
- Verify cross-browser compatibility
- Test responsive design on different screen sizes
- Validate API responses match expected formats