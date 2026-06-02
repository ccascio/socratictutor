# Data Model Draft

Entity-level model. Not SQL — the relationships and fields matter more right now than syntax.

---

## Core Entities

### User
```
id
email
name
created_at
learner_profile_id  → LearnerProfile (1:1)
```

### LearnerProfile
The moat. This is what makes the tutor smarter over time.
```
id
user_id
depth_level          enum: beginner | intermediate | advanced
learning_style       enum: intuition-first | math-ok | analogy-heavy | example-driven
preferred_analogies  string[]   (e.g. ["systems engineering", "economics"])
review_schedule      ReviewItem[]
updated_at
```

### LearningGoal
One per topic the user wants to master.
```
id
user_id
topic               string  (e.g. "Attention in Transformers")
description         string  (user's stated goal)
current_level       enum: unknown | beginner | intermediate | advanced
target_depth        enum: conceptual | applied | deep
motivation          string  (why they're learning it)
status              enum: active | paused | completed
created_at
```

### Session
One learning session under a goal.
```
id
goal_id
user_id
started_at
ended_at
duration_minutes    int
turn_count          int
artifact_id         → LearningArtifact (1:1, nullable until generated)
```

### Message
Raw conversation turns within a session.
```
id
session_id
role                enum: tutor | user | system
content             string
turn_index          int
question_id         → Question (nullable — set if this turn is a tutor question)
answer_id           → Answer   (nullable — set if this turn is a user answer)
created_at
```

### Question
A tutor question within a session. First-class because the product's learning loop runs on question→answer pairs, and each question carries diagnostic metadata that can't be derived from the raw message.
```
id
session_id
message_id          → Message
text                string
gap_targeted        string      (e.g. "QKV mechanism internals")
question_type       enum: diagnostic | socratic | verification | misconception-probe
turn_index          int
created_at
```

### Answer
A user response to a tutor question. First-class because misconception detection, confidence scoring, and concept extraction all operate on individual answers, not on the full message stream.
```
id
session_id
question_id         → Question
message_id          → Message
text                string
confidence_score    float       (0–1, assigned by Answer Evaluator LLM)
gap_detected        string      (nullable — gap identified from this answer)
misconception_id    → Misconception (nullable — set if misconception detected)
created_at
```

### Concept
A knowledge unit extracted from sessions. Shared across a user's sessions on the same topic.
```
id
user_id
goal_id
name                string  (e.g. "Query/Key/Value vectors")
simple_definition   string
status              enum: unknown | weak | improving | strong | mastered
prerequisites       concept_id[]
related             concept_id[]
first_seen_session  session_id
last_reviewed       timestamp
user_notes          string
```

### Misconception
Tracked independently because they require explicit resolution.
```
id
user_id
concept_id
session_id          (where first detected)
text                string  (what the user believed)
correction          string  (the accurate version)
status              enum: unresolved | acknowledged | resolved
detected_at
resolved_at
```

### LearningArtifact
Structured output generated at end of session. The primary value delivery.
```
id
session_id
summary             string
concepts            string[]   (concept names extracted)
mastered            string[]
weak                string[]
next_questions      string[]
flashcards          { q: string, a: string }[]
quiz_questions      { question: string, options: string[], answer: string }[]
suggested_next      string     (recommended next session topic)
raw_json            jsonb      (full artifact for export)
generated_at
```

### ReviewItem
Drives spaced repetition (Phase 6). Created from misconceptions and weak concepts.
```
id
user_id
source_type         enum: misconception | concept | flashcard
source_id
due_at
interval_days       int
ease_factor         float
last_reviewed
```

### ExportJob
Tracks async export requests (Phase 7).
```
id
user_id
format              enum: markdown | anki_csv | json | pdf | obsidian
status              enum: pending | complete | failed
artifact_ids        learning_artifact_id[]
download_url
created_at
```

---

## Key Relationships

```
User
 ├── LearnerProfile (1:1)
 ├── LearningGoal[] (1:many)
 │    └── Session[] (1:many)
 │         ├── Message[] (1:many)
 │         │    ├── Question (1:1, when role=tutor)
 │         │    └── Answer   (1:1, when role=user)
 │         │         └── Misconception (0:1)
 │         └── LearningArtifact (1:1)
 ├── Concept[] (1:many, scoped per topic/goal)
 ├── Misconception[] (1:many)
 └── ReviewItem[] (1:many)
```

---

## Design Decisions

**Store structured objects alongside chat.** `Message` is the raw log; `Question`, `Answer`, `Concept`, `Misconception`, and `LearningArtifact` are the structured layer. Never derive these from message history at query time. `Question` and `Answer` are explicit first-class entities (not just message rows) because the learning loop operates on individual question→answer pairs: each question carries its gap target and type; each answer carries its confidence score and linked misconception. Folding them into `Message` would make diagnostic queries — "which questions exposed this misconception?" — require scanning unstructured content.

**Concepts are per-user, not global.** A user's understanding of "attention" is different from a vocabulary entry for "attention." The `status` and `user_notes` fields are personal.

**Misconceptions are first-class, not tags.** They have their own lifecycle (unresolved → acknowledged → resolved) and drive review scheduling.

**LearnerProfile is updated after every session,** not just on explicit user action. The tutor reads it at session start to calibrate depth, analogy style, and which misconceptions to probe.

---

## Phase 2 additions (not needed for Phase 1 frontend)

- PostgreSQL with pgvector extension
- Embeddings on `Message.content`, `Concept.simple_definition`, `Misconception.text` for semantic search (Phase 5)
- Full-text search index on `LearningArtifact.summary`
