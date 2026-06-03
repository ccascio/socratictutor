# Roadmap — AI Socratic Learning Studio

> **What this file is.** A living engineering roadmap: current state, concrete fixes, and
> planned evolutions. The original product vision (positioning, personas, data model,
> session flow, wireframes) now lives in [`docs/phase-0/`](docs/phase-0/) and the UX rationale
> in [`README.md`](README.md) — this file is no longer the vision doc, it's the work plan.

**Core thesis (unchanged):** the moat is not the LLM, it's the **per-user learning-memory
model** — concepts, misconceptions, and a learner profile that make the tutor smarter the
longer you use it. Every item below is judged against that thesis.

---

## 1. Current state

Phases 0–7 are built and working **for a single local user**:

- **Socratic engine** (`src/lib/socraticEngine.ts`) — `generateObject` turn loop, structured
  per-turn output (tutor message, concepts, misconception, confidence).
- **Artifacts** (`src/lib/artifactGenerator.ts`) — summary, flashcards, quiz, next steps on session end.
- **Embeddings + semantic search** (`src/lib/embeddings.ts`, `semanticSearch.ts`) with keyword fallback.
- **Spaced repetition** (SM-2 in `repos.ts`), **PDF/Markdown/Anki/JSON export**, **"How You Think"
  cognitive profile** (`thinkingProfiler.ts`).
- SQLite via `better-sqlite3`, all data keyed off `DEFAULT_USER_ID = 'user-default'`.

**The single biggest structural fact:** there is no auth and no per-user data. Everything is one
hardcoded user. That is fine for the local prototype but gates everything in §3.

---

## 2. Correctness fixes (do first — small, high-value)

These are bugs in shipped behavior, ordered by user impact.

1. **Mastery percent is never computed.** `updateGoalMastery()` (`repos.ts:103`) exists but is
   called nowhere. Every real goal shows the value it was created with (0); the "38% / 15%" on the
   dashboard come *only* from seed data. The headline metric of the product is static.
   → Compute mastery from concept statuses + misconception resolution at session end.

2. **Misconception counts bleed across goals.** `createMisconception` (`repos.ts:337`) increments
   `misconception_count` with `WHERE user_id=? AND name=?` — no goal scoping. A misconception about
   "Attention" in one goal bumps every goal's "Attention" concept. Also `concept_id` is left `NULL`
   on insert, so misconceptions are never hard-linked to their concept.

3. **Review items never dedupe.** `scheduleReview` (`repos.ts:401`) uses `INSERT OR IGNORE` but
   generates a fresh random `id` each call, so the conflict clause can never fire. Re-ending a
   session (artifact is `INSERT OR REPLACE`) re-schedules every flashcard, piling up duplicate
   reviews. → Dedupe on `(user_id, source_type, source_id)`.

4. **Concept status vocabulary drift + `untested` → `weak` conflation.** The engine emits
   `confirmed | learning | untested`; the chat route (`chat/route.ts:91`) remaps to
   `strong | improving | weak`, turning "not yet tested" into "weak." That inflates the weak-concept
   count and review pressure. The `concepts.status` column has no `CHECK` constraint and
   `listConcepts` orders by `status DESC` (a lexical sort over arbitrary strings, not mastery order).
   → Pick one status enum, constrain it in the schema, sort by an explicit mastery rank, and give
   `untested` its own bucket.

5. **`upsertConcept` never updates an existing concept's definition** (`repos.ts:291`) and only bumps
   `session_count` when a status is passed. Re-encountering a concept with a better definition silently
   keeps the old one.

6. **Minor:** `createMisconception` returns its row via `listMisconceptions(...).find(...)` — a full
   table load to fetch one just-inserted row (`repos.ts:338`); select by id instead. SM-2 deviates
   from canonical fixed first-interval steps (`repos.ts:419`) — low priority, label as a tuning choice
   not a bug.

---

## 3. The gating evolution — real users, auth, ownership

This is the pivot that turns the prototype into a product and makes every item in §4/§5 real
instead of theoretical. It is also what unlocks the per-user moat.

- **Accounts + auth.** Replace `DEFAULT_USER_ID` with real sessions. Until then the learner profile
  can't differentiate between people — the moat doesn't exist.
- **Ownership checks on every `[id]` route.** Today `/api/export?session=…`, `/api/concepts/[id]`,
  `/api/sessions/[id]/*` accept any id and return it (single-user, so it "works"). In a multi-user
  world these are IDORs — any user can read/export anyone's session by guessing an id.
- **Auth + rate limits on LLM endpoints.** Chat, session-end, search, and profile all spend OpenAI
  budget with no auth or throttle. On any hosted deploy this is a cost-DoS: anyone who can reach the
  server can drain the API budget. Add per-user quotas.
- **Storage that survives multiple instances.** `better-sqlite3` is a single local file. Moving off
  one machine means Postgres (with `pgvector` for §4) or a hosted SQLite (Turso/LiteFS). The current
  `data/socratic.sqlite` does not survive serverless/multi-instance hosting.

---

## 4. Scale & performance

- **Decouple embedding refresh from the read path.** `searchSemanticMemory` (`semanticSearch.ts:323`)
  calls `refreshSemanticEmbeddingCache` (up to 25 OpenAI embed calls) **plus** 4 full-table scans
  **plus** brute-force cosine in JS — *on every search request*. Refresh embeddings on write (or in a
  background job); the read path should only score a cached index.
- **The 25-doc refresh cap silently degrades coverage.** `MAX_EMBEDDINGS_PER_REFRESH = 25` means with
  more than 25 changed docs, search returns partial results until you search enough times to catch up.
- **Unbounded conversation context.** `chat/route.ts` resends the *entire* message history to the
  model every turn (`runSocraticTurn(... conversationHistory: history ...)`). Cost and latency grow
  linearly with session length. → Cap/summarize history past N turns.
- **No pagination.** `listConcepts`, `listMisconceptions`, and the semantic doc list all load full
  tables. Fine now, not at scale.
- **Move vector search to `pgvector`** (originally planned) once on Postgres — brute-force JS cosine
  is fine for a few hundred docs, not thousands.

---

## 5. Product evolutions

- **Mastery scoring engine.** (See §2.1 — currently the metric is static.) Define how concept
  statuses, confidence scores, and misconception resolution roll up into goal mastery, and recompute
  it on every session end. This is the dashboard's headline number.
- **Real diagnostic session.** `docs/phase-0/session-flow.md` Step 2 specifies a silent 5-question
  diagnostic to estimate level. Today there's a single opening question, no scored diagnostic.
- **Streaming + loading affordance.** The Socratic turn is a blocking `generateObject` with no token
  streaming and no in-flight UI state — the user stares at a frozen input during the call. Stream the
  tutor message (or at minimum add a pending state).
- **Multi-provider LLM abstraction.** Phase 2 planned an OpenAI/Anthropic/Gemini abstraction; the code
  hardcodes `openai('gpt-4o-mini')` in three files. Extract a model provider so Anthropic/Gemini and
  model upgrades are config, not edits.
- **Phase 8 — advanced dashboard:** knowledge-graph viz, mastery timeline, prerequisite map,
  misconception history, learning velocity, "next best concept." This is what makes the product look
  unlike chat.
- **Export breadth:** Obsidian vault + Notion export (the differentiator for the technical audience);
  md / Anki / JSON / PDF already ship.

---

## 6. Cleanup (low-risk, removes confusion)

- **`.github/workflows/deploy.yml` is broken and misleading.** It targets Node 14 + `yarn export` →
  gh-pages static hosting, which is fundamentally incompatible with this app's `runtime = 'nodejs'`
  API routes and `better-sqlite3`. Either rewrite for a Node host (Vercel/Fly/Railway) or delete it.
- **Stray DB copy.** `data/socratic 2.sqlite` (+ its `-wal`) is a Finder duplicate — delete it.
- **Legacy Horizon-template cruft.** `app/api/chatAPI/route.ts` + `src/utils/chatStream.ts` (a plain
  streaming chat unrelated to the Socratic flow), `src/lib/mockData.ts`, and `react-router-dom` v5
  layered under Next's App Router. Pruning these (and the unused `material-tailwind`, `react-table`,
  codemirror deps) shrinks the surface and the confusion.
- **Shared row-mappers.** `parseJson`, `rowToConcept`, `rowToMisconception` are duplicated in
  `repos.ts` and `semanticSearch.ts` — drift risk; extract once.
- **Tests.** Playwright + Testing Library are installed but there are zero tests. The pure functions
  are the cheap, high-value targets: SM-2 math, embedding pack/unpack, export formatting, mastery
  rollup once it exists.
- **`reactStrictMode: false`** in `next.config.js` hides double-render bugs; re-enable when convenient.
- **`CLAUDE.md` / `AGENTS.md` are kept in sync by hand** — fine, just remember to edit both.

---

## 7. Monetization (deferred — needs §3 first)

Carried over from the original vision; gated on real accounts:

- **Free:** limited sessions.
- **Pro:** unlimited goals, exports, memory, search.
- **Expert:** advanced models, long-term memory, custom verticals.

Positioning: *"A Socratic AI tutor that builds your personal knowledge base while you learn."*
