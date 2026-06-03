# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

**AI Socratic Learning Studio** — a Next.js app where users learn complex topics through guided Socratic questioning, building a persistent personal knowledge system. Phases 0–7 are complete.

See `ROADMAP.md` for the full product vision and `docs/phase-0/` for specs (data model, wireframes, personas).

> **`AGENTS.md` mirrors this file** (same content, Codex-flavored header). Keep the two in sync when editing either.

## Commands

```bash
npm run dev      # start dev server on http://localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

No tests configured. DB file is created automatically at `data/socratic.sqlite` on first run.

## Environment variables

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Used by the Socratic engine and embeddings. Required for sessions to work. |
| `NEXT_PUBLIC_BASE_PATH` | Optional base path for deployment. |

The Preferences modal (gear icon in navbar) can also set the key via `/api/settings/openai-key`, which writes to `.env`.

## Architecture

### Next.js App Router

`app/layout.tsx` mounts the Chakra UI dashboard shell (Sidebar + Navbar + Footer) around all non-auth pages. `AppWrappers.tsx` provides `ChakraProvider`.

### Database

SQLite via `better-sqlite3`. File: `data/socratic.sqlite`. Schema and seeding live in:
- `src/lib/db.ts` — singleton connection, WAL mode, full schema creation
- `src/lib/seed.ts` — idempotent seed with demo data (goal-1, session-1…)
- `src/lib/repos.ts` — all data-access functions (no ORM, raw SQL)

**Critical:** All API routes that touch the DB must have `export const runtime = 'nodejs'`. Both `better-sqlite3` and `@react-pdf/renderer` are listed in `serverExternalPackages` in `next.config.js` (they cannot be bundled). Never use `runtime = 'edge'` for these routes.

Seeding runs two ways: `app/layout.tsx` pings `GET /api/db-init` once on mount, and every DB-touching route also calls `seedDemoData()` defensively. The seed is idempotent, so calling it repeatedly is safe.

### API request validation

API routes parse and validate bodies through `src/lib/apiValidation.ts → parseJsonBody(req, zodSchema)`, which returns either `{ data }` or `{ response }` (a ready 400). Follow this pattern for new POST routes — define a Zod schema and early-return `parsed.response`. `isLocalRequest(req)` gates dev-only endpoints (e.g. writing the OpenAI key to `.env`).

### Socratic Engine (Phase 3)

`src/lib/socraticEngine.ts` — uses Vercel AI SDK (`ai` + `@ai-sdk/openai`) with `generateObject` to return structured JSON per turn:
- `tutorMessage` — next Socratic question or minimal explanation
- `conceptsExtracted` — concepts identified with status (confirmed/learning/untested)
- `misconception` — detected misconception with correction (nullable)
- `gapDetected`, `confidenceScore`, `mode`

Uses `gpt-4o-mini` at temperature 0.4. Zod schema is in the same file.

### Artifact Generator (Phase 4)

`src/lib/artifactGenerator.ts` — called when a session ends (`POST /api/sessions/[id]/end`). Single LLM call that generates summary, mastered/weak concepts, flashcards, quiz questions, and suggested next topic. Stores in `learning_artifacts` table.

### Embeddings (Phase 5)

`src/lib/embeddings.ts` — ported from BFrost, uses `text-embedding-3-small` via OpenAI. Stores float32 BLOBs in `concept_embeddings` / `message_embeddings` tables. Search falls back to keyword if embeddings unavailable.

### Document RAG

`src/lib/documentRetrieval.ts` — `chunkText` splits uploaded text into ~600-char paragraph chunks (hard ceiling 1 200), `embedAndStoreChunks` embeds each and stores in `document_chunk_embeddings` (keyed by `goal_id` for fast per-goal lookup), `retrieveRelevantChunks` embeds the current turn's query and returns the top-3 chunks by cosine similarity (threshold 0.45). Called at upload time (synchronous, so chunks are ready before the first session turn) and at every chat turn. Falls back to flat 12 000-char truncation from `source_documents` if no chunk embeddings exist (backward-compatible with documents uploaded before this feature).

### Spaced Repetition (Phase 6)

`src/lib/repos.ts → updateReviewItem()` — SM-2 algorithm. Review items are created after each misconception detection and after artifact generation (for flashcards).

### Thinking Profiler / "How You Think" (Phase 7)

`src/lib/thinkingProfiler.ts` — `generateThinkingProfile()` aggregates the learner's goals, concepts, misconceptions, and sessions into a single `generateObject` call that infers **cross-cutting cognitive traits** (strengths, weaknesses, abstract mistake patterns, learning-style assessment). The Zod schema deliberately forbids returning concept/topic names as traits. The profile is **generated on demand, not stored** — `GET /api/profile/thinking` recomputes it each call. Surfaced at `/profile`.

### PDF export

`src/lib/pdfTemplate.tsx` (`SessionPdf`) renders an artifact to PDF via `@react-pdf/renderer`'s `renderToBuffer` inside the export route. This is why `@react-pdf/renderer` needs `runtime = 'nodejs'` + `serverExternalPackages`.

### Legacy template code

`app/api/chatAPI/route.ts` + `src/utils/chatStream.ts` are a plain streaming-chat endpoint inherited from the Horizon AI template (models `gpt-4o`/`gpt-3.5-turbo`). It is **not** part of the Socratic learning flow — don't confuse it with `socraticEngine.ts`.

### API Routes

All routes under `app/api/` use `runtime = 'nodejs'` and call `seedDemoData()` to ensure DB is initialized.

| Route | Purpose |
|---|---|
| `GET /api/goals` | List active goals |
| `POST /api/goals` | Create new goal |
| `GET /api/sessions` | Recent sessions |
| `POST /api/sessions` | Create session for a goal |
| `POST /api/sessions/[id]/chat` | Socratic turn (no body = opening question) |
| `POST /api/sessions/[id]/end` | End session + generate artifact |
| `GET /api/sessions/[id]/artifact` | Get session artifact |
| `GET /api/concepts` | All concepts + misconceptions |
| `GET /api/review` | Due review items |
| `POST /api/review` | Update review item (SM-2) |
| `GET /api/search?q=...` | Semantic + keyword search |
| `GET /api/export?session=...&format=markdown\|anki\|json\|pdf` | Download artifact |
| `GET /api/profile/thinking` | Generate the "How You Think" cognitive profile (recomputed each call) |
| `GET/POST /api/settings/openai-key` | API key management (POST gated by `isLocalRequest`) |
| `GET /api/db-init` | Idempotent DB seed, pinged once by `app/layout.tsx` |
| `POST /api/goals/[id]/documents` | Upload a PDF/.txt/.md as reference material for a goal (multipart/form-data, `file` field) |

### UI Component Library

Chakra UI v2. Custom theme in `src/theme/`. Use `src/lib/chakra.tsx` for `Icon` re-export.

### Routing

`src/routes.tsx` is the single source of truth for sidebar navigation. Four visible routes: Dashboard (`/`), Concept Library (`/concepts`), Export (`/export`), How You Think (`/profile`). `Session` and `New Goal` are `invisible` (navbar breadcrumbs only). `Profile Settings` (`/settings`), `History`, and `Usage` are `disabled` future routes — the `/settings` *page* exists and works, it's just hidden from the sidebar.

**`@/` alias** maps to `src/`.

### Screens

| Path | Component | Data source |
|---|---|---|
| `/` | Dashboard | `GET /api/goals`, `/api/sessions`, `/api/review` |
| `/goal/new` | 5-step goal setup → creates goal + session | `POST /api/goals`, `POST /api/sessions` |
| `/session/[id]` | Socratic session | `POST /api/sessions/[id]/chat` |
| `/session/[id]/summary` | Session artifact | `GET /api/sessions/[id]/artifact` |
| `/concepts` | Concept library | `GET /api/concepts` |
| `/concepts/[id]` | Concept detail (explanations, misconceptions, related) | `GET /api/concepts/[id]` |
| `/export` | Export center | `GET /api/export` |
| `/profile` | "How You Think" cognitive profile | `GET /api/profile/thinking` |
| `/settings` | OpenAI key + preferences | `GET/POST /api/settings/openai-key` |

### Phases deferred

- **Phase 8** — Knowledge graph visualization (D3/Recharts knowledge map, mastery timeline)
- **Phase 9** — Monetization (Stripe, user accounts, auth)
