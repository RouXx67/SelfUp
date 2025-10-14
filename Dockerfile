FROM node:20-slim

WORKDIR /app

# Copy manifests and install deps (root + frontend)
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm run install:all

# Copy sources after installing deps
COPY . .

# Improve file watching inside containers
ENV CHOKIDAR_USEPOLLING=true

# Expose dev ports
EXPOSE 5173
EXPOSE 3001

# Run dev servers (backend + frontend)
CMD ["npm", "run", "dev -- --host 0.0.0.0 --port 5173 --strictPort"]
