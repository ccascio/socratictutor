import crypto from 'crypto';
import { getDb } from './db';
import {
  OPENAI_EMBEDDING_MODEL,
  cosineSimilarity,
  embedText,
  packEmbedding,
  unpackEmbedding,
} from './embeddings';
import { Concept, MasteryStatus, Misconception } from '@/types/learning';

const MAX_EMBEDDINGS_PER_REFRESH = 25;
const SEMANTIC_SCORE_THRESHOLD = 0.55;

export type SemanticSourceType = 'concept' | 'misconception' | 'message' | 'artifact' | 'flashcard';

export interface SemanticDocument {
  sourceType: SemanticSourceType;
  sourceId: string;
  userId: string;
  title: string;
  text: string;
  goalTopic: string;
  href?: string;
  concept?: Concept;
  misconception?: Misconception;
  message?: {
    id: string;
    sessionId: string;
    role: 'tutor' | 'user';
    content: string;
    goalTopic: string;
    startedAt: string;
  };
  artifact?: {
    id: string;
    sessionId: string;
    summary: string;
    goalTopic: string;
  };
  flashcard?: {
    id: string;
    sessionId: string;
    q: string;
    a: string;
    goalTopic: string;
  };
}

export interface SemanticSearchResult extends SemanticDocument {
  score: number;
}

interface SearchEmbeddingRow {
  source_type: SemanticSourceType;
  source_id: string;
  content_hash: string;
  embedding: Buffer;
}

interface ConceptSearchRow {
  id: string;
  user_id: string;
  goal_id: string;
  goal_topic: string;
  name: string;
  simple_definition: string;
  status: MasteryStatus;
  prerequisites: string;
  session_count: number;
  misconception_count: number;
}

interface MisconceptionSearchRow {
  id: string;
  user_id: string;
  concept_id: string | null;
  concept_name: string;
  session_id: string;
  goal_topic: string;
  text: string;
  correction: string;
  status: Misconception['status'];
  detected_at: string;
}

interface MessageSearchRow {
  id: string;
  user_id: string;
  session_id: string;
  role: 'tutor' | 'user';
  content: string;
  started_at: string;
  goal_topic: string;
}

interface ArtifactSearchRow {
  id: string;
  session_id: string;
  user_id: string;
  goal_topic: string;
  summary: string;
  flashcards: string;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function cacheId(userId: string, sourceType: SemanticSourceType, sourceId: string): string {
  return `${userId}:${sourceType}:${sourceId}`;
}

function contentForEmbedding(doc: SemanticDocument): string {
  return [doc.title, doc.goalTopic, doc.text].filter(Boolean).join('\n');
}

function rowToConcept(row: ConceptSearchRow): Concept {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalTopic: row.goal_topic,
    name: row.name,
    simpleDefinition: row.simple_definition,
    status: row.status,
    prerequisites: parseJson<string[]>(row.prerequisites, []),
    sessionCount: row.session_count,
    misconceptionCount: row.misconception_count,
  };
}

function rowToMisconception(row: MisconceptionSearchRow): Misconception {
  return {
    id: row.id,
    conceptId: row.concept_id ?? '',
    conceptName: row.concept_name,
    sessionId: row.session_id,
    goalTopic: row.goal_topic,
    text: row.text,
    correction: row.correction,
    status: row.status,
    detectedAt: row.detected_at.split('T')[0],
  };
}

export function listSemanticDocuments(userId: string): SemanticDocument[] {
  const db = getDb();
  const docs: SemanticDocument[] = [];

  const concepts = db.prepare(`
    SELECT c.*, g.topic AS goal_topic
    FROM concepts c JOIN learning_goals g ON g.id = c.goal_id
    WHERE c.user_id = ?
  `).all(userId) as ConceptSearchRow[];
  for (const row of concepts) {
    const concept = rowToConcept(row);
    docs.push({
      sourceType: 'concept',
      sourceId: concept.id,
      userId,
      title: concept.name,
      text: concept.simpleDefinition,
      goalTopic: concept.goalTopic,
      href: `/concepts/${concept.id}`,
      concept,
    });
  }

  const misconceptions = db.prepare(`
    SELECT * FROM misconceptions WHERE user_id = ?
  `).all(userId) as MisconceptionSearchRow[];
  for (const row of misconceptions) {
    const misconception = rowToMisconception(row);
    docs.push({
      sourceType: 'misconception',
      sourceId: misconception.id,
      userId,
      title: misconception.conceptName,
      text: `${misconception.text}\nCorrection: ${misconception.correction}`,
      goalTopic: misconception.goalTopic,
      href: `/session/${misconception.sessionId}/summary`,
      misconception,
    });
  }

  const messages = db.prepare(`
    SELECT m.id, s.user_id, m.session_id, m.role, m.content, s.started_at, g.topic AS goal_topic
    FROM messages m
    JOIN sessions s ON s.id = m.session_id
    JOIN learning_goals g ON g.id = s.goal_id
    WHERE s.user_id = ? AND m.role IN ('tutor','user')
  `).all(userId) as MessageSearchRow[];
  for (const row of messages) {
    docs.push({
      sourceType: 'message',
      sourceId: row.id,
      userId,
      title: row.role === 'user' ? 'User answer' : 'Tutor prompt',
      text: row.content,
      goalTopic: row.goal_topic,
      href: `/session/${row.session_id}`,
      message: {
        id: row.id,
        sessionId: row.session_id,
        role: row.role,
        content: row.content,
        goalTopic: row.goal_topic,
        startedAt: row.started_at,
      },
    });
  }

  const artifacts = db.prepare(`
    SELECT la.id, la.session_id, s.user_id, la.goal_topic, la.summary, la.flashcards
    FROM learning_artifacts la
    JOIN sessions s ON s.id = la.session_id
    WHERE s.user_id = ?
  `).all(userId) as ArtifactSearchRow[];
  for (const row of artifacts) {
    docs.push({
      sourceType: 'artifact',
      sourceId: row.id,
      userId,
      title: 'Session summary',
      text: row.summary,
      goalTopic: row.goal_topic,
      href: `/session/${row.session_id}/summary`,
      artifact: {
        id: row.id,
        sessionId: row.session_id,
        summary: row.summary,
        goalTopic: row.goal_topic,
      },
    });

    parseJson<Array<{ q: string; a: string }>>(row.flashcards, []).forEach((card, index) => {
      const id = `${row.id}:flashcard:${index}`;
      docs.push({
        sourceType: 'flashcard',
        sourceId: id,
        userId,
        title: card.q,
        text: card.a,
        goalTopic: row.goal_topic,
        href: `/session/${row.session_id}/summary`,
        flashcard: {
          id,
          sessionId: row.session_id,
          q: card.q,
          a: card.a,
          goalTopic: row.goal_topic,
        },
      });
    });
  }

  return docs.filter(doc => contentForEmbedding(doc).trim().length > 0);
}

export async function refreshSemanticEmbeddingCache(userId: string): Promise<{ refreshed: number; total: number }> {
  const db = getDb();
  const docs = listSemanticDocuments(userId);
  const rows = db.prepare(`
    SELECT source_type, source_id, content_hash, embedding
    FROM search_embeddings
    WHERE user_id = ? AND model = ?
  `).all(userId, OPENAI_EMBEDDING_MODEL) as SearchEmbeddingRow[];
  const existing = new Map(rows.map(row => [`${row.source_type}:${row.source_id}`, row]));

  let refreshed = 0;
  for (const doc of docs) {
    const content = contentForEmbedding(doc);
    const contentHash = hashText(content);
    const row = existing.get(`${doc.sourceType}:${doc.sourceId}`);
    if (row?.content_hash === contentHash) continue;
    if (refreshed >= MAX_EMBEDDINGS_PER_REFRESH) break;

    const { embedding, model } = await embedText(content);
    db.prepare(`
      INSERT INTO search_embeddings (id, user_id, source_type, source_id, content_hash, embedding, model, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, source_type, source_id, model)
      DO UPDATE SET content_hash = excluded.content_hash, embedding = excluded.embedding, updated_at = excluded.updated_at
    `).run(
      cacheId(userId, doc.sourceType, doc.sourceId),
      userId,
      doc.sourceType,
      doc.sourceId,
      contentHash,
      packEmbedding(embedding),
      model,
      new Date().toISOString(),
    );
    refreshed += 1;
  }

  return { refreshed, total: docs.length };
}

async function getQueryEmbedding(query: string): Promise<number[]> {
  const db = getDb();
  const queryHash = hashText(query.trim().toLowerCase());
  const cached = db.prepare(`
    SELECT embedding FROM query_embeddings WHERE query_hash = ? AND model = ?
  `).get(queryHash, OPENAI_EMBEDDING_MODEL) as { embedding: Buffer } | undefined;
  if (cached) return unpackEmbedding(cached.embedding);

  const { embedding, model } = await embedText(query);
  db.prepare(`
    INSERT INTO query_embeddings (id, query_hash, embedding, model, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(query_hash, model)
    DO UPDATE SET embedding = excluded.embedding, updated_at = excluded.updated_at
  `).run(`query:${model}:${queryHash}`, queryHash, packEmbedding(embedding), model, new Date().toISOString());
  return embedding;
}

export async function searchSemanticMemory(
  userId: string,
  query: string,
  options: { limit?: number; threshold?: number } = {},
): Promise<{ results: SemanticSearchResult[]; cache: { refreshed: number; total: number } }> {
  const qVec = await getQueryEmbedding(query);
  const cache = await refreshSemanticEmbeddingCache(userId);
  const docs = listSemanticDocuments(userId);
  const docByKey = new Map(docs.map(doc => [`${doc.sourceType}:${doc.sourceId}`, doc]));
  const limit = options.limit ?? 12;
  const threshold = options.threshold ?? SEMANTIC_SCORE_THRESHOLD;

  const rows = getDb().prepare(`
    SELECT source_type, source_id, content_hash, embedding
    FROM search_embeddings
    WHERE user_id = ? AND model = ?
  `).all(userId, OPENAI_EMBEDDING_MODEL) as SearchEmbeddingRow[];

  const results = rows
    .map(row => {
      const doc = docByKey.get(`${row.source_type}:${row.source_id}`);
      if (!doc) return null;
      return { ...doc, score: cosineSimilarity(qVec, unpackEmbedding(row.embedding)) };
    })
    .filter((result): result is SemanticSearchResult => result !== null && result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { results, cache };
}
