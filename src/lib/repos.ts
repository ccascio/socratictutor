import { getDb } from './db';
import { LearningGoal, Session, Concept, Misconception, LearningArtifact, ReviewItem, ChatMessage, MasteryStatus } from '@/types/learning';

export const DEFAULT_USER_ID = 'user-default';

// ── helpers ─────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function nowIso(): string { return new Date().toISOString(); }

function nanoid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── User / Profile ────────────────────────────────────────────────────────────

export function ensureDefaultUser(): void {
  const db = getDb();
  db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).run(
    DEFAULT_USER_ID, 'user@socratic.ai', 'Learner',
  );
  db.prepare(`INSERT OR IGNORE INTO learner_profiles (id, user_id) VALUES (?, ?)`).run(
    'profile-default', DEFAULT_USER_ID,
  );
}

export function getLearnerProfile(userId = DEFAULT_USER_ID): { learningStyle: string } {
  const db = getDb();
  const row = db.prepare(`SELECT learning_style FROM learner_profiles WHERE user_id = ?`).get(userId) as { learning_style: string } | undefined;
  return { learningStyle: row?.learning_style ?? 'intuition-first' };
}

export function updateLearnerProfile(userId = DEFAULT_USER_ID, data: { learningStyle?: string }): void {
  const db = getDb();
  if (data.learningStyle) {
    db.prepare(`UPDATE learner_profiles SET learning_style = ?, updated_at = ? WHERE user_id = ?`)
      .run(data.learningStyle, nowIso(), userId);
  }
}

// ── Learning Goals ────────────────────────────────────────────────────────────

export interface GoalRow {
  id: string; topic: string; description: string; current_level: string;
  target_depth: string; motivation: string; status: string;
  mastery_percent: number; created_at: string; last_session_at: string | null;
  session_count: number; weak_concept_count: number;
}

function rowToGoal(row: GoalRow): LearningGoal {
  return {
    id: row.id, topic: row.topic, description: row.description,
    currentLevel: row.current_level as LearningGoal['currentLevel'],
    targetDepth: row.target_depth as LearningGoal['targetDepth'],
    motivation: row.motivation, status: row.status as LearningGoal['status'],
    masteryPercent: row.mastery_percent, createdAt: row.created_at,
    lastSessionAt: row.last_session_at ?? undefined,
    sessionCount: row.session_count, weakConceptCount: row.weak_concept_count,
  };
}

export function listGoals(userId = DEFAULT_USER_ID): LearningGoal[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM sessions s WHERE s.goal_id = g.id) AS session_count,
      (SELECT COUNT(*) FROM concepts c WHERE c.goal_id = g.id AND c.status = 'weak') AS weak_concept_count
    FROM learning_goals g
    WHERE g.user_id = ? AND g.status != 'completed'
    ORDER BY g.last_session_at DESC NULLS LAST, g.created_at DESC
  `).all(userId) as GoalRow[];
  return rows.map(rowToGoal);
}

export function getGoal(id: string): LearningGoal | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM sessions s WHERE s.goal_id = g.id) AS session_count,
      (SELECT COUNT(*) FROM concepts c WHERE c.goal_id = g.id AND c.status = 'weak') AS weak_concept_count
    FROM learning_goals g WHERE g.id = ?
  `).get(id) as GoalRow | undefined;
  return row ? rowToGoal(row) : null;
}

export function createGoal(
  userId: string,
  data: { topic: string; description: string; currentLevel: string; targetDepth: string; motivation: string },
): LearningGoal {
  const db = getDb();
  const id = `goal-${nanoid()}`;
  db.prepare(`
    INSERT INTO learning_goals (id, user_id, topic, description, current_level, target_depth, motivation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, data.topic, data.description, data.currentLevel, data.targetDepth, data.motivation);
  return getGoal(id)!;
}

export function updateGoalMastery(goalId: string, masteryPercent: number): void {
  getDb().prepare(`UPDATE learning_goals SET mastery_percent = ? WHERE id = ?`).run(masteryPercent, goalId);
}

// Relative weight of each mastery status when rolling concepts up into a goal's mastery %.
const MASTERY_WEIGHT: Record<MasteryStatus, number> = {
  unknown: 0,
  weak: 0.2,
  improving: 0.5,
  strong: 0.85,
  mastered: 1,
};

// Integer rank used to enforce "never downgrade" on upsert.
const MASTERY_RANK: Record<MasteryStatus, number> = {
  unknown: 0,
  weak: 1,
  improving: 2,
  strong: 3,
  mastered: 4,
};

// Recompute a goal's mastery % as the weighted average of its concepts' statuses.
// Returns the new value. If the goal has no concepts yet, leaves the stored value untouched
// (so a freshly created or seeded goal is not wiped to 0 before any learning happens).
export function recomputeGoalMastery(goalId: string): number {
  const db = getDb();
  const rows = db.prepare(
    `SELECT status, COUNT(*) AS n FROM concepts WHERE goal_id = ? GROUP BY status`,
  ).all(goalId) as { status: string; n: number }[];

  let weighted = 0;
  let total = 0;
  for (const row of rows) {
    weighted += (MASTERY_WEIGHT[row.status as MasteryStatus] ?? 0) * row.n;
    total += row.n;
  }

  if (total === 0) {
    const current = db.prepare(`SELECT mastery_percent AS m FROM learning_goals WHERE id = ?`).get(goalId) as { m: number } | undefined;
    return current?.m ?? 0;
  }

  const percent = Math.round((weighted / total) * 100);
  updateGoalMastery(goalId, percent);
  return percent;
}

export function archiveGoal(goalId: string): boolean {
  const result = getDb().prepare(`UPDATE learning_goals SET status = 'completed' WHERE id = ?`).run(goalId);
  return result.changes > 0;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

interface SessionRow {
  id: string; goal_id: string; topic: string; started_at: string;
  ended_at: string | null; duration_minutes: number; turn_count: number;
  artifact_id: string | null; goal_topic?: string; misconception_count?: number;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id, goalId: row.goal_id,
    topic: row.topic || row.goal_topic || '',
    startedAt: row.started_at, durationMinutes: row.duration_minutes,
    conceptCount: 0, misconceptionCount: row.misconception_count ?? 0,
  };
}

export function listRecentSessions(userId = DEFAULT_USER_ID, limit = 10): Session[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.*, g.topic AS goal_topic,
      (SELECT COUNT(*) FROM misconceptions m WHERE m.session_id = s.id) AS misconception_count
    FROM sessions s
    JOIN learning_goals g ON g.id = s.goal_id
    WHERE s.user_id = ?
    ORDER BY s.started_at DESC
    LIMIT ?
  `).all(userId, limit) as SessionRow[];
  return rows.map(rowToSession);
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT s.*, g.topic AS goal_topic,
      (SELECT COUNT(*) FROM misconceptions m WHERE m.session_id = s.id) AS misconception_count
    FROM sessions s JOIN learning_goals g ON g.id = s.goal_id
    WHERE s.id = ?
  `).get(id) as SessionRow | undefined;
  return row ? rowToSession(row) : null;
}

export function createSession(userId: string, goalId: string, topic?: string): string {
  const id = `session-${nanoid()}`;
  const goal = getGoal(goalId);
  const sessionTopic = topic || goal?.topic || '';
  getDb().prepare(`
    INSERT INTO sessions (id, goal_id, user_id, topic) VALUES (?, ?, ?, ?)
  `).run(id, goalId, userId, sessionTopic);
  getDb().prepare(`UPDATE learning_goals SET last_session_at = ? WHERE id = ?`).run(nowIso(), goalId);
  return id;
}

export function endSession(sessionId: string): void {
  const db = getDb();
  const started = (db.prepare(`SELECT started_at FROM sessions WHERE id = ?`).get(sessionId) as { started_at: string } | undefined)?.started_at;
  const minutes = started ? Math.round((Date.now() - new Date(started).getTime()) / 60000) : 0;
  const turns = (db.prepare(`SELECT COUNT(*) AS cnt FROM messages WHERE session_id = ?`).get(sessionId) as { cnt: number }).cnt;
  db.prepare(`UPDATE sessions SET ended_at = ?, duration_minutes = ?, turn_count = ? WHERE id = ?`)
    .run(nowIso(), minutes, turns, sessionId);
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function getMessages(sessionId: string): ChatMessage[] {
  const rows = getDb().prepare(`
    SELECT role, content FROM messages WHERE session_id = ? ORDER BY turn_index
  `).all(sessionId) as { role: string; content: string }[];
  return rows.map(r => ({ role: r.role as ChatMessage['role'], content: r.content }));
}

export function appendMessage(sessionId: string, role: 'tutor' | 'user', content: string): string {
  const db = getDb();
  const id = `msg-${nanoid()}`;
  const { maxTurn } = db.prepare(`SELECT COALESCE(MAX(turn_index), -1) AS maxTurn FROM messages WHERE session_id = ?`).get(sessionId) as { maxTurn: number };
  db.prepare(`INSERT INTO messages (id, session_id, role, content, turn_index) VALUES (?, ?, ?, ?, ?)`).run(id, sessionId, role, content, maxTurn + 1);
  return id;
}

// ── Concepts ─────────────────────────────────────────────────────────────────

interface ConceptRow {
  id: string; goal_id: string; goal_topic: string; name: string;
  simple_definition: string; status: string; prerequisites: string;
  session_count: number; misconception_count: number;
}

function rowToConcept(row: ConceptRow): Concept {
  return {
    id: row.id, goalId: row.goal_id, goalTopic: row.goal_topic,
    name: row.name, simpleDefinition: row.simple_definition,
    status: row.status as Concept['status'],
    prerequisites: parseJson<string[]>(row.prerequisites, []),
    sessionCount: row.session_count, misconceptionCount: row.misconception_count,
  };
}

const MASTERY_ORDER_SQL = `CASE c.status WHEN 'mastered' THEN 0 WHEN 'strong' THEN 1 WHEN 'improving' THEN 2 WHEN 'weak' THEN 3 ELSE 4 END`;

export function listConcepts(userId = DEFAULT_USER_ID): Concept[] {
  const rows = getDb().prepare(`
    SELECT c.*, g.topic AS goal_topic
    FROM concepts c JOIN learning_goals g ON g.id = c.goal_id
    WHERE c.user_id = ?
    ORDER BY ${MASTERY_ORDER_SQL}, c.name
  `).all(userId) as ConceptRow[];
  return rows.map(rowToConcept);
}

export function getConceptById(id: string): Concept | null {
  const row = getDb().prepare(`
    SELECT c.*, g.topic AS goal_topic
    FROM concepts c JOIN learning_goals g ON g.id = c.goal_id
    WHERE c.id = ?
  `).get(id) as ConceptRow | undefined;
  return row ? rowToConcept(row) : null;
}

export interface ConceptDetail {
  concept: Concept;
  misconceptions: Misconception[];
  sessions: { id: string; startedAt: string; durationMinutes: number; summary: string }[];
  relatedConcepts: Concept[];
  flashcards: { q: string; a: string }[];
}

export function getConceptDetail(id: string): ConceptDetail | null {
  const db = getDb();
  const concept = getConceptById(id);
  if (!concept) return null;

  const miscRows = db.prepare(`
    SELECT * FROM misconceptions
    WHERE concept_name = ? AND goal_topic = ?
    ORDER BY detected_at DESC
  `).all(concept.name, concept.goalTopic) as MisconceptionRow[];

  const sessionRows = db.prepare(`
    SELECT s.id, s.started_at, s.duration_minutes, la.summary
    FROM sessions s
    JOIN learning_artifacts la ON la.session_id = s.id
    WHERE s.goal_id = ? AND (
      EXISTS (SELECT 1 FROM json_each(la.mastered) WHERE value = ?)
      OR EXISTS (SELECT 1 FROM json_each(la.weak) WHERE value = ?)
    )
    ORDER BY s.started_at DESC
  `).all(concept.goalId, concept.name, concept.name) as { id: string; started_at: string; duration_minutes: number; summary: string }[];

  const relatedRows = db.prepare(`
    SELECT c.*, g.topic AS goal_topic
    FROM concepts c JOIN learning_goals g ON g.id = c.goal_id
    WHERE c.goal_id = ? AND c.id != ?
    ORDER BY ${MASTERY_ORDER_SQL}, c.name
  `).all(concept.goalId, id) as ConceptRow[];

  const artifactFlashcardRows = db.prepare(`
    SELECT la.flashcards
    FROM learning_artifacts la
    JOIN sessions s ON s.id = la.session_id
    WHERE s.goal_id = ?
  `).all(concept.goalId) as { flashcards: string }[];

  const nameLC = concept.name.toLowerCase();
  const flashcards: { q: string; a: string }[] = [];
  for (const row of artifactFlashcardRows) {
    for (const card of parseJson<{ q: string; a: string }[]>(row.flashcards, [])) {
      if (card.q.toLowerCase().includes(nameLC) || card.a.toLowerCase().includes(nameLC)) {
        flashcards.push(card);
      }
    }
  }

  return {
    concept,
    misconceptions: miscRows.map(rowToMisconception),
    sessions: sessionRows.map(r => ({ id: r.id, startedAt: r.started_at, durationMinutes: r.duration_minutes, summary: r.summary })),
    relatedConcepts: relatedRows.map(rowToConcept),
    flashcards,
  };
}

export function upsertConcept(
  userId: string, goalId: string,
  data: { name: string; simpleDefinition?: string; status?: Concept['status'] },
): void {
  const db = getDb();
  const existing = db.prepare(
    `SELECT id, status, simple_definition FROM concepts WHERE user_id = ? AND goal_id = ? AND name = ?`,
  ).get(userId, goalId, data.name) as { id: string; status: string; simple_definition: string } | undefined;

  if (existing) {
    // Only upgrade status — never downgrade a concept the learner has already demonstrated.
    const currentRank = MASTERY_RANK[existing.status as MasteryStatus] ?? 0;
    const incomingRank = data.status !== undefined ? (MASTERY_RANK[data.status] ?? 0) : -1;
    const newStatus = incomingRank > currentRank ? data.status! : existing.status;
    // Fill in the definition the first time we receive a non-empty one.
    const newDef = (data.simpleDefinition && !existing.simple_definition)
      ? data.simpleDefinition
      : existing.simple_definition;
    db.prepare(
      `UPDATE concepts SET status = ?, simple_definition = ?, session_count = session_count + 1 WHERE id = ?`,
    ).run(newStatus, newDef, existing.id);
  } else {
    db.prepare(
      `INSERT INTO concepts (id, user_id, goal_id, name, simple_definition, status, session_count) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ).run(`concept-${nanoid()}`, userId, goalId, data.name, data.simpleDefinition ?? '', data.status ?? 'unknown');
  }
}

// ── Misconceptions ────────────────────────────────────────────────────────────

interface MisconceptionRow {
  id: string; concept_id: string | null; concept_name: string; session_id: string;
  goal_topic: string; text: string; correction: string; status: string; detected_at: string;
}

function rowToMisconception(row: MisconceptionRow): Misconception {
  return {
    id: row.id, conceptId: row.concept_id ?? '', conceptName: row.concept_name,
    sessionId: row.session_id, goalTopic: row.goal_topic,
    text: row.text, correction: row.correction,
    status: row.status as Misconception['status'], detectedAt: row.detected_at.split('T')[0],
  };
}

export function listMisconceptions(userId = DEFAULT_USER_ID): Misconception[] {
  const rows = getDb().prepare(`SELECT * FROM misconceptions WHERE user_id = ? ORDER BY detected_at DESC`).all(userId) as MisconceptionRow[];
  return rows.map(rowToMisconception);
}

export function createMisconception(
  userId: string, sessionId: string, goalId: string, goalTopic: string,
  data: { conceptName: string; text: string; correction: string },
): Misconception {
  const db = getDb();
  const id = `misc-${nanoid()}`;

  // Link to the concept within THIS goal (if it exists) so the count and FK stay goal-scoped.
  const concept = db.prepare(
    `SELECT id FROM concepts WHERE user_id = ? AND goal_id = ? AND name = ?`,
  ).get(userId, goalId, data.conceptName) as { id: string } | undefined;

  db.prepare(`
    INSERT INTO misconceptions (id, user_id, concept_id, concept_name, session_id, goal_topic, text, correction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, concept?.id ?? null, data.conceptName, sessionId, goalTopic, data.text, data.correction);

  if (concept) {
    db.prepare(`UPDATE concepts SET misconception_count = misconception_count + 1 WHERE id = ?`).run(concept.id);
  }

  return rowToMisconception(db.prepare(`SELECT * FROM misconceptions WHERE id = ?`).get(id) as MisconceptionRow);
}

// ── Artifacts ────────────────────────────────────────────────────────────────

interface ArtifactRow {
  id: string; session_id: string; goal_topic: string; summary: string;
  mastered: string; weak: string; next_questions: string;
  flashcards: string; suggested_next: string; generated_at: string;
}

function rowToArtifact(row: ArtifactRow): LearningArtifact {
  return {
    id: row.id, sessionId: row.session_id, goalTopic: row.goal_topic,
    summary: row.summary,
    mastered: parseJson<string[]>(row.mastered, []),
    weak: parseJson<string[]>(row.weak, []),
    nextQuestions: parseJson<string[]>(row.next_questions, []),
    flashcards: parseJson<LearningArtifact['flashcards']>(row.flashcards, []),
    suggestedNext: row.suggested_next,
  };
}

export function getArtifact(sessionId: string): LearningArtifact | null {
  const row = getDb().prepare(`SELECT * FROM learning_artifacts WHERE session_id = ?`).get(sessionId) as ArtifactRow | undefined;
  return row ? rowToArtifact(row) : null;
}

export function saveArtifact(sessionId: string, goalTopic: string, data: Omit<LearningArtifact, 'id' | 'sessionId' | 'goalTopic'>): LearningArtifact {
  // Deterministic id so re-ending a session replaces the artifact rather than appending a new one.
  const id = `artifact-${sessionId}`;
  getDb().prepare(`
    INSERT OR REPLACE INTO learning_artifacts
      (id, session_id, goal_topic, summary, mastered, weak, next_questions, flashcards, suggested_next)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, sessionId, goalTopic, data.summary,
    JSON.stringify(data.mastered), JSON.stringify(data.weak),
    JSON.stringify(data.nextQuestions), JSON.stringify(data.flashcards),
    data.suggestedNext,
  );
  getDb().prepare(`UPDATE sessions SET artifact_id = ? WHERE id = ?`).run(id, sessionId);
  return getArtifact(sessionId)!;
}

// ── Source Documents ─────────────────────────────────────────────────────────

interface SourceDocRow {
  id: string; goal_id: string; filename: string;
  content_text: string; size_bytes: number; uploaded_at: string;
}

export interface SourceDocument {
  id: string;
  goalId: string;
  filename: string;
  contentText: string;
  sizeBytes: number;
  uploadedAt: string;
}

function rowToSourceDoc(row: SourceDocRow): SourceDocument {
  return {
    id: row.id, goalId: row.goal_id, filename: row.filename,
    contentText: row.content_text, sizeBytes: row.size_bytes, uploadedAt: row.uploaded_at,
  };
}

export function saveSourceDocument(
  goalId: string,
  data: { filename: string; contentText: string; sizeBytes: number },
): SourceDocument {
  const db = getDb();
  const id = `doc-${nanoid()}`;
  db.prepare(
    `INSERT INTO source_documents (id, goal_id, filename, content_text, size_bytes) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, goalId, data.filename, data.contentText, data.sizeBytes);
  return rowToSourceDoc(db.prepare(`SELECT * FROM source_documents WHERE id = ?`).get(id) as SourceDocRow);
}

export function listSourceDocuments(goalId: string): SourceDocument[] {
  const rows = getDb().prepare(
    `SELECT * FROM source_documents WHERE goal_id = ? ORDER BY uploaded_at ASC`,
  ).all(goalId) as SourceDocRow[];
  return rows.map(rowToSourceDoc);
}

// ── Review Items ──────────────────────────────────────────────────────────────

interface ReviewRow {
  id: string; source_type: string; source_id: string; label: string;
  goal_topic: string; due_at: string; interval_days: number; ease_factor: number;
}

export function listReviewItems(userId = DEFAULT_USER_ID): ReviewItem[] {
  const today = new Date().toISOString().split('T')[0];
  const rows = getDb().prepare(`
    SELECT * FROM review_items WHERE user_id = ? AND due_at <= ? ORDER BY due_at
  `).all(userId, today + 'T23:59:59Z') as ReviewRow[];
  return rows.map(r => ({
    id: r.id, sourceType: r.source_type as ReviewItem['sourceType'],
    label: r.label, goalTopic: r.goal_topic,
    dueAt: r.due_at, overdue: r.due_at < new Date().toISOString(),
  }));
}

export function scheduleReview(userId: string, data: { sourceType: ReviewItem['sourceType']; sourceId: string; label: string; goalTopic: string; daysFromNow?: number }): void {
  // Deterministic id from the natural key — INSERT OR IGNORE then correctly skips duplicates.
  const id = `review:${userId}:${data.sourceType}:${data.sourceId}`;
  const due = new Date(Date.now() + (data.daysFromNow ?? 1) * 86400000).toISOString();
  getDb().prepare(`
    INSERT OR IGNORE INTO review_items (id, user_id, source_type, source_id, label, goal_topic, due_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, data.sourceType, data.sourceId, data.label, data.goalTopic, due);
}

// ── SM-2 review update ────────────────────────────────────────────────────────

export function updateReviewItem(id: string, quality: 0 | 1 | 2 | 3 | 4 | 5): boolean {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM review_items WHERE id = ?`).get(id) as ReviewRow | undefined;
  if (!row) return false;

  // SM-2 algorithm
  let ef = row.ease_factor;
  ef = Math.max(1.3, ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const nextInterval = quality < 3 ? 1 : Math.round(row.interval_days * ef);
  const due = new Date(Date.now() + nextInterval * 86400000).toISOString();

  db.prepare(`UPDATE review_items SET ease_factor = ?, interval_days = ?, due_at = ?, last_reviewed = ? WHERE id = ?`)
    .run(ef, nextInterval, due, nowIso(), id);
  return true;
}
