# ----- deps stage: install ALL deps (incl. dev) at repo root so workspaces resolve
FROM node:20-alpine AS deps
WORKDIR /app

# Root lockfile + workspace manifests
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# Install with workspaces (includes dev deps -> tsc available)
RUN npm ci --workspaces --include-workspace-root

# ----- build stage: compile backend
FROM node:20-alpine AS build
WORKDIR /app
# Bring node_modules from deps and backend sources
COPY --from=deps /app /app
COPY backend/ backend/

# Build only the backend workspace
WORKDIR /app/backend
RUN npm run build

# ----- runtime stage: prod-only deps, tiny image
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy manifests and install prod deps only
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --workspaces --include-workspace-root --omit=dev

# Copy compiled backend
WORKDIR /app/backend
COPY --from=build /app/backend/dist ./dist
# (copy any runtime-only assets if you have them)
# COPY --from=build /app/backend/package.json ./  # already copied above

EXPOSE 3000
CMD ["node", "dist/server.js"]
