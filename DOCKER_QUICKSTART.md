# Docker Quick Start Guide

## Prerequisites

- Docker Desktop installed and running
- GitHub Personal Access Token
- CircleCI API Token

## Step-by-Step Launch

### 1. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` file with your credentials:

```env
# GitHub Integration (REQUIRED)
GITHUB_TOKEN=ghp_yourGitHubTokenHere123456789
GITHUB_ORG=your-github-organization
GITHUB_REPOS=repo1,repo2,repo3

# CircleCI Integration (REQUIRED)
CIRCLECI_TOKEN=your_circleci_token_here
CIRCLECI_ORG=your-circleci-org

# Database (already configured)
DATABASE_URL=postgresql://dora:dora_password@postgres:5432/dora_metrics

# Server (already configured)
PORT=3000
NODE_ENV=production
```

### 2. Launch with Docker

**Option A: Use the launch script (Recommended)**
```bash
./docker-launch.sh
```

**Option B: Manual launch**
```bash
# Build and start all services
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

### 3. Verify Services

The script will automatically check, or you can verify manually:

```bash
# Check if all containers are running
docker-compose ps

# Should show:
# - dora-metrics-db (postgres)
# - dora-metrics-backend (node)
# - dora-metrics-frontend (node)

# Check backend health
curl http://localhost:3000/health
```

### 4. Create Your First Team

```bash
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Team",
    "description": "Main product team",
    "github_repos": ["your-repo-1", "your-repo-2"]
  }'
```

Response will include the team ID (usually `1` for first team).

### 5. Trigger Initial Sync

```bash
# Sync all data sources for team ID 1
curl -X POST http://localhost:3000/api/sync/all/1
```

Wait 10-15 seconds for initial data collection.

### 6. Open Dashboard

Visit: **http://localhost:5173**

You should see:
- Team selector in the navigation
- Metrics cards showing deployment frequency, lead time, etc.
- Interactive charts with 30-day trends
- Sync button to manually refresh data

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend Dashboard | http://localhost:5173 | None required |
| Backend API | http://localhost:3000 | None required |
| PostgreSQL Database | localhost:5432 | user: `dora`, password: `dora_password`, db: `dora_metrics` |

## Useful Docker Commands

```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Access backend container shell
docker exec -it dora-metrics-backend sh

# Access database
docker exec -it dora-metrics-db psql -U dora -d dora_metrics
```

## Troubleshooting

### Backend not starting

```bash
# Check backend logs
docker-compose logs backend

# Common issues:
# 1. Missing .env file
# 2. Invalid GitHub/CircleCI tokens
# 3. Database not ready
```

### Database connection issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Should show "healthy" status

# Restart database
docker-compose restart postgres
```

### Frontend can't connect to backend

```bash
# Check if backend is healthy
curl http://localhost:3000/health

# Check frontend environment
docker-compose logs frontend
```

### Port already in use

```bash
# Check what's using the ports
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :5432  # Database

# Stop conflicting services or change ports in docker-compose.yml
```

### Need to reset everything

```bash
# Nuclear option - removes everything including data
docker-compose down -v
rm -rf node_modules
docker-compose up -d --build
```

## Database Operations

### Run migrations

```bash
# Migrations run automatically on first backend start
# To run manually:
docker exec -it dora-metrics-backend npm run migrate
```

### Connect to database

```bash
docker exec -it dora-metrics-db psql -U dora -d dora_metrics

# Useful SQL queries:
# \dt                    -- List all tables
# SELECT * FROM teams;   -- View teams
# SELECT * FROM dora_metrics ORDER BY date DESC LIMIT 10;
```

### Backup database

```bash
docker exec dora-metrics-db pg_dump -U dora dora_metrics > backup.sql
```

### Restore database

```bash
cat backup.sql | docker exec -i dora-metrics-db psql -U dora -d dora_metrics
```

## Performance Tips

### For Hackathon Demo

1. **Start early**: First data sync takes 2-5 minutes
2. **Manual sync**: Use the Sync button before presenting
3. **Sample data**: Start with 1-2 repos for faster syncing
4. **Keep it running**: Don't stop containers during demo

### For Development

1. **Logs**: Keep logs open: `docker-compose logs -f`
2. **Hot reload**: Both frontend and backend support hot reload
3. **Database**: Postgres data persists in volume `postgres_data`

## What Gets Built

When you run `docker-compose up -d --build`:

1. **PostgreSQL** (postgres:15-alpine)
   - Creates database `dora_metrics`
   - Runs schema migrations
   - Sets up tables and indexes

2. **Backend** (Node.js 20)
   - Installs npm dependencies
   - Builds TypeScript code
   - Starts Express server on port 3000
   - Starts WebSocket server
   - Starts cron jobs for auto-sync

3. **Frontend** (Node.js 20)
   - Installs npm dependencies
   - Starts Vite dev server on port 5173
   - Hot reload enabled

## Next Steps After Launch

1. **Verify data collection**
   - Check backend logs: `docker-compose logs backend`
   - Look for "Syncing..." messages

2. **View metrics**
   - Open http://localhost:5173
   - Should see metrics cards populate after first sync

3. **Add more teams**
   - Use POST /api/teams endpoint
   - Switch between teams in dashboard

4. **Monitor performance**
   - Check /health endpoint
   - Monitor Docker resource usage

## Production Deployment

For production deployment (not hackathon):

1. Use proper secrets management (not .env)
2. Set NODE_ENV=production
3. Use managed PostgreSQL (not container)
4. Set up proper logging and monitoring
5. Configure HTTPS/SSL
6. Set up backup strategy
7. Consider container orchestration (Kubernetes)

---

**Need help?** Check the main README.md or Docker logs!
