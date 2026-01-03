#!/bin/bash
# ===========================================
# IoT Signage Manager - Docker Setup Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       IoT Signage Manager - Docker Setup                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}Error: docker-compose is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo -e "${GREEN}✓ Using: $COMPOSE_CMD${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file with secure defaults...${NC}"
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64 | tr -d '/+=' | head -c 16)
    
    cat > .env << EOF
# Generated on $(date)
# IoT Signage Manager Environment Variables

# Database
DB_USER=iot_user
DB_PASSWORD=${DB_PASSWORD}

# JWT Secret (keep this secure!)
JWT_SECRET=${JWT_SECRET}
EOF
    
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}  DB_PASSWORD: ${DB_PASSWORD}${NC}"
    echo -e "${YELLOW}  JWT_SECRET: (generated)${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Stop any existing containers
echo -e "\n${BLUE}Stopping existing containers...${NC}"
$COMPOSE_CMD down 2>/dev/null || true

# Build images
echo -e "\n${BLUE}Building Docker images...${NC}"
$COMPOSE_CMD build

# Start database first and wait for it
echo -e "\n${BLUE}Starting database...${NC}"
$COMPOSE_CMD up -d postgres

echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if postgres is ready
for i in {1..30}; do
    if $COMPOSE_CMD exec -T postgres pg_isready -U iot_user -d iot_devices > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Start all other services
echo -e "\n${BLUE}Starting all services...${NC}"
$COMPOSE_CMD up -d

# Wait a moment for services to start
sleep 5

# Run database migrations
echo -e "\n${BLUE}Running database migrations...${NC}"
$COMPOSE_CMD exec -T backend npx prisma db push --accept-data-loss 2>/dev/null || {
    echo -e "${YELLOW}Note: Migration may have already been applied${NC}"
}

# Seed the database
echo -e "\n${BLUE}Seeding database with initial data...${NC}"
$COMPOSE_CMD exec -T backend npm run db:seed 2>/dev/null || {
    echo -e "${YELLOW}Note: Database may already be seeded${NC}"
}

# Show status
echo -e "\n${BLUE}Checking service status...${NC}"
$COMPOSE_CMD ps

# Get the local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Setup Complete! 🎉                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Web Interface:  http://localhost                         ║"
echo "║                  http://${LOCAL_IP}                       "
echo "║                                                           ║"
echo "║  API Endpoint:   http://localhost/api                     ║"
echo "║  Health Check:   http://localhost/health                  ║"
echo "║                                                           ║"
echo "║  MQTT Broker:    localhost:1883                           ║"
echo "║  MQTT WebSocket: localhost:9001                           ║"
echo "║                                                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  Default Login:                                           ║"
echo "║    Email:    admin@localhost                              ║"
echo "║    Password: admin123                                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:        $COMPOSE_CMD logs -f"
echo "  View backend:     $COMPOSE_CMD logs -f backend"
echo "  Stop all:         $COMPOSE_CMD down"
echo "  Restart:          $COMPOSE_CMD restart"
echo "  Reset database:   $COMPOSE_CMD down -v && ./start.sh"
echo ""
