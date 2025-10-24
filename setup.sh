#!/bin/bash

echo "🚀 DORA Metrics Dashboard - Quick Setup"
echo "========================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file - Please edit it with your API tokens!"
    echo ""
    echo "You need to configure:"
    echo "  - GITHUB_TOKEN"
    echo "  - GITHUB_ORG"
    echo "  - GITHUB_REPOS"
    echo "  - CIRCLECI_TOKEN"
    echo "  - CIRCLECI_ORG"
    echo ""
    read -p "Press enter when you've configured .env to continue..."
fi

echo ""
echo "🐳 Starting Docker services..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo ""
echo "🗄️  Running database migrations..."
npm run migrate

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  Option 1 - Docker (recommended):"
echo "    npm run docker:up"
echo ""
echo "  Option 2 - Local development:"
echo "    Terminal 1: cd backend && npm run dev"
echo "    Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then visit:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:3000"
echo ""
echo "Don't forget to create a team first! See README.md for instructions."
