FROM node:20-slim

WORKDIR /app

# Copy manifests for root and frontend to leverage Docker layer caching
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install all dependencies (root + frontend)
RUN npm run install:all

# Copy the rest of the project
COPY . .

# Expose Vite dev server port only
EXPOSE 5173

# Improve file watching in containers (optional but useful)
ENV CHOKIDAR_USEPOLLING=true

# Run dev servers (backend + frontend) via concurrently
CMD ["npm", "run", "dev"]
