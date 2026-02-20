# GPU Cloud Platform - Architecture Documentation

## System Overview

The GPU Cloud Platform is a simplified AI PaaS (Platform as a Service) that demonstrates distributed systems concepts through a simulated GPU worker infrastructure with OpenAI-compatible APIs.

## Architecture Components

### 1. API Gateway Layer

**Location**: `backend/src/server.ts`, `backend/src/routes/`, `backend/src/middleware/`

- **Express.js Server**: Handles HTTP requests and WebSocket connections
- **Authentication Middleware**: JWT for dashboard users, API keys for inference
- **Rate Limiting**: Per-key rate limiting using `rate-limiter-flexible`
- **CORS & Security**: Helmet for security headers, CORS for cross-origin requests

### 2. Distributed Task Queue

**Location**: `backend/src/services/taskQueue.ts`

The task queue implements a priority-based scheduling system:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Submit     │────▶│    Queue     │────▶│   Assign     │
│   Request    │     │  (Priority)  │     │   Worker     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                       ┌──────────────────────────┘
                       ▼
              ┌────────────────┐
              │ Worker Pool    │
              │ (Load Balance) │
              └────────────────┘
```

**Key Features**:
- Priority-based task scheduling
- Least-loaded worker selection (load balancing)
- Task timeout and retry mechanisms
- Promise-based completion tracking

### 3. Worker Management System

**Location**: `backend/src/services/workerManager.ts`, `backend/src/workers/inferenceWorker.ts`

Simulates a distributed GPU cluster:

- **GPU Profiles**: A100 (80GB), H100 (80GB), RTX 4090 (24GB), RTX A6000 (48GB)
- **Heartbeat Protocol**: Workers report status every 5 seconds
- **Dynamic Load Tracking**: Real-time capacity and utilization monitoring
- **Standalone Worker Script**: Can run as separate processes

### 4. Inference Service

**Location**: `backend/src/services/inference.ts`

OpenAI-compatible chat completion API:

- **Models**: gpt-4, gpt-3.5-turbo, llama-2-70b, claude-3, etc.
- **Streaming**: Server-Sent Events (SSE) for real-time token generation
- **Token Estimation**: Rough token counting for usage tracking
- **Simulated Latency**: Configurable processing delays

### 5. Data Storage

**Location**: `backend/src/services/store.ts`

In-memory data store:

- API Keys with metadata
- User accounts
- Worker nodes
- Inference tasks
- Usage records (last 10,000 entries)

### 6. Frontend Dashboard

**Location**: `frontend/src/`

React-based management interface:

- **Authentication**: JWT-based login/logout
- **API Key Management**: Create, view, revoke keys
- **Playground**: Interactive inference testing
- **Monitoring**: Real-time worker status and metrics
- **Charts**: Usage trends and model distribution

## Data Flow

### Inference Request Flow

```
1. Client sends POST /v1/chat/completions
   Authorization: Bearer <api_key>

2. API Gateway validates API key

3. Rate Limiter checks limits

4. Task Queue receives request
   - Creates InferenceTask with priority
   - Queues for worker assignment

5. Task Queue assigns to best worker
   - Selects least-loaded online worker
   - Updates worker load

6. Worker processes task
   - Simulates GPU inference
   - Generates response

7. Response returned to client
   - Non-streaming: JSON response
   - Streaming: SSE chunks

8. Usage recorded
   - Token counts
   - Latency metrics
   - API key stats updated
```

### Worker Heartbeat Flow

```
Every 5 seconds:
1. Worker sends heartbeat
   { status, gpuInfo, currentLoad, timestamp }

2. Master updates worker record

3. UI receives updated status
   (via polling or WebSocket)
```

## API Design

### OpenAI-Compatible Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/v1/models` | GET | API Key | List available models |
| `/v1/models/{id}` | GET | API Key | Get model details |
| `/v1/chat/completions` | POST | API Key | Create completion (streaming supported) |

### Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | Public | User login |
| `/api/auth/register` | POST | Public | User registration |
| `/api/auth/me` | GET | JWT | Current user info |
| `/api/keys` | GET | JWT | List API keys |
| `/api/keys` | POST | JWT | Create API key |
| `/api/keys/{id}` | DELETE | JWT | Revoke API key |
| `/api/monitoring/workers` | GET | JWT | List workers |
| `/api/monitoring/queue` | GET | JWT | Queue status |
| `/api/monitoring/metrics` | GET | JWT | Usage metrics |

## Security Considerations

### Authentication
- **Passwords**: Bcrypt with salt rounds
- **JWT**: HS256 algorithm, configurable expiry
- **API Keys**: SHA-256 hashed prefix for lookup

### Rate Limiting
- Per-API-key limits (default: 60/min)
- Configurable per key
- Rate limit headers in responses

### Data Protection
- Helmet.js for security headers
- CORS whitelist
- Input validation on all endpoints

## Scalability Considerations

### Current Limitations
- In-memory storage (no persistence)
- Single-node task queue
- Simulated GPU workers

### Production Scaling Path
1. **Database**: Replace in-memory store with PostgreSQL
2. **Task Queue**: Distributed task queue for worker coordination
3. **Worker Pool**: Kubernetes-managed GPU nodes
4. **Load Balancer**: Multiple API gateway instances
5. **Message Queue**: RabbitMQ/Apache Kafka for task distribution

## Technology Choices

### Backend
- **Node.js + TypeScript**: Type safety, async/await
- **Express**: Lightweight, middleware-rich
- **rate-limiter-flexible**: Flexible rate limiting
- **ws**: WebSocket support for workers

### Frontend
- **React + TypeScript**: Component-based UI
- **TanStack Query**: Server state management
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Data visualization
- **Lucide**: Consistent iconography

### Development Tools
- **Vite**: Fast development and building
- **Nodemon**: Backend hot reload

## File Structure

```
gpu-cloud-platform/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, rate limiting
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript interfaces
│   │   ├── utils/           # Helper functions
│   │   └── workers/         # Standalone worker script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   └── types/           # TypeScript types
│   └── package.json
└── README.md
```

## Deployment

### Development
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Production
```bash
# Build backend
cd backend && npm run build && npm start

# Build frontend
cd frontend && npm run build
# Serve dist/ folder via nginx or similar
```
