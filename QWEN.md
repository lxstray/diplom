# QWEN.md — Project Context for AI Assistants

## Project Overview

**Diplom** is a real-time collaborative coding platform built as a fullstack TypeScript distributed system. The project enables multiple users to edit code simultaneously with CRDT-based synchronization, similar to Google Docs but for programming.

### Core Capabilities

- **Real-time collaborative editing** using Yjs CRDT
- **Multi-file project workspace** with virtual file system
- **Live presence indicators** showing active collaborators
- **Peer-to-peer video/audio** communication via WebRTC
- **Secure remote code execution** through Judge0 sandbox
- **Room-based collaboration** with access control

---

## Technology Stack (STRICT)

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | Next.js App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Editor | Monaco Editor + y-monaco |
| State | Yjs CRDT (editor state only) |

### Backend

| Component | Technology |
|-----------|------------|
| Runtime | Node.js + TypeScript |
| Framework | Fastify (preferred) or Express |
| Architecture | Modular service-based |
| Validation | Zod schemas |
| ORM | Prisma |

### Infrastructure

| Service | Technology |
|---------|------------|
| Collaboration Server | Hocuspocus |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth (JWT) |
| Code Execution | Judge0 |
| Video/Audio | WebRTC (simple-peer/PeerJS) |
| Deployment | Vercel (frontend), Railway/Docker (backend) |

---

## Project Structure

```
diplom/
├── backend/           # Node.js Fastify API server
├── frontend/          # Next.js application
├── docker/            # Docker compose & deployment configs
├── .ai/
│   └── rules.md       # AI-specific constraints
└── .qwen/
    └── skills/        # Custom AI skills
```

### Expected Backend Structure

```
backend/
└── src/
    ├── modules/
    │   ├── auth/          # Authentication & JWT validation
    │   ├── projects/      # Project CRUD operations
    │   ├── execution/     # Judge0 proxy & rate limiting
    │   └── collaboration/ # WebSocket lifecycle
    ├── routes/            # API endpoint definitions
    ├── services/          # Business logic (thin routes)
    ├── plugins/           # Fastify plugins
    ├── schemas/           # Zod validation schemas
    └── utils/             # Shared utilities
```

### Expected Frontend Structure

```
frontend/
├── app/                   # Next.js App Router pages
├── components/            # Reusable UI components
├── features/              # Feature-specific logic (feature-first)
├── hooks/                 # Custom React hooks
├── lib/                   # API clients & WebSocket utilities
└── types/                 # TypeScript type definitions
```

---

## Architecture Principles

### CRDT Collaboration Model

```
Editor State → Yjs CRDT (source of truth)
Database State → PostgreSQL (metadata only)
Presence → Yjs Awareness + Supabase Realtime fallback
```

**Critical Rule:** Backend NEVER modifies editor document state. Only Yjs synchronization controls document content.

### Shared Yjs Structures

```typescript
// Inside Y.Doc
files: Y.Map<FileMetadata>      // File tree metadata
fileContent: Y.Text             // Actual file content
```

### File Operations (CRDT-Safe)

- Create file
- Delete file
- Rename file
- Update content

**Avoid:** Centralized filesystem logic that could conflict with CRDT sync.

---

## Security Constraints

### Authentication Flow

1. Frontend obtains JWT from Supabase Auth
2. Backend verifies JWT on every request
3. **Never trust client-provided userId**

### Code Execution Security

```
Client → Backend Proxy → Judge0
```

**Backend must implement:**
- Rate limiting per user
- Authentication validation
- Timeout protection
- **Client NEVER communicates directly with Judge0**

### WebSocket Security

- JWT-based WebSocket authentication
- Validate all incoming messages with Zod schemas

---

## Development Guidelines

### Coding Style

- **Strict TypeScript** — no `any` types
- Prefer pure functions over classes
- Small, composable modules
- Clear domain naming (e.g., `createProjectService`, `joinRoomHandler`)

### Input Validation

All external input MUST use Zod schemas:
- REST API requests
- WebSocket events
- Code execution requests

### Error Handling

- **Backend:** Structured JSON error responses
- **Frontend:** Graceful UI fallbacks

### Performance

**Avoid:**
- Polling (use WebSockets)
- Unnecessary re-renders
- Global state managers (use CRDT sync)

**Prefer:**
- CRDT synchronization
- WebSocket updates
- React Server Components

---

## Forbidden Technologies

AI assistants MUST NOT introduce:

- Redux or other global state managers
- Firebase (Supabase is the provider)
- GraphQL (REST + WebSocket architecture)
- Alternative editors (Monaco is required)
- Alternative auth providers (Supabase Auth only)

---

## Key Integration Points

### Yjs + Monaco Editor

```typescript
// Use y-monaco binding for CRDT sync
import { MonacoBinding } from 'y-monaco'
```

### Hocuspocus Server

```typescript
// Collaboration server handles WebSocket connections
// and Yjs document synchronization
```

### Supabase Client

```typescript
// Used for:
// - Authentication
// - PostgreSQL metadata queries
// - Realtime presence fallback
```

### Judge0 Proxy

```typescript
// Backend service pattern:
// 1. Validate request with Zod
// 2. Check rate limits
// 3. Forward to Judge0
// 4. Return structured response
```

---

## Deployment Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel    │     │   Railway    │     │   Docker    │
│  Frontend   │────▶│   Backend    │────▶│   Judge0    │
│  (Next.js)  │     │  (Fastify)   │     │  (Sandbox)  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Supabase   │
                    │ (Postgres +  │
                    │     Auth)    │
                    └──────────────┘
```

---

## Priority Principles

1. **Correctness** — CRDT consistency is non-negotiable
2. **Realtime Stability** — Yjs sync must never break
3. **Security** — Always validate, never trust client
4. **Simplicity** — Avoid unnecessary abstraction layers

---

## Quick Reference

### When Generating Code

1. Check existing utilities first
2. Follow existing folder structure
3. Use existing Zod schemas
4. Do not duplicate logic

### Room Lifecycle

1. User creates/joins room → Backend validates auth
2. WebSocket connection → Hocuspocus handles Yjs sync
3. Presence broadcast → Yjs Awareness protocol
4. Room cleanup → On disconnect timeout

### Database Schema (Metadata Only)

- `users` — User profiles
- `projects` — Project metadata
- `rooms` — Collaboration room config
- `access_control` — Permissions
- `execution_history` — Code execution logs

**Never store editor content in database.**
