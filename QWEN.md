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
| Styling | **Tailwind CSS v4** + **shadcn/ui** (required) |
| Editor | Monaco Editor + y-monaco |
| State | Yjs CRDT (editor state only) |

**UI Components:** Always use shadcn/ui components for UI elements (buttons, inputs, dialogs, etc.). Do not create custom styled components when shadcn/ui provides an equivalent.

**Theme:** Dark theme by default. Use Tailwind's dark mode variant (`dark:`) for theme-specific styles.

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
- Custom UI components when shadcn/ui equivalents exist
- Other CSS frameworks (styled-components, emotion, etc.)

---

## UI Development Guidelines

### shadcn/ui Usage

**Always prefer shadcn/ui components:**

```typescript
// ✅ Good - using shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ❌ Bad - creating custom styled elements
<button className="px-4 py-2 bg-blue-500 rounded">Click</button>
```

**Available components:**
- `Button` - Buttons with variants (default, destructive, outline, secondary, ghost, link)
- `Input` - Form inputs
- `Badge` - Status badges
- `Select` - Dropdown selects
- `Dialog` - Modal dialogs
- `Card` - Card containers
- `Label` - Form labels
- `Textarea` - Multi-line inputs

### Adding New Components

```bash
cd frontend
npx shadcn@latest add <component-name>
```

### Theme

- **Dark theme by default** - Add `className="dark"` to `<html>` element
- Use CSS variables from `globals.css` for colors
- Use Tailwind's `dark:` variant for theme-specific overrides

### Color Reference

```css
/* Use these Tailwind classes */
bg-background      /* Main background */
bg-card            /* Card/panel backgrounds */
bg-primary         /* Primary actions */
bg-destructive     /* Danger actions */
bg-muted           /* Subtle backgrounds */

text-foreground    /* Main text */
text-muted-foreground  /* Secondary text */

border-border      /* Borders */
```

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

## Version Roadmap

### Version 0 — MVP (Local Development) ✅

**Goal:** Basic collaborative editing working locally

**Features:**
- [x] Fastify backend server with WebSocket support
- [x] Next.js frontend with Monaco Editor
- [x] Hocuspocus server for Yjs synchronization
- [x] Basic room creation/join (no auth)
- [x] Real-time text synchronization between clients
- [x] Simple file tree (single file)

**Infrastructure:**
- [x] Local development setup
- [x] Docker Compose for local services
- [ ] Local Supabase (no auth initially)
- [x] No Judge0 integration
- [x] No WebRTC

---

### Version 1 — Authentication + Multi-file

**Goal:** Secure collaboration with project management

**Features:**
- [x] Supabase Auth integration
- [x] JWT validation on backend
- [x] Multi-file project workspace
- [x] Project CRUD operations
- [x] Room access control
- [x] User presence indicators

**Infrastructure:**
- Supabase Cloud or self-hosted
- Prisma ORM setup
- Database schema for users/projects/rooms

---

### Version 2 — Code Execution

**Goal:** Run code securely from the editor

**Features:**
- [x] save prev rooms/projects
- [x] Judge0 integration
- [x] Backend proxy for execution requests
- [x] Rate limiting
- [ ] ?Multiple language support
- [x] Console output display

**Infrastructure:**
- Judge0 Docker container
- Execution queue management

---

### Version 3 — Communication

**Goal:** Full team collaboration experience

**Features:**
- [x] WebRTC peer-to-peer video/audio
- [x] Chat functionality and emodji
- [x] Cursor presence visualization
- [x] User avatars

**Infrastructure:**
- WebRTC signaling server
- STUN/TURN configuration

---

### Version 4 — Production Ready

**Goal:** Deployment and polish

**Features:**
- [ ] leetcode analogue
- [ ] Error handling & logging
- [ ] Performance optimization
- [ ] Security hardening

**Infrastructure:**
- Docker Compose for all services
- Production deployment configs
- CI/CD pipeline

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
