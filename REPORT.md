# Diplom — Collaborative Coding Platform
## Comprehensive Project Report

---

## 1. Project Overview

**Diplom** is a full-stack real-time collaborative coding platform built as a distributed TypeScript system. The application enables multiple users to edit code simultaneously with CRDT-based synchronization (similar to Google Docs for programming), solve coding challenges, communicate via text chat and video/audio calls, and execute code in a secure sandboxed environment.

### Core Capabilities

- **Real-time collaborative editing** using Yjs CRDT for conflict-free synchronization
- **Multi-file project workspace** with virtual file system
- **Live presence indicators** showing active collaborators and their cursors
- **Peer-to-peer video/audio communication** via WebRTC
- **Secure remote code execution** through Judge0 sandbox
- **Room-based collaboration** with access control (owner-only or anyone with link)
- **Task/challenge system** integrated with Exercism curriculum
- **Progress tracking** with statistics and activity calendars

---

## 2. Technology Stack

### 2.1 Frontend

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js App Router | 14.1.0 |
| Language | TypeScript (strict mode) | 5.3.3 |
| UI Library | React | 18.2.0 |
| Styling | Tailwind CSS v4 | 4.2.1 |
| UI Components | shadcn/ui (Radix UI primitives) | - |
| Editor | Monaco Editor | 0.47.0 |
| CRDT Library | Yjs | 13.6.18 |
| Editor Binding | y-monaco | 0.1.5 |
| WebSocket Provider | @hocuspocus/provider | 2.13.5 |
| WebRTC | simple-peer | 9.11.1 |
| Authentication | @supabase/supabase-js | 2.98.0 |
| Icons | Lucide React | 0.576.0 |
| Markdown Rendering | react-markdown | 10.1.0 |
| Resizable Panels | react-resizable-panels | 2.1.9 |

### 2.2 Backend

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 20.x |
| Language | TypeScript (ES Modules) | 5.3.3 |
| Framework | Fastify | 4.26.2 |
| WebSocket | @fastify/websocket | 10.0.1 |
| CORS | @fastify/cors | 9.0.1 |
| Collaboration Server | Hocuspocus | 3.4.4 |
| CRDT | Yjs | 13.6.18 |
| Database Extension | @hocuspocus/extension-database | 3.4.4 |
| ORM | Prisma | 5.22.0 |
| Validation | Zod | 3.23.8 |
| Authentication | @supabase/supabase-js | 2.98.0 |
| JWT | jsonwebtoken | 9.0.3 |

### 2.3 Infrastructure

| Service | Technology | Version |
|---------|------------|---------|
| Database | PostgreSQL (via Supabase) | 16.2 |
| Authentication | Supabase Auth (JWT) | - |
| Code Execution | Judge0 (custom Docker image) | latest |
| Cache/Queue | Redis (for Judge0) | 7.2.4 |
| Containerization | Docker & Docker Compose | - |
| Deployment | Vercel (frontend), Railway/Docker (backend) | - |

---

## 3. Application Architecture

### 3.1 High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Railway        │     │   Docker        │
│   Frontend      │────▶│   Backend        │────▶│   Judge0        │
│   (Next.js)     │     │   (Fastify)      │     │   (Sandbox)     │
│   Port 3000     │     │   Port 3001      │     │   Port 2358     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                      │
         │                      ▼
         │            ┌──────────────────┐
         │            │   Hocuspocus     │
         │            │   WebSocket      │
         │            │   Port 3002      │
         │            └──────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────┐
│           Supabase Cloud                │
│   ┌─────────────┐    ┌───────────────┐  │
│   │  PostgreSQL │    │  Auth (JWT)   │  │
│   │  Database   │    │               │  │
│   └─────────────┘    └───────────────┘  │
└─────────────────────────────────────────┘
```

### 3.2 CRDT Collaboration Model

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Monaco Editor  │────▶│  Yjs CRDT        │────▶│  Hocuspocus     │
│  (Frontend)     │     │  (Source of      │     │  (Sync Server)  │
│                 │◀────│   Truth)         │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  PostgreSQL      │
                    │  (State Persist) │
                    └──────────────────┘
```

**Critical Rule:** The backend NEVER modifies editor document state. Only Yjs synchronization controls document content.

### 3.3 Shared Yjs Data Structures

```typescript
// Inside Y.Doc
{
  files: Y.Map<FileMetadata>      // File tree metadata
  fileContent: Y.Map<Y.Text>      // Actual file content per file ID
}
```

### 3.4 File Operations (CRDT-Safe)

- Create file
- Delete file
- Rename file
- Update content

---

## 4. Database Structure

### 4.1 Database Schema (Prisma)

```prisma
model User {
  id        String   @id
  email     String   @unique
  projects  Project[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  rooms     Room[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Room {
  id        String   @id @default(cuid())
  name      String
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  access    RoomAccessLevel @default(OWNER)
  accesses  RoomAccess[]
  collabDocument CollabDocument?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CollabDocument {
  roomId    String   @id
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  state     Bytes
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model RoomAccess {
  id        String   @id @default(cuid())
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  userId    String
  lastAccessed DateTime @default(now())
  accessedAt DateTime @default(now())

  @@unique([roomId, userId])
  @@index([userId])
}

enum RoomAccessLevel {
  OWNER
  ANYONE_WITH_LINK
}

model TaskRoomSession {
  id          String   @id @default(cuid())
  roomId      String   @unique  // The task room ID (e.g., "task-foo-abc123")
  taskSlug    String
  ownerId     String   // User ID of the session creator
  accessLevel RoomAccessLevel @default(ANYONE_WITH_LINK)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([roomId])
  @@index([ownerId])
}

model TaskProgress {
  id        String   @id @default(cuid())
  userId    String
  taskSlug  String
  language  String
  completed Boolean  @default(false)
  attempts  Int      @default(0)
  lastAttemptAt DateTime?
  completedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, taskSlug, language])
  @@index([userId])
  @@index([userId, completed])
}

model ActivityLog {
  id        String   @id @default(cuid())
  userId    String
  taskSlug  String
  language  String
  action    ActivityAction
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([userId, createdAt])
}

enum ActivityAction {
  STARTED
  COMPLETED
  SUBMITTED
}
```

### 4.2 Database Design Principles

- **Editor content is NOT stored in the database** — Only Yjs CRDT state (as binary bytes)
- **Metadata only** — Users, projects, rooms, access control
- **Task progress tracking** — User completion status, attempts, activity logs
- **Room history** — Track which rooms each user has accessed

---

## 5. Pages and Their Functionality

### 5.1 Landing Page (`/`)

**Purpose:** Entry point for unauthenticated users

**Features:**
- Hero section with platform description
- Feature highlights (Coding Challenges, Collaborative Editing, Progress Tracking)
- Navigation to Tasks page
- Authentication status check (redirects authenticated users to `/tasks`)

**Components:**
- Header with logo and navigation
- Feature cards grid
- Call-to-action buttons

---

### 5.2 Sign In Page (`/signin`)

**Purpose:** User authentication

**Features:**
- Email/password sign-in form
- Email/password sign-up form
- OAuth authentication (Google, GitHub)
- Form validation with error messages
- Automatic redirect after successful authentication

**Security:**
- Supabase Auth handles credential management
- JWT tokens stored securely
- Password requirements enforced

---

### 5.3 Tasks Dashboard Page (`/tasks`)

**Purpose:** Main hub for authenticated users — browse challenges, view statistics, manage projects

**Features:**

**Header:**
- Platform branding
- New Project button
- Join Room button
- Room History toggle
- User profile with sign-out

**Tabs System:**

1. **Tasks Tab:**
   - Statistics panel (total completed, attempts, completion rate)
   - Task filters (difficulty: easy/medium/hard, status: all/completed/not completed)
   - Task cards grid (4 columns responsive)
   - Each card shows: task name, difficulty, topics, completion status

2. **Statistics Tab:**
   - Overall statistics panel
   - Activity calendar (GitHub-style contribution graph)
   - Progress summary (total completed, attempts, completion rate)
   - Difficulty breakdown (easy/medium/hard counts)

**Dialogs:**

1. **New Project Dialog:**
   - Project name input
   - Creates project and initial "Main Room"
   - Redirects to editor with new room

2. **Join Room Dialog:**
   - Room ID input
   - Supports both project rooms and task rooms
   - Validates room access before joining

**Room History Panel (Sidebar):**
- List of recently accessed rooms
- Quick reconnect button
- Remove from history option

---

### 5.4 Task Detail Page (`/tasks/[slug]`)

**Purpose:** Solve individual coding challenges with collaborative features

**Features:**

**Layout:** Three-panel layout (file tree, editor, right sidebar)

**Left Sidebar (File Tree):**
- Task file structure
- Problem description file (read-only)
- Solution file (editable)
- Test file (read-only)

**Main Editor Area:**
- Monaco Editor with syntax highlighting
- Language selector (JavaScript, TypeScript, Python, Java, C++, Go, Rust)
- Run button for code execution
- Console output panel (resizable)

**Right Sidebar (Collaboration Features):**

1. **Task Info Panel:**
   - Task name and description
   - Difficulty indicator
   - Topics/tags
   - Instructions

2. **Collaborators Panel:**
   - List of connected users
   - User count badge
   - Real-time presence updates

3. **Chat Panel:**
   - Real-time text messaging
   - Emoji picker (smileys, hands, misc categories)
   - Message history with timestamps
   - Auto-scroll to latest message
   - Avatar display for each user

4. **Video Panel (Floating/Draggable):**
   - Local video preview
   - Remote participant videos
   - Mute/unmute audio
   - Enable/disable video
   - Turn camera on/off
   - Draggable window positioning

**Task Room Features:**
- Task-specific collaboration rooms (format: `task-{slug}-{sessionId}`)
- First user to join becomes room owner
- Access control (owner-only or anyone with link)
- Non-persistent (ephemeral sessions)

**Code Execution:**
- Run code button sends to Judge0 via backend proxy
- Console output display (stdout, stderr, compile errors)
- Execution time and memory usage display
- Rate limiting per user

**Completion Tracking:**
- Mark task as completed button
- Progress saved to database
- Activity logged

---

### 5.5 Editor Page (`/editor`)

**Purpose:** General collaborative coding workspace for projects

**Features:**

**Header:**
- Room ID display with connection status badge
- Collaborators count
- Access control button
- Video chat toggle
- Chat toggle
- Leave room button
- Language selector
- Run code button

**Left Sidebar (File Tree):**
- Project file structure
- Create file button
- Delete file button
- Rename file capability
- File icons by type

**Main Editor Area:**
- Monaco Editor with CRDT synchronization
- Multi-file support with tab switching
- Real-time collaborative editing
- Cursor presence indicators (remote user cursors with names/colors)
- Syntax highlighting for multiple languages

**Bottom Panel (Console):**
- Resizable height
- Code execution output
- Error display
- Clear output button
- Auto-scroll to latest output

**Right Sidebar:**

1. **Collaborators Panel:**
   - List of connected users with avatars
   - Real-time join/leave notifications
   - User count

2. **Chat Panel:**
   - Same features as task detail chat
   - Emoji support
   - Message timestamps

3. **Video Panel (Floating/Draggable):**
   - Same features as task detail video
   - Peer-to-peer WebRTC connections

**Room Management:**
- Project rooms with persistent storage
- Room access levels (OWNER, ANYONE_WITH_LINK)
- Room access history tracking
- Only project owner can modify room settings

---

## 6. Security Measures

### 6.1 Authentication

**Flow:**
1. Frontend obtains JWT from Supabase Auth
2. Backend verifies JWT on every request using service role key
3. User identity extracted from JWT claims

**Implementation:**
- Supabase Auth handles credential storage and validation
- OAuth providers (Google, GitHub) configured
- JWT tokens included in Authorization header: `Bearer <token>`
- Backend middleware (`requireAuth`) validates all protected routes

**Critical Rule:** Never trust client-provided userId — always extract from verified JWT

---

### 6.2 WebSocket Security

**Hocuspocus Authentication:**
```typescript
async onAuthenticate(data) {
  const token = data.token;
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !userData?.user) {
    connection.close();
    return;
  }
  
  // Check room access permissions
  const { canAccess } = await roomService.canAccessRoom(roomId, userId);
  if (!canAccess) {
    throw new Error('Access denied');
  }
}
```

**Security Features:**
- JWT required for WebSocket connection
- Room access validation before allowing join
- Connection closed on invalid token
- Task room access control (owner or anyone with link)

---

### 6.3 Code Execution Security

**Architecture:**
```
Client → Backend Proxy → Judge0
```

**Backend Implements:**
- JWT validation before forwarding request
- Rate limiting per user (configurable limits)
- Request validation with Zod schemas
- Timeout protection
- Error handling and sanitization

**Critical Rule:** Client NEVER communicates directly with Judge0

**Rate Limiting:**
- Tracks executions per user
- Returns 429 status when limit exceeded
- Configurable time windows

---

### 6.4 Input Validation

**All External Input Validated with Zod:**
- REST API request bodies
- URL parameters
- Query parameters
- WebSocket messages

**Example Schema:**
```typescript
const executeCodeSchema = z.object({
  code: z.string(),
  language: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust']),
  roomId: z.string().optional(),
  fileId: z.string().optional(),
});
```

---

### 6.5 Room Access Control

**Access Levels:**
- `OWNER` — Only project owner can access
- `ANYONE_WITH_LINK` — Anyone with room ID can join

**Task Room Access:**
- First user to join becomes owner
- Owner can change access level
- Access checked on WebSocket authentication

**Database Tracking:**
- `RoomAccess` table tracks user-room access history
- Enables "recent rooms" functionality

---

### 6.6 CORS Configuration

```typescript
await fastify.register(cors, {
  origin: true, // Configured for production domains
});
```

---

## 7. Deployment and Execution

### 7.1 Local Development Setup

**Docker Compose (Recommended):**
```yaml
services:
  backend:
    ports:
      - "3001:3001"  # HTTP API
      - "3002:3002"  # WebSocket
    volumes:
      - ./backend:/app
  
  frontend:
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_BACKEND_URL=http://backend:3001
      - NEXT_PUBLIC_COLLAB_URL=ws://backend:3002
```

**Commands:**
```bash
# Start all services
docker compose -f docker/docker-compose.dev.yml up

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# WebSocket: ws://localhost:3002
```

---

### 7.2 Judge0 Code Execution Setup

**Docker Compose:**
```yaml
services:
  server:
    image: mrkushalsm/judge0:latest
    ports:
      - "2358:2358"
    privileged: true
  
  worker:
    image: mrkushalsm/judge0:latest
    command: ["./scripts/workers"]
    privileged: true
  
  db:
    image: postgres:16.2
  
  redis:
    image: redis:7.2.4
```

**Commands:**
```bash
# Start Judge0 stack
docker compose -f docker/judge0.docker-compose.yml up -d

# View status
docker compose -f docker/judge0.docker-compose.yml ps

# View logs
docker compose -f docker/judge0.docker-compose.yml logs --tail=80 server worker
```

---

### 7.3 Production Deployment

**Frontend (Vercel):**
- Next.js automatically optimized
- Environment variables configured in Vercel dashboard
- Automatic HTTPS

**Backend (Railway/Docker):**
- Docker container deployment
- Environment variables configured in platform
- Port configuration: 3001 (HTTP), 3002 (WebSocket)

**Database (Supabase):**
- Cloud-hosted PostgreSQL
- Connection string via environment variable
- Automatic backups

---

### 7.4 Code Execution Flow

1. User clicks "Run" in editor
2. Frontend sends POST to `/api/execution/execute` with JWT
3. Backend validates JWT and checks rate limits
4. Backend forwards code to Judge0 API
5. Judge0 executes in sandboxed container
6. Results returned to backend
7. Backend returns structured response to frontend
8. Console output displayed to all collaborators

**Supported Languages:**
- JavaScript (Node.js)
- TypeScript
- Python
- Java
- C++
- Go
- Rust

---

## 8. Collaboration Features

### 8.1 Real-Time Collaborative Editing

**Technology:** Yjs CRDT with Hocuspocus

**How It Works:**
1. Each user has a Yjs document
2. Monaco Editor binds to Y.Text via y-monaco
3. Changes are converted to CRDT operations
4. Operations sent to Hocuspocus server via WebSocket
5. Hocuspocus broadcasts to all connected clients
6. CRDT algorithm ensures eventual consistency

**Features:**
- Conflict-free merging of concurrent edits
- No locking or central authority needed
- Works offline (syncs when reconnected)
- Persistent state in database

---

### 8.2 User Presence Indicators

**Implementation:** Yjs Awareness Protocol

**Features:**
- Real-time list of connected users
- User avatars/names displayed
- Connection status indicators
- Automatic cleanup on disconnect

**Data Structure:**
```typescript
interface Peer {
  userId: string;
  userName: string;
  connected: boolean;
  lastSeen: number;
}
```

---

### 8.3 Remote Cursor Visualization

**Implementation:** Custom cursor presence hook with Yjs Awareness

**Features:**
- Colored cursors for each user
- User name label on cursor
- Real-time position updates
- Smooth animation

**How It Works:**
1. Cursor position captured in Monaco Editor
2. Position sent via Yjs Awareness
3. Broadcast to all peers
4. Remote cursors rendered in overlay layer

---

### 8.4 Text Chat

**Component:** `ChatPanel.tsx`

**Features:**
- Real-time messaging via Yjs CRDT
- Message persistence in Yjs document
- Emoji picker with categories:
  - Smileys: 😀 😁 😂 🤣 😊 😍 😎 😢 😡 🥳 🤡
  - Hands: 👍 👎 👏 🙏 ✌️ 👌
  - Misc: 🔥 ✨ ✅ ❌ 💡 🚀
- Timestamps on messages
- Auto-scroll to latest message
- User avatars
- Own message highlighting (right-aligned)

**Technical Implementation:**
```typescript
// Messages stored in Yjs structure
{
  chat: Y.Array<ChatMessage>
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}
```

**UI Features:**
- Collapsible panel
- Unread message indicator (planned)
- Enter to send
- Focus on open

---

### 8.5 Video/Audio Chat

**Component:** `VideoPanel.tsx`

**Technology:** WebRTC with simple-peer

**Features:**
- Peer-to-peer video streaming
- Local video preview
- Remote participant videos
- Mute/unmute audio toggle
- Enable/disable video toggle
- Turn camera on/off button
- Draggable floating window
- Avatar fallback when video disabled

**Technical Implementation:**

**Signaling:**
- Primary: Yjs Awareness (through Hocuspocus)
- Fallback: REST API endpoints (`/api/rooms/:roomId/signaling`)

**WebRTC Flow:**
1. User enables video → requests media permissions
2. Local stream created
3. Offer/answer exchange via signaling
4. ICE candidates exchanged
5. Peer connection established
6. Video streams shared directly (P2P)

**Data Structure:**
```typescript
interface RemoteStream {
  peerId: string;
  stream: MediaStream;
}
```

**UI Features:**
- Fixed-size panel (256px width)
- Draggable header
- Video grid layout
- Control buttons at bottom
- Status badges (mute indicators)
- Error display

**Permissions:**
- Browser media permission required
- Graceful fallback if denied
- Error messages displayed

---

### 8.6 Room Types

**Project Rooms:**
- Persistent collaboration spaces
- Created within projects
- Stored in database
- Access control (owner/anyone with link)
- Document state persisted

**Task Rooms:**
- Ephemeral sessions for coding challenges
- Format: `task-{slug}-{sessionId}`
- First joiner becomes owner
- No database persistence
- Access level configurable

---

## 9. Project Structure

```
diplom/
├── backend/                    # Node.js Fastify API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── execution/      # Judge0 proxy & rate limiting
│   │   │   ├── projects/       # Project CRUD operations
│   │   │   └── webrtc/         # WebRTC signaling fallback
│   │   ├── routes/
│   │   │   └── task.routes.ts  # Task-related endpoints
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── services/           # Business logic
│   │   │   ├── execution.service.ts
│   │   │   ├── prisma.ts
│   │   │   ├── task.service.ts
│   │   │   └── taskRoomSession.service.ts
│   │   ├── auth.ts             # JWT validation middleware
│   │   ├── env.ts              # Environment configuration
│   │   ├── index.ts            # Server entry point
│   │   └── supabase.ts         # Supabase client
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Database migrations
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── editor/
│   │   │   │   └── page.tsx    # Editor page
│   │   │   ├── signin/
│   │   │   ├── tasks/
│   │   │   │   └── [slug]/     # Task detail page
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        # Landing page
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   └── ChatPanel.tsx
│   │   │   ├── collaborators/
│   │   │   │   └── CollaboratorsPanel.tsx
│   │   │   ├── cursor/
│   │   │   │   └── CursorOverlay.tsx
│   │   │   ├── file-tree/
│   │   │   │   └── FileTree.tsx
│   │   │   ├── video/
│   │   │   │   └── VideoPanel.tsx
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   └── scroll-area.tsx
│   │   │   ├── ActivityCalendar.tsx
│   │   │   ├── ConsoleOutput.tsx
│   │   │   ├── MonacoEditor.tsx
│   │   │   ├── RoomHistoryPanel.tsx
│   │   │   ├── StatsPanel.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskFilters.tsx
│   │   │   └── Toast.tsx
│   │   ├── features/
│   │   │   └── editor/
│   │   │       └── EditorPage.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   ├── useCodeExecution.ts
│   │   │   ├── useCollaboration.ts
│   │   │   ├── useCursorPresence.ts
│   │   │   ├── useFileContent.ts
│   │   │   ├── useTasks.ts
│   │   │   └── useWebRTC.ts
│   │   ├── lib/
│   │   │   ├── executionClient.ts
│   │   │   ├── exercismJudge0Runner.ts
│   │   │   ├── supabaseClient.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── task.ts
│   ├── components.json         # shadcn/ui config
│   ├── tailwind.config.js
│   └── package.json
│
├── docker/
│   ├── docker-compose.dev.yml  # Development services
│   ├── judge0.conf             # Judge0 configuration
│   └── judge0.docker-compose.yml
│
├── exercism/                   # Exercism task definitions
│   └── javascript/
│
└── QWEN.md                     # AI assistant context
```

---

## 10. API Endpoints

### 10.1 Projects & Rooms

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/projects` | GET | Required | Get all user projects |
| `/api/projects` | POST | Required | Create new project |
| `/api/projects/:id` | GET | Required | Get project by ID |
| `/api/projects/:id` | PATCH | Required | Update project |
| `/api/projects/:id` | DELETE | Required | Delete project |
| `/api/projects/:id/rooms` | POST | Required | Create room in project |
| `/api/projects/:id/rooms` | GET | Required | Get project rooms |
| `/api/rooms/:id` | GET | Required | Get room by ID (with access check) |
| `/api/rooms/:id/access` | PATCH | Required | Update room access level |
| `/api/rooms/:id` | DELETE | Required | Delete room |
| `/api/rooms/history` | GET | Required | Get user's room history |
| `/api/rooms/history/:id` | DELETE | Required | Remove from history |

### 10.2 Tasks

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/tasks` | GET | Required | Get all tasks (with filters) |
| `/api/tasks/:slug` | GET | Required | Get task by slug |
| `/api/tasks/:slug/complete` | POST | Required | Mark task as completed |
| `/api/tasks/:slug/attempt` | POST | Required | Record task attempt |
| `/api/tasks/stats` | GET | Required | Get user task statistics |
| `/api/tasks/progress` | GET | Required | Get user task progress |
| `/api/task-rooms/:id/access` | GET | Required | Get task room access info |
| `/api/task-rooms/:id/access` | PATCH | Required | Update task room access |

### 10.3 Code Execution

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/execution/execute` | POST | Required | Execute code |
| `/api/execution/:id` | GET | Required | Get execution status |

### 10.4 WebRTC Signaling (Fallback)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/rooms/:id/peers` | GET | Optional | Get peers in room |
| `/api/rooms/:id/signaling` | POST | Optional | Send signaling message |

### 10.5 Health

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Health check |

---

## 11. Environment Variables

### Frontend (`.env.local`)

```bash
# Supabase Configuration (Client-side)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend URLs
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_COLLAB_URL=ws://localhost:3002
```

### Backend (`.env`)

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3001
COLLAB_PORT=3002
NODE_ENV=development

# Database (for Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/diplom?schema=public

# Judge0 Configuration
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=your_judge0_api_key_optional
```

---

## 12. Version Roadmap

### Version 0 — MVP (Local Development) ✅ Complete

**Features:**
- Fastify backend server with WebSocket support
- Next.js frontend with Monaco Editor
- Hocuspocus server for Yjs synchronization
- Basic room creation/join (no auth)
- Real-time text synchronization between clients
- Simple file tree (single file)

---

### Version 1 — Authentication + Multi-file ✅ Complete

**Features:**
- Supabase Auth integration
- JWT validation on backend
- Multi-file project workspace
- Project CRUD operations
- Room access control
- User presence indicators

---

### Version 2 — Code Execution ✅ Complete

**Features:**
- Save previous rooms/projects
- Judge0 integration
- Backend proxy for execution requests
- Rate limiting
- Console output display

---

### Version 3 — Communication ✅ Complete

**Features:**
- WebRTC peer-to-peer video/audio
- Chat functionality with emoji support
- Cursor presence visualization
- User avatars
- Task room sessions

---

### Version 4 — Production Ready 🚧 In Progress

**Features:**
- LeetCode analogue
- Error handling & logging
- Performance optimization
- Security hardening

---

## 13. Key Design Decisions

### 13.1 CRDT for Collaboration

**Why Yjs:**
- Operational transformation alternative
- No central conflict resolution needed
- Works offline
- Mathematically guaranteed consistency

### 13.2 Backend Never Modifies Editor State

**Rationale:**
- Prevents sync conflicts
- Single source of truth (Yjs)
- Simplifies backend logic
- Enables offline editing

### 13.3 Metadata-Only Database

**What's Stored:**
- User accounts
- Project/room metadata
- Access control
- Task progress

**What's NOT Stored:**
- Editor content (Yjs state only)
- Chat history (Yjs only)

### 13.4 Peer-to-Peer Video

**Why WebRTC:**
- Lower latency than server-relayed
- Reduces server bandwidth
- Better quality
- Scales with participants (mesh network)

---

## 14. Development Commands

### Backend

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run typecheck # Type check only
```

### Frontend

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run typecheck # Type check only
```

### Database

```bash
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run migrations
npx prisma studio       # Open Prisma Studio GUI
```

---

## 15. Troubleshooting

### Connection Issues

1. Ensure backend is running on port 3001
2. Check WebSocket connection in browser dev tools
3. Verify `NEXT_PUBLIC_BACKEND_URL` environment variable

### Monaco Editor Not Loading

1. Clear browser cache
2. Check browser console for errors
3. Ensure all npm packages are installed

### Yjs Sync Issues

1. Verify Hocuspocus connection status
2. Check room ID matches between clients
3. Restart backend server if needed

### Code Execution Fails

1. Ensure Judge0 Docker containers are running
2. Check `JUDGE0_API_URL` configuration
3. Verify rate limits not exceeded

### WebRTC Not Working

1. Check browser media permissions
2. Verify HTTPS in production (required for media)
3. Check firewall settings for UDP traffic

--

## 16. Conclusion

Diplom is a comprehensive real-time collaborative coding platform that combines modern web technologies with CRDT-based synchronization to enable seamless pair programming and collaborative learning. The architecture prioritizes correctness (CRDT consistency), security (JWT validation, rate limiting), and user experience (real-time updates, intuitive UI).

The platform successfully integrates:
- **Collaborative editing** with Yjs CRDT
- **Secure authentication** with Supabase
- **Code execution** with Judge0 sandbox
- **Real-time communication** with WebRTC and Yjs Awareness
- **Progress tracking** with PostgreSQL

All components work together to create a cohesive experience for learning and collaborating on code.
