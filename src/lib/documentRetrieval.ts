import { getDb } from './db';
import {
  embedText,
  cosineSimilarity,
  packEmbedding,
  unpackEmbedding,
  OPENAI_EMBEDDING_MODEL,
} from './embeddings';

// ── Chunking ─────────────────────────────────────────────────────────────────
//
// Strategy: accumulate paragraphs (split on blank lines) until the buffer
// reaches TARGET_CHARS, then flush.  Paragraphs longer than MAX_CHARS are
// split further at sentence boundaries so no single chunk overwhelms the
// context window.

const CHUNK_TARGET = 600;  // ideal chunk size in chars (~150 tokens)
const CHUNK_MAX   = 1200;  // hard upper bound per chunk
const CHUNK_MIN   = 80;    // skip fragments shorter than this

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length >= CHUNK_MIN);

  // Pack paragraphs into TARGET-sized buffers
  const raw: string[] = [];
  let buf = '';
  for (const para of paragraphs) {
    if (buf && buf.length + 2 + para.length > CHUNK_TARGET) {
      raw.push(buf);
      buf = para;
    } else {
      buf = buf ? `${buf}\n\n${para}` : para;
    }
  }
  if (buf) raw.push(buf);

  // Split any chunk that still exceeds MAX_CHARS (e.g. a wall-of-text paragraph)
  const chunks: string[] = [];
  for (const chunk of raw) {
    if (chunk.length <= CHUNK_MAX) {
      chunks.push(chunk);
      continue;
    }
    const sentences = chunk.match(/[^.!?]+[.!?]+\s*/g) ?? [chunk];
    let sub = '';
    for (const sent of sentences) {
      if (sub && sub.length + sent.length > CHUNK_MAX) {
        chunks.push(sub.trim());
        sub = sent;
      } else {
        sub += sent;
      }
    }
    if (sub.trim()) chunks.push(sub.trim());
  }

  return chunks.filter(c => c.length >= CHUNK_MIN);
}

// ── Storage ──────────────────────────────────────────────────────────────────

// Called once at upload time.  Each chunk is embedded and stored.
// Failure here is non-fatal — the document text is already saved; the session
// will fall back to flat truncation if no embeddings exist.
export async function embedAndStoreChunks(
  documentId: string,
  goalId: string,
  text: string,
): Promise<void> {
  const chunks = chunkText(text);
  const db = getDb();

  for (const [index, content] of chunks.entries()) {
    const { embedding, model } = await embedText(content);
    db.prepare(`
      INSERT OR REPLACE INTO document_chunk_embeddings
        (id, document_id, goal_id, chunk_index, content, embedding, model)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `${documentId}:${index}`,
      documentId,
      goalId,
      index,
      content,
      packEmbedding(embedding),
      model,
    );
  }
}

// ── Retrieval ────────────────────────────────────────────────────────────────

// Returns the top-`limit` chunks most relevant to `query`, or [] if no
// chunks are stored for this goal.
export async function retrieveRelevantChunks(
  goalId: string,
  query: string,
  limit = 3,
): Promise<string[]> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT content, embedding
    FROM document_chunk_embeddings
    WHERE goal_id = ? AND model = ?
  `).all(goalId, OPENAI_EMBEDDING_MODEL) as { content: string; embedding: Buffer }[];

  if (rows.length === 0) return [];

  const { embedding: qVec } = await embedText(query);

  return rows
    .map(r => ({ content: r.content, score: cosineSimilarity(qVec, unpackEmbedding(r.embedding)) }))
    .filter(r => r.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.content);
}
