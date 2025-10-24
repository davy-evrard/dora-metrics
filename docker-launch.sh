#!/bin/bash

echo "🚀 DORA Metrics Dashboard - Docker Launch"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Please create a .env file with your configuration:"
    echo "  cp .env.example .env"
    echo ""
    echo "Then edit .env and add your tokens:"
    echo "  - GITHUB_TOKEN=your_token_here"
    echo "  - CIRCLECI_TOKEN=your_token_here"
    echo "  - GITHUB_ORG=your-org"
    echo "  - CIRCLECI_ORG=your-org"
    echo "  - GITHUB_REPOS=repo1,repo2,repo3"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Stop any existing containers
echo "🧹 Cleaning up old containers..."
docker-compose down 2>/dev/null

echo ""
echo "🐳 Building and starting containers..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if backend is up
echo "🔍 Checking backend health..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi
    attempt=$((attempt + 1))
    sleep 2
    echo -n "."
done

if [ $attempt -eq $max_attempts ]; then
    echo ""
    echo "⚠️  Backend health check timeout. Checking logs..."
    docker-compose logs backend
    exit 1
fi

echo ""
echo ""
echo "🎉 DORA Metrics Dashboard is running!"
echo "========================================"
echo ""
echo "📊 Frontend Dashboard: http://localhost:5173"
echo "🔌 Backend API:        http://localhost:3000"
echo "🗄️  PostgreSQL:         localhost:5432"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Create your first team via API or check README.md"
echo ""
echo "💡 Useful commands:"
echo "   View logs:       docker-compose logs -f"
echo "   Stop services:   docker-compose down"
echo "   Restart:         docker-compose restart"
echo ""
