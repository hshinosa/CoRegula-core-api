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

## 🗄️ Database Setup

### Prerequisites

- PostgreSQL 14+ installed and running
- Database `kolabri-db` created (or update .env with your database name)

### Quick Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed demo data (optional)
npm run db:seed
```

### ⚠️ Shared Database with Laravel Client

**Important:** This project shares the PostgreSQL database with the **Laravel Client App**.

**Migration Order:**
```bash
# 1. Run Core-API migrations FIRST
cd CoRegula-core-api
npx prisma migrate deploy

# 2. Then run Laravel migrations
cd ../CoRegula-client-app
php artisan migrate
```

**Table Ownership:**
- **Core-API manages:** `users`, `courses`, `groups`, `chat_spaces`, `chat_messages`, `learning_goals`, `reflections`, `knowledge_bases`, `ai_chats`
- **Laravel manages:** `sessions`, `cache`, `jobs` (infrastructure tables)

**Troubleshooting:**
- If `migrate:fresh` was run in Laravel, Core-API tables will be deleted
- See `prisma/reset_for_prisma.sql` and `prisma/apply_migration_*.sql` for recovery

### Available SQL Fix Scripts

Located in `prisma/` directory:
- `fix_role_column.sql` - Fix missing role column in users table
- `reset_for_prisma.sql` - Reset database for fresh Prisma migrations
- `apply_migration_1.sql` - Apply first migration manually
- `apply_migration_2.sql` - Apply second migration manually

## 🚀 Quick Start

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

## 🐛 Troubleshooting

### Database Issues

#### Error: "column users.role does not exist"
**Cause:** Database was reset but migrations table still shows them as applied.

**Fix:**
```bash
# Apply the fix SQL
npx prisma db execute --file prisma/fix_role_column.sql

# Regenerate client
npx prisma generate
```

#### Error: "table public.users does not exist"
**Cause:** Laravel `migrate:fresh` deleted Core-API tables.

**Fix:**
```bash
# Apply migrations manually
npx prisma db execute --file prisma/apply_migration_1.sql
npx prisma db execute --file prisma/apply_migration_2.sql

# Regenerate client
npx prisma generate
```

#### Migration Timeout / Advisory Lock Error
**Cause:** Another process is holding database lock.

**Fix:**
```bash
# Wait a few seconds and retry:
npx prisma migrate deploy
```

### Connection Issues

#### PostgreSQL Connection Refused
```bash
# Verify PostgreSQL is running
# Check DATABASE_URL in .env
```

#### Prisma Client Not Found
```bash
# Regenerate client
npm run db:generate
```

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
