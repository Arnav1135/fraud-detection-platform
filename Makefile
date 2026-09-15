.PHONY: help install up down db-migrate test-backend test-frontend start-backend start-frontend all

help:
	@echo "🛡️ Fraud Detection Platform - Developer Commands"
	@echo ""
	@echo "Usage: make <command>"
	@echo ""
	@echo "Commands:"
	@echo "  install        Install all dependencies (frontend & backend)"
	@echo "  up             Start all infrastructure (Kafka, Redis, Postgres) via Docker Compose"
	@echo "  down           Stop all infrastructure"
	@echo "  db-migrate     Run Prisma database migrations"
	@echo "  start-backend  Start the Node.js Fraud Engine"
	@echo "  start-frontend Start the React SOC Dashboard"
	@echo "  test-backend   Run the backend algorithm test suite"
	@echo "  all            Install, spin up infrastructure, migrate DB, and start everything"

install:
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

up:
	@echo "🐳 Starting infrastructure (Kafka, Redis, Postgres)..."
	docker-compose up -d

down:
	@echo "🛑 Stopping infrastructure..."
	docker-compose down

db-migrate:
	@echo "🗄️ Running database migrations..."
	cd backend && npx prisma db push

start-backend:
	@echo "🚀 Starting Backend Engine..."
	cd backend && npm run start

start-frontend:
	@echo "💻 Starting Frontend Dashboard..."
	cd frontend && npm run dev

test-backend:
	@echo "🧪 Running Backend Tests..."
	cd backend && npm run test

all: install up db-migrate
	@echo "✅ Setup complete! Run 'make start-backend' and 'make start-frontend' in separate terminals."
