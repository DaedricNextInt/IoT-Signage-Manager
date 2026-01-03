# IoT Signage Manager

A self-hosted IoT device management platform for Android signage devices (Fire TV Sticks, digital signage players, etc.).

## Features

- 📱 **Device Management** - Register, monitor, and control IoT devices
- 📊 **Real-time Metrics** - CPU, memory, storage monitoring with charts
- 🚨 **Alerting System** - Automated alerts for offline devices, errors
- 🔄 **Remote Control** - Reboot, screenshot, send commands
- 📡 **MQTT Communication** - Real-time device communication
- 🔐 **JWT Authentication** - Secure API access
- 📈 **WebSocket Updates** - Live UI updates

## Quick Start (Docker)

### Prerequisites

- Docker & Docker Compose
- Git

### 1. Clone & Run

```bash
git clone https://github.com/yourusername/IoT-Signage-Manager.git
cd IoT-Signage-Manager

# Make start script executable
chmod +x start.sh

# Run setup
./start.sh
```

### 2. Access the Application

| Service | URL |
|---------|-----|
| Web Interface | http://localhost |
| API | http://localhost/api |
| Health Check | http://localhost/health |
| MQTT Broker | localhost:1883 |

### 3. Login

- **Email:** `admin@localhost`
- **Password:** `admin123`

## Manual Setup

If you prefer to start services manually:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Run database migrations
docker compose exec backend npx prisma db push

# Seed database
docker compose exec backend npm run db:seed
```

## Project Structure

```
IoT-Signage-Manager/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # MQTT, WebSocket, monitoring
│   │   ├── middleware/     # Auth, error handling
│   │   └── utils/          # Prisma client
│   ├── prisma/             # Database schema & seeds
│   └── Dockerfile
│
├── frontend/               # React/TypeScript UI
│   ├── src/
│   │   ├── pages/         # Dashboard, Devices, Alerts, Settings
│   │   ├── components/    # Layout, shared components
│   │   ├── services/      # API client
│   │   └── stores/        # Zustand state management
│   └── Dockerfile
│
├── infrastructure/         # Config files
│   ├── nginx/             # Reverse proxy config
│   └── mosquitto/         # MQTT broker config
│
├── docker-compose.yml      # Container orchestration
└── start.sh               # Setup script
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│    Nginx    │────▶│  Frontend   │
└─────────────┘     │   (Proxy)   │     │   (React)   │
                    └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Backend   │
                    │  (Express)  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
    │ Postgres │      │   Redis   │    │ Mosquitto │
    │   (DB)   │      │  (Cache)  │    │  (MQTT)   │
    └──────────┘      └───────────┘    └───────────┘
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Get current user |

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/:id` | Get device details |
| POST | `/api/devices` | Create device |
| PATCH | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Delete device |
| POST | `/api/devices/:id/reboot` | Reboot device |
| GET | `/api/devices/:id/metrics` | Get metrics |
| GET | `/api/devices/:id/logs` | Get logs |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge |

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DB_USER=iot_user
DB_PASSWORD=your_secure_password

# JWT Secret (min 32 characters)
JWT_SECRET=your-very-long-secret-key-here
```

## Development

### Run Locally (without Docker)

**Backend:**
```bash
cd backend
npm install
cp .env.example .env  # Edit with your settings
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
docker compose exec backend npx prisma studio

# Reset database
docker compose exec backend npx prisma db push --force-reset
docker compose exec backend npm run db:seed
```

## MQTT Topics

Devices communicate via MQTT:

| Topic | Direction | Description |
|-------|-----------|-------------|
| `devices/{deviceId}/status` | Device → Server | Status updates |
| `devices/{deviceId}/metrics` | Device → Server | System metrics |
| `devices/{deviceId}/logs` | Device → Server | Log entries |
| `devices/{deviceId}/commands` | Server → Device | Commands |
| `devices/{deviceId}/response` | Device → Server | Command responses |

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose logs -f

# Restart everything
docker compose down
docker compose up -d
```

### Database issues
```bash
# Reset database completely
docker compose down -v
./start.sh
```

### Can't connect to web interface
```bash
# Check if nginx is running
docker compose ps nginx

# Check nginx logs
docker compose logs nginx
```

## Tech Stack

**Backend:**
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- Socket.IO
- MQTT.js

**Frontend:**
- React 18
- TypeScript
- Vite
- TanStack Query
- Zustand
- Tailwind CSS
- Recharts

**Infrastructure:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- Eclipse Mosquitto (MQTT)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
