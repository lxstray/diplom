# Diplom — Collaborative Coding Platform

A real-time collaborative code editor built with Yjs CRDT for conflict-free synchronization.

## Version 0 — MVP (Local Development)

Basic collaborative editing with Monaco Editor and Yjs synchronization.

### Features

- ✅ Real-time collaborative editing using Yjs CRDT
- ✅ Monaco Editor with syntax highlighting
- ✅ Room creation and joining
- ✅ Multi-language support
- ✅ User presence indicators
- ✅ Local development setup with Docker

### Tech Stack

- **Frontend:** Next.js 14, React 18, Monaco Editor, Yjs
- **Backend:** Fastify, Hocuspocus (WebSocket server)
- **Collaboration:** Yjs CRDT with Hocuspocus provider

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker compose -f docker/docker-compose.dev.yml up

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Option 2: Manual Setup

#### Backend

```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:3001
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

---

## Usage

1. **Open the app:** Navigate to `http://localhost:3000`
2. **Create a room:** Click "Create Room" to generate a new room ID
3. **Share the room ID:** Share the room ID with collaborators
4. **Join a room:** Enter the room ID and click "Join"
5. **Start coding:** Multiple users can edit simultaneously with real-time sync

### Features

- **Language Selection:** Choose from JavaScript, TypeScript, Python, Java, C++, Go, Rust
- **User Name:** Set your display name for the session
- **Connection Status:** See connection status in the header

---

## Project Structure

```
diplom/
├── backend/              # Fastify API server
│   ├── src/
│   │   └── index.ts      # Main server entry
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # Reusable components
│   │   ├── features/     # Feature-specific logic
│   │   └── hooks/        # Custom React hooks
│   ├── package.json
│   └── tsconfig.json
├── docker/
│   └── docker-compose.dev.yml
└── QWEN.md               # AI assistant context
```

---

## Architecture

### Collaboration Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Yjs Doc   │
│ (Monaco +   │ WS  │ (Hocuspocus) │ Sync│  (CRDT)     │
│  Yjs)       │◀────│              │◀────│             │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Yjs Data Structure

```typescript
// Inside Y.Doc
{
  fileContent: Y.Text  // Shared editor content
}
```

---

## API Endpoints

### Backend (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/rooms` | POST | Create new room |
| `/api/rooms/:roomId` | GET | Get room info |
| `/collaboration` | WebSocket | Hocuspocus connection |

---

## Development

### Commands

**Backend:**
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run typecheck # Type check only
```

**Frontend:**
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run typecheck # Type check only
```

---

## Roadmap

See [QWEN.md](./QWEN.md) for the complete version roadmap.

### Version 0 (Current)
- Basic collaborative editing
- Single file workspace
- No authentication

### Version 1 (Next)
- Supabase authentication
- Multi-file projects
- Project management
- Access control

### Version 2
- Judge0 code execution
- Rate limiting
- Execution history

### Version 3
- WebRTC video/audio
- Chat functionality
- Screen sharing

### Version 4
- Production deployment
- Full security hardening
- CI/CD pipeline

---

## Troubleshooting

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

---

## License

MIT
