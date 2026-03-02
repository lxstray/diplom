# AI Skill Context — Collaborative Coding Platform

This repository contains a real-time collaborative coding platform.

AI assistants working in this repository MUST follow this document as the
primary engineering guideline.

The system architecture is optimized for:

- CRDT collaboration
- realtime communication
- distributed editing
- low latency synchronization
- secure remote code execution

DO NOT introduce technologies outside this stack.

---

# System Architecture

Architecture type:

Fullstack TypeScript distributed realtime system.

Main components:

1. Next.js frontend
2. Node.js backend API
3. Hocuspocus collaboration server
4. Supabase services
5. Judge0 execution service
6. WebRTC peer communication

Source of truth rules:

Editor state → Yjs CRDT  
Database state → Postgres  
Presence → Supabase realtime fallback.

---

# Technology Stack (STRICT)

## Frontend

Framework:
Next.js App Router.

Language:
TypeScript (strict).

UI:

- Tailwind CSS
- shadcn/ui

Editor:

- Monaco Editor
- y-monaco

Rules:

Prefer Server Components.

Client Components allowed only when required for:

- editor
- websocket
- WebRTC
- interaction.

---

## Backend

Runtime:

Node.js TypeScript.

Framework priority:

1. Fastify
2. Express (allowed fallback).

Architecture:

modular service-based backend.

Backend responsibilities:

- authentication validation
- websocket signaling
- Judge0 proxy
- rate limiting
- collaboration lifecycle.

---

# Collaboration Model

Realtime editing uses CRDT.

Library:

Yjs.

Server:

Hocuspocus.

Important rule:

Backend NEVER modifies editor document state.

Only Yjs synchronization controls documents.

---

## Shared Structures

Inside Y.Doc:
files → Y.Map
fileContent → Y.Text

Example:

file tree stored as metadata map.

Each file:
{
id,
name,
language,
path,
content(Y.Text)
}

---

# Virtual File System Rules

File operations must be CRDT safe.

Allowed operations:

- create file
- delete file
- rename
- update content.

Avoid centralized filesystem logic.

---

# Authentication

Provider:

Supabase Auth.

Frontend obtains JWT.

Backend MUST verify token.

Never trust client userId.

---

# Database

Database:

Supabase PostgreSQL.

ORM:

Prisma.

Database stores ONLY metadata:

- projects
- users
- access control
- rooms
- execution history.

Never store editor content permanently.

Editor content belongs to Yjs.

---

# WebSocket Layer

Primary:

Hocuspocus websocket.

Optional signaling:

ws or socket.io.

Used for:

- room join
- signaling
- collaboration lifecycle.

---

# Presence System

Primary presence:

Yjs awareness.

Fallback:

Supabase realtime presence.

Used when websocket reconnect occurs.

---

# Video / Audio Communication

Technology:

WebRTC.

Libraries allowed:

- simple-peer
- PeerJS
- native WebRTC.

Architecture:

peer-to-peer mesh.

Backend used only for signaling.

---

# Code Execution

Execution engine:

Judge0.

Security rule:

Client NEVER communicates directly with Judge0.

Flow:

Client → Backend Proxy → Judge0.

Backend must implement:

- rate limiting
- auth validation
- timeout protection.

---

# Deployment

Frontend:

Vercel.

Backend:

Railway Docker deployment.

Judge0 runs as container service.

---

# Validation

All external input MUST use Zod schemas.

Includes:

- REST API
- websocket events
- execution requests.

---

# Frontend Structure
app/
(editor routes)

components/
(ui reusable)

features/
(editor collaboration logic)

hooks/

lib/
(api + websocket clients)

types/

Feature-first organization preferred.

---

# Backend Structure
src/
modules/
auth/
projects/
execution/
collaboration/

routes/
services/
plugins/
schemas/
utils/

Business logic belongs in services.

Routes must remain thin.

---

# Performance Constraints

Avoid:

- polling
- unnecessary rerenders
- global state managers.

Prefer:

- CRDT sync
- websocket updates
- server components.

---

# Security Constraints

Required:

JWT verification.

Websocket authentication.

Execution sandbox isolation.

Rate limiting.

Never expose internal service URLs.

---

# AI Generation Constraints

AI MUST NOT introduce:

Redux
Firebase
GraphQL replacement
different editors
different auth providers.

Stay inside ecosystem.

---

# Coding Style

Strict TypeScript required.

Avoid:

any
large classes.

Prefer:

pure functions
composition
small modules.

---

# Naming

Clear domain naming required.

Examples:

createProjectService
joinRoomHandler
executeCodeController

Avoid generic names.

---

# Error Handling

Backend:

structured error responses.

Frontend:

graceful UI fallback.

---

# When Generating Code

AI should prefer:

existing utilities
existing folder structure
existing schemas.

Do not duplicate logic.

---

# Priority Principles

Correctness > scalability > abstraction.

Realtime stability is critical.

CRDT consistency must never break.
