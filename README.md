# SocraticTutor

> An AI-powered desktop tutor that teaches through questions, not answers.

Most AI education tools replicate a chat interface. SocraticTutor takes a different approach: the conversation is temporary, but the knowledge is permanent. Every session builds a structured learning model — tracked concepts, detected misconceptions, spaced repetition reviews, and a cognitive profile that shows not just *what* you know, but *how* you learn.

---

## Download for macOS

| Platform | Link |
|----------|------|
| macOS (Apple Silicon) | [SocraticTutor_0.1.0_aarch64.dmg](https://github.com/ccascio/socratictutor/releases/latest/download/SocraticTutor_0.1.0_aarch64.dmg) |
| macOS (Intel) | [SocraticTutor_0.1.0_x64.dmg](https://github.com/ccascio/socratictutor/releases/latest/download/SocraticTutor_0.1.0_x64.dmg) |

Open the DMG, drag **SocraticTutor** to Applications, and launch. On first run you will be prompted to enter your OpenAI API key in **Preferences**.

---

## Features

**Socratic Sessions** — The tutor never gives direct answers. Instead, it asks targeted questions to surface gaps, correct misconceptions in real time, and guide you to understanding on your own terms.

**Concept Library** — Every concept discussed across all sessions is catalogued with mastery scores, misconceptions, explanations, and related topics. It becomes your personal knowledge base.

**Spaced Repetition** — Concepts and flashcards surface automatically for review based on the SM-2 algorithm, prioritising what you're about to forget.

**Session Artifacts** — At the end of each session, the app generates a summary, flashcards, a quiz, and a suggested next topic — all exportable as Markdown, Anki, JSON, or PDF.

**"How You Think" Profile** — A cognitive dashboard that infers your learning strengths, weaknesses, common mistake patterns, and preferred reasoning style by analysing your full learning history.

**Fully local** — All data stays on your machine. SQLite database, no accounts, no cloud sync.

---

## Getting started (development)

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Run locally

```bash
git clone https://github.com/ccascio/socratictutor.git
cd socratictutor
npm install
cp .env.example .env          # add your OPENAI_API_KEY
npm run dev                   # http://localhost:3000
```

The SQLite database is created automatically at `data/socratic.sqlite` on first run.

### Build the macOS desktop app

```bash
bash scripts/build-desktop.sh     # builds unsigned .app
npm run release:macos             # signed + notarized DMG (requires Apple Developer account)
```

See [`scripts/build-desktop.sh`](scripts/build-desktop.sh) and [`scripts/release-macos.sh`](scripts/release-macos.sh) for details.

---

## Tech stack

- **Frontend / server** — Next.js 14 (App Router), Chakra UI
- **AI** — OpenAI `gpt-4o-mini` via Vercel AI SDK, `text-embedding-3-small` for semantic search
- **Database** — SQLite via `better-sqlite3`
- **Desktop shell** — Tauri 2 + Node.js sidecar (Next.js standalone server)

---

## Contributing

Issues and pull requests are welcome. Please open an issue first for anything beyond small fixes.

---

## License

MIT
