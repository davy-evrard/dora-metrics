# DORA Metrics Dashboard

A real-time dashboard for tracking DevOps Research and Assessment (DORA) metrics, integrating with GitHub and CircleCI to provide actionable insights into your team's software delivery performance.

## Features

### Core MVP
- **Deployment Frequency Tracking** - Monitor how often code is deployed to production
- **Lead Time Measurement** - Track time from first commit to production deployment
- **Change Failure Rate** - Measure the percentage of deployments that fail
- **Mean Time to Recovery (MTTR)** - Track average time to recover from failures
- **GitHub Integration** - Automatically fetch commits and pull request data
- **CircleCI Integration** - Collect deployment data from CI/CD pipelines
- **Real-time Dashboard** - WebSocket-powered live updates
- **30-Day Historical Trends** - View metrics trends with 7/30/90 day options
- **Team-Level Aggregation** - Track metrics by team, not individuals

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │      │   Express    │      │  PostgreSQL │
│  Frontend   │◄────►│   Backend    │◄────►│  Database   │
│  (Vite)     │      │ (TypeScript) │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  GitHub API  │
                    │  CircleCI    │
                    └──────────────┘
```

### Tech Stack

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- WebSockets (ws)
- GitHub Octokit API
- CircleCI API

**Frontend:**
- React 18
- TypeScript
- Vite
- Recharts (charting library)
- Axios

**DevOps:**
- Docker & Docker Compose
- Automated data collection (cron jobs)

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- GitHub Personal Access Token
- CircleCI API Token

### 1. Clone and Setup

```bash
git clone <repository-url>
cd dora-metrics
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql://dora:dora_password@localhost:5432/dora_metrics

# GitHub Integration
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_ORG=your-organization
GITHUB_REPOS=repo1,repo2,repo3

# CircleCI Integration
CIRCLECI_TOKEN=your_circleci_token_here
CIRCLECI_ORG=your-circleci-org

# Server
PORT=3000
NODE_ENV=development
```

### 3. Start with Docker (Recommended)

```bash
# Start all services (database, backend, frontend)
npm run docker:up

# The application will be available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3000
# - Database: localhost:5432
```

### 4. Or Run Locally

#### Start Database

```bash
docker-compose up postgres -d
```

#### Setup Backend

```bash
cd backend
npm install
npm run migrate  # Run database migrations
npm run dev      # Start development server
```

#### Setup Frontend

```bash
cd frontend
npm install
npm run dev      # Start development server
```

## Getting Your API Tokens

### GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:org`, `read:user`
4. Copy the token and add to `.env`

### CircleCI API Token

1. Go to CircleCI User Settings → Personal API Tokens
2. Create new token
3. Copy the token and add to `.env`

## Usage

### Creating a Team

Once the backend is running, create your first team:

```bash
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Team",
    "description": "Main product engineering team",
    "github_repos": ["repo1", "repo2"]
  }'
```

### Syncing Data

The system automatically syncs data every 5 minutes, but you can trigger manual syncs:

**From the Dashboard:**
- Click the "Sync Data" button

**Via API:**
```bash
# Sync all data sources
curl -X POST http://localhost:3000/api/sync/all/1

# Sync GitHub only
curl -X POST http://localhost:3000/api/sync/github/1

# Sync CircleCI only
curl -X POST http://localhost:3000/api/sync/circleci/1
```

### API Endpoints

#### Teams
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team by ID
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

#### Metrics
- `GET /api/metrics/summary/:teamId?days=30` - Get metrics summary
- `GET /api/metrics/historical/:teamId?days=30` - Get historical data
- `POST /api/metrics/calculate/:teamId` - Trigger metrics calculation
- `GET /api/metrics/chart/deployment-frequency/:teamId?days=30`
- `GET /api/metrics/chart/lead-time/:teamId?days=30`
- `GET /api/metrics/chart/change-failure-rate/:teamId?days=30`

#### Sync
- `POST /api/sync/github/:teamId` - Sync GitHub data
- `POST /api/sync/circleci/:teamId` - Sync CircleCI data
- `POST /api/sync/all/:teamId` - Sync all data sources

### WebSocket Connection

Connect to real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Subscribe to team metrics
ws.send(JSON.stringify({ type: 'subscribe', teamId: 1 }));
```

## Understanding DORA Metrics

### Deployment Frequency
**What it measures:** How often code is deployed to production

**Elite performers:** Multiple deployments per day
**High performers:** Once per day to once per week
**Medium performers:** Once per week to once per month
**Low performers:** Less than once per month

### Lead Time for Changes
**What it measures:** Time from code commit to production deployment

**Elite performers:** Less than 1 hour
**High performers:** 1 day to 1 week
**Medium performers:** 1 week to 1 month
**Low performers:** 1 month to 6 months

### Change Failure Rate
**What it measures:** Percentage of deployments that cause failures

**Elite performers:** 0-15%
**High performers:** 16-30%
**Medium performers:** 31-45%
**Low performers:** 46-60%

### Mean Time to Recovery (MTTR)
**What it measures:** How long it takes to recover from failure

**Elite performers:** Less than 1 hour
**High performers:** Less than 1 day
**Medium performers:** 1 day to 1 week
**Low performers:** More than 1 week

## Development

### Database Migrations

```bash
cd backend
npm run migrate
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build everything
npm run build

# Or build individually
cd backend && npm run build
cd frontend && npm run build
```

## Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend
```

## Troubleshooting

### Database connection issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U dora -d dora_metrics
```

### GitHub API rate limits

The GitHub API has rate limits. With authentication:
- 5,000 requests per hour

If you hit rate limits, the system will log errors but continue to work with cached data.

### CircleCI integration not working

1. Verify your CircleCI token has the correct permissions
2. Check that the organization name matches your CircleCI account
3. Ensure repository names match exactly

## Hackathon Tips

### Quick Demo Setup

1. **Use sample data**: Create a team with 1-2 repositories
2. **Manual sync**: Trigger initial sync via API or dashboard button
3. **Wait for metrics**: Metrics calculate every 10 minutes (or trigger manually)
4. **Show real-time**: Open dashboard in multiple windows to show WebSocket updates

### Bonus Features to Add

- **Slack/Teams notifications** - Alert on metrics changes
- **Predictive analytics** - ML model for deployment time prediction
- **Bottleneck detection** - Identify slow stages in pipeline
- **Comparison view** - Compare teams side-by-side
- **Export reports** - PDF/CSV export functionality

### Performance Optimization

- Add Redis caching for API responses
- Implement pagination for large datasets
- Add database indexes (already included)
- Use connection pooling (already configured)

## Project Structure

```
dora-metrics/
├── backend/
│   ├── src/
│   │   ├── database/       # Database connection and migrations
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic (GitHub, CircleCI, metrics)
│   │   ├── types/          # TypeScript type definitions
│   │   ├── server.ts       # Express server setup
│   │   ├── websocket.ts    # WebSocket server
│   │   └── scheduler.ts    # Cron job scheduler
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and WebSocket clients
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## Contributing

This is a hackathon project! Feel free to:
- Add new metrics and visualizations
- Integrate additional CI/CD systems (Jenkins, GitLab CI, etc.)
- Improve the UI/UX
- Add more sophisticated analytics

## License

MIT

## Support

For issues or questions:
- Check the troubleshooting section
- Review API endpoint documentation
- Check Docker logs for errors
