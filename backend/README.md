# IoT Device Manager - Backend Setup Guide

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ (recommend 20 LTS)
- Docker & Docker Compose (for database)

### Step 1: Start Database

```bash
cd iot-backend

# Start PostgreSQL (and optionally Redis & MQTT)
docker compose up -d postgres

# Wait for it to be ready
docker compose logs -f postgres
# Look for "database system is ready to accept connections"
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env with your settings (the defaults work for local dev)
```

Minimum required `.env`:
```bash
PORT=4000
DATABASE_URL="postgresql://iot_user:iot_password@localhost:5432/iot_devices"
JWT_SECRET="your-super-secret-key-change-this"
```

### Step 4: Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Create database tables
npm run db:push

# Seed with sample data
npm run db:seed
```

### Step 5: Start Server

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║         IoT Device Manager Backend Started                ║
╠═══════════════════════════════════════════════════════════╣
║  API Server:    http://localhost:4000                     ║
║  Health Check:  http://localhost:4000/health              ║
║  WebSocket:     ws://localhost:4000/ws                    ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 6: Test It

```bash
# Health check
curl http://localhost:4000/health

# Login (use seeded admin account)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost","password":"admin123"}'

# You'll get a token - use it for other requests
```

---

## Connect Frontend

Update your frontend to use the real backend:

### 1. Edit `src/App.tsx`:
```typescript
const DEMO_MODE = false;  // Change from true to false
```

### 2. Edit `src/services/api.ts`:
```typescript
const DEMO_MODE = false;  // Change from true to false
```

### 3. Update `.env.local` (in frontend folder):
```bash
VITE_API_URL=http://localhost:4000/api
VITE_WS_URL=ws://localhost:4000
```

### 4. Restart frontend:
```bash
npm run dev
```

Now login with:
- **Email:** admin@localhost
- **Password:** admin123

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/register` | Create new account |
| GET | `/api/auth/me` | Get current user (requires auth) |
| PUT | `/api/auth/password` | Change password (requires auth) |

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/:id` | Get device details |
| POST | `/api/devices` | Create device |
| PATCH | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Delete device |
| POST | `/api/devices/:id/reboot` | Reboot device |
| POST | `/api/devices/:id/command` | Send command |
| GET | `/api/devices/:id/metrics` | Get metrics |
| GET | `/api/devices/:id/logs` | Get logs |
| GET | `/api/devices/:id/screenshot` | Request screenshot |
| POST | `/api/devices/bulk/reboot` | Bulk reboot |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge alert |
| POST | `/api/alerts/bulk/acknowledge` | Bulk acknowledge |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | List groups |
| POST | `/api/groups` | Create group |
| PATCH | `/api/groups/:id` | Update group |
| DELETE | `/api/groups/:id` | Delete group |

---

## Optional Services

### Redis (Caching)
```bash
docker compose up -d redis
```

Add to `.env`:
```bash
REDIS_URL="redis://localhost:6379"
```

### MQTT Broker (Device Communication)
```bash
docker compose up -d mosquitto
```

Add to `.env`:
```bash
MQTT_BROKER_URL="mqtt://localhost:1883"
```

---

## Database Management

### View Database with Prisma Studio
```bash
npm run db:studio
```
Opens a web GUI at http://localhost:5555

### Reset Database
```bash
# Drop and recreate all tables
npx prisma db push --force-reset

# Re-seed data
npm run db:seed
```

### Create Migration (for production)
```bash
npx prisma migrate dev --name your_migration_name
```

---

## Troubleshooting

### "Connection refused" to database
```bash
# Make sure PostgreSQL is running
docker compose up -d postgres
docker compose logs postgres
```

### "Invalid token" errors
- Check JWT_SECRET in .env
- Clear browser localStorage and login again

### MQTT not connecting
- MQTT is optional - the app works without it
- Check if Mosquitto is running: `docker compose logs mosquitto`

### Prisma errors
```bash
# Regenerate client
npm run db:generate

# Reset database if schema changed
npx prisma db push --force-reset
```

---

## Production Deployment

### 1. Build the application
```bash
npm run build
```

### 2. Set production environment
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:password@your-db-host:5432/iot_devices"
JWT_SECRET="very-long-random-secret-at-least-32-chars"
```

### 3. Run migrations
```bash
npx prisma migrate deploy
```

### 4. Start server
```bash
npm start
```

### Using Docker
```bash
# Build image
docker build -t iot-backend .

# Run container
docker run -d \
  -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  iot-backend
```

---

## Project Structure

```
iot-backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── routes/
│   │   ├── auth.ts           # Authentication routes
│   │   ├── devices.ts        # Device CRUD & actions
│   │   ├── alerts.ts         # Alert management
│   │   └── groups.ts         # Device groups
│   ├── services/
│   │   ├── mqtt.ts           # MQTT broker integration
│   │   ├── websocket.ts      # Real-time WebSocket
│   │   └── deviceMonitor.ts  # Status monitoring
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   ├── errorHandler.ts   # Error handling
│   │   └── requestLogger.ts  # Request logging
│   └── utils/
│       └── prisma.ts         # Database client
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Sample data
├── docker-compose.yml        # Docker services
├── Dockerfile                # Production image
└── package.json
```
