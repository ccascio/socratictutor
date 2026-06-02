// Ported from BFrost/src/embeddings.ts — provider-agnostic (OpenAI or Ollama-compatible)

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
}

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

function parseResponse(data: unknown): number[] {
  const v = data as { data?: Array<{ embedding?: unknown }>; embedding?: unknown };
  if (Array.isArray(v.data) && Array.isArray(v.data[0]?.embedding)) return v.data[0].embedding.map(Number);
  if (Array.isArray(v.embedding)) return (v.embedding as unknown[]).map(Number);
  throw new Error('Embedding endpoint returned unsupported shape.');
}

export async function embedText(text: string): Promise<EmbeddingResult> {
  const input = text.trim();
  if (!input) throw new Error('Cannot embed empty text.');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured.');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Embedding failed (${res.status}): ${msg}`);
  }

  const embedding = parseResponse(await res.json());
  return { embedding, dimensions: embedding.length, model: OPENAI_EMBEDDING_MODEL };
}

// Brute-force cosine similarity — fine at this scale with SQLite
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// Pack/unpack float32 array to/from Buffer for SQLite BLOB storage
export function packEmbedding(v: number[]): Buffer {
  const buf = Buffer.allocUnsafe(v.length * 4);
  v.forEach((x, i) => buf.writeFloatLE(x, i * 4));
  return buf;
}

export function unpackEmbedding(buf: Buffer): number[] {
  const out: number[] = [];
  for (let i = 0; i < buf.length; i += 4) out.push(buf.readFloatLE(i));
  return out;
}
