# GPU Cloud Platform

## Features

### Backend Infrastructure
- **API Key Management**: Create, revoke, and monitor API keys with rate limiting
- **OpenAI-Compatible Endpoints**: `/v1/chat/completions` and `/v1/models` with streaming support
- **Distributed Task Queue**: Priority-based task distribution across simulated GPU workers
- **Worker Simulation**: Simulated GPU workers with heartbeat monitoring and load balancing
- **Rate Limiting**: Per-API-key rate limiting with configurable limits
- **Usage Tracking**: Comprehensive metrics and telemetry

### Frontend Dashboard
- **Real-time Monitoring**: Live worker status, queue statistics, and GPU utilization
- **API Key Management**: Create, view, and revoke API keys
- **Interactive Playground**: Test inference endpoints with streaming responses
- **Metrics Visualization**: Charts for usage trends, model distribution, and performance

### Architecture Highlights
- **Distributed Design**: Task queue with worker pool and load balancing
- **P2P Communication**: WebSocket-based worker heartbeat and task assignment
- **Streaming Support**: Server-sent events for real-time inference responses
- **Security**: JWT authentication, bcrypt password hashing, API key validation

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Clone and enter the directory:**
```bash
cd gpu-cloud-platform
```

2. **Install backend dependencies:**
```bash
cd backend
npm install
```

4. **Install frontend dependencies:**
```bash
cd ../frontend
npm install
```

### Running the Application

**Option 1: Run both concurrently (recommended for development)**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

**Access the application:**
- Frontend Dashboard: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: See below

### Default Login
- Email: `admin@gpucloud.local`
- Password: `admin123`

## Testing

### Self-Contained Tests (Recommended)

The test suite automatically starts the server, runs tests, and shuts down:

```bash
cd gpu-cloud-platform

# Or from backend directory
cd backend
npm test
```
### Test Client Usage

You can also use the test client programmatically in your own scripts:

```typescript
import { ApiTestClient } from './backend/src/test/client';

const client = new ApiTestClient('http://localhost:3000');

// Login
await client.login('admin@gpucloud.local', 'admin123');

// Create API key
const key = await client.createApiKey('My Key');

// Make inference request
const response = await client.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);

// Stream responses
for await (const chunk of client.chatCompletionStream(messages)) {
  console.log(chunk.choices[0]?.delta?.content);
}
```

## API Documentation

### Authentication

The API supports two authentication methods:

1. **JWT Token** (for dashboard): `Authorization: Bearer <jwt_token>`
2. **API Key** (for inference): `Authorization: Bearer <api_key>`

### OpenAI-Compatible Endpoints

#### List Models
```http
GET /api/v1/models
Authorization: Bearer <api_key>
```

#### Create Chat Completion
```http
POST /api/v1/chat/completions
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 256,
  "stream": false
}
```

**Streaming Response:**
Set `"stream": true` to receive Server-Sent Events (SSE) with chunked responses.

### Management API

#### Authentication
```http
POST /api/auth/login
{
  "email": "admin@gpucloud.local",
  "password": "admin123"
}
```

#### API Keys
```http
# List keys
GET /api/keys
Authorization: Bearer <jwt>

# Create key
POST /api/keys
Authorization: Bearer <jwt>
{
  "name": "Production",
  "rateLimitPerMinute": 120
}

# Revoke key
DELETE /api/keys/:id
Authorization: Bearer <jwt>
```

#### Monitoring
```http
# Worker status
GET /api/monitoring/workers
Authorization: Bearer <jwt>

# Queue status
GET /api/monitoring/queue
Authorization: Bearer <jwt>

# Metrics
GET /api/monitoring/metrics
Authorization: Bearer <jwt>
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│              (React Dashboard / API Consumers)              │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP / WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │ Rate Limiter │  │   Router     │      │
│  │ Middleware   │  │  Middleware  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  Task Queue  │ │  Auth    │ │  Monitoring  │
│  (Priority)  │ │ Service  │ │   Service    │
└──────┬───────┘ └──────────┘ └──────────────┘
       │
       ▼ Distributes tasks
┌─────────────────────────────────────────┐
│           Worker Pool                   │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │Worker 1│ │Worker 2│ │Worker 3│ ...  │
│  │(GPU A100)│(GPU H100)│(GPU 4090)│    │
│  └────────┘ └────────┘ └────────┘      │
└─────────────────────────────────────────┘
```

### Distributed Task Queue

The task queue implements a priority-based scheduling system:

1. **Task Submission**: Inference requests are queued with priority
2. **Worker Selection**: Least-loaded worker is selected (load balancing)
3. **Task Assignment**: Worker receives task via internal routing
4. **Heartbeat**: Workers report status every 5 seconds
5. **Completion**: Results are returned and usage is tracked

### Worker Simulation

Workers are simulated with realistic GPU specifications:
- **GPU Models**: NVIDIA A100, H100, RTX 4090, RTX A6000
- **Metrics**: Memory usage, GPU utilization, load capacity
- **Heartbeat**: Automatic status updates and health checks

## Project Structure

```
gpu-cloud-platform/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, rate limiting
│   │   ├── models/         # (In-memory store)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utilities
│   │   ├── workers/        # Standalone worker script
│   │   └── server.ts       # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # Main app
│   └── package.json
└── README.md
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Security**: Helmet, CORS, bcrypt, JWT
- **Rate Limiting**: rate-limiter-flexible
- **WebSocket**: ws (for worker communication)

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Charts**: Recharts
- **Icons**: Lucide React

## Development

### Backend Scripts
```bash
npm run dev         # Development with hot reload
npm run build       # Build for production
npm run start       # Start production server
npm run worker      # Run standalone worker

# Testing
npm test            # Self-contained tests (starts server)
```

### Frontend Scripts
```bash
npm run dev       # Development server
npm run build     # Build for production
npm run preview   # Preview production build
```

## Production Considerations

For a production deployment, consider:

1. **Database**: Replace in-memory store with PostgreSQL/MongoDB
2. **Real GPU Workers**: Implement actual GPU worker nodes
4. **Kubernetes**: Container orchestration for scaling
5. **Monitoring**: Integrate Prometheus/Grafana
6. **Logging**: Structured logging with Winston/Pino
7. **Testing**: Add comprehensive unit and integration tests

## License

MIT License
