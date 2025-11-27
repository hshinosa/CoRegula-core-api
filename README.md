# CoRegula Core API

Backend API service for CoRegula - AI-Powered Collaborative Learning Platform. Built with Express.js, TypeScript, PostgreSQL, and Socket.IO.

## 🎯 Purpose

Core-API is the central backend service that:
- Manages **Authentication & Authorization** (JWT-based)
- Handles **Course & Group Management** (CRUD operations)
- Coordinates **Real-time Chat** via Socket.IO
- Integrates with **AI-Engine** for RAG queries and interventions
- Logs **Process Mining Events** for research analytics
- Manages **Knowledge Base** document uploads

## 🛠️ Tech Stack

- **Runtime:** Node.js 20.x
- **Framework:** Express.js 4.x
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM)
- **Real-time:** Socket.IO
- **Authentication:** JWT
- **Validation:** Zod

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL 14+
- MongoDB (optional, for chat logs)

## Quick Start

### 1. Install Dependencies

```bash
cd core-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed demo data (optional)
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user profile |

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | Get my courses |
| POST | `/api/courses` | Create course (lecturer) |
| POST | `/api/courses/join` | Join course with code (student) |
| GET | `/api/courses/:id` | Get course details |
| GET | `/api/courses/:id/students` | Get enrolled students |
| POST | `/api/courses/:id/knowledge-base` | Upload PDF |
| GET | `/api/courses/:id/knowledge-base` | Get knowledge base files |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create group (lecturer) |
| GET | `/api/groups/course/:courseId` | Get groups in course |
| GET | `/api/groups/my/:courseId` | Get my group in course |
| GET | `/api/groups/:id` | Get group details |

### Learning Goals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/goals` | Submit learning goal |
| GET | `/api/goals/me` | Get my goals |
| GET | `/api/goals/group/:groupId` | Get group goals |
| GET | `/api/goals/:id` | Get goal details |

### Reflections

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reflections` | Submit reflection |
| GET | `/api/reflections/me` | Get my reflections |
| GET | `/api/reflections/goal/:goalId` | Get reflections for goal |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health status |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ courseId, groupId }` | Join a chat room |
| `send_message` | `{ roomId, content }` | Send message |
| `typing` | `{ roomId, isTyping }` | Typing indicator |
| `leave_room` | `roomId` | Leave a chat room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_joined` | `{ roomId, courseId, groupId }` | Confirmation of room join |
| `receive_message` | Message object | New message received |
| `user_joined` | `{ userId, userName }` | User joined room |
| `user_typing` | `{ userId, userName, isTyping }` | User typing indicator |
| `ai_typing` | `{ isTyping }` | AI is processing |
| `error` | `{ message }` | Error occurred |

## Demo Credentials

After running `npm run db:seed`:

- **Lecturer:** `lecturer@coregula.edu` / `password123`
- **Student:** `student1@coregula.edu` / `password123`
- **Course Join Code:** `HCI2024`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run tests |

## Project Structure

```
core-api/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed script
├── src/
│   ├── config/          # Database & env config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, etc.
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── socket/          # Socket.IO handlers
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   ├── validators/      # Zod schemas
│   ├── app.ts           # Express app
│   └── server.ts        # Entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
