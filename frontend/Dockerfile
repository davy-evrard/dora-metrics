FROM node:20-alpine
WORKDIR /app

# Root + workspace manifests
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# Install with workspaces (includes dev deps so Vite works)
RUN npm ci --workspaces --include-workspace-root

# Copy frontend sources
WORKDIR /app/frontend
COPY frontend/ ./

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
