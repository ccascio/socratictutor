import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { embedText, cosineSimilarity, packEmbedding, unpackEmbedding } from '@/lib/embeddings';
import { listConcepts, listMisconceptions, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<NextResponse> {
  seedDemoData();
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ concepts: [], misconceptions: [], messages: [] });

  // Keyword fallback always works without embeddings
  const concepts = listConcepts(DEFAULT_USER_ID).filter(
    c => c.name.toLowerCase().includes(q.toLowerCase()) || c.simpleDefinition.toLowerCase().includes(q.toLowerCase()),
  );
  const misconceptions = listMisconceptions(DEFAULT_USER_ID).filter(
    m => m.text.toLowerCase().includes(q.toLowerCase()) || m.conceptName.toLowerCase().includes(q.toLowerCase()),
  );

  // Semantic search over stored embeddings if any exist
  let semanticConcepts: typeof concepts = [];
  try {
    const { embedding: qVec } = await embedText(q);
    const db = getDb();

    // Embed and cache query, then score stored concept embeddings
    const rows = db.prepare(`SELECT ce.concept_id, ce.embedding, c.name, c.goal_id, c.simple_definition, c.status, g.topic AS goal_topic
      FROM concept_embeddings ce
      JOIN concepts c ON c.id = ce.concept_id
      JOIN learning_goals g ON g.id = c.goal_id
      WHERE c.user_id = ?`).all(DEFAULT_USER_ID) as Array<{ concept_id: string; embedding: Buffer; name: string; goal_id: string; simple_definition: string; status: string; goal_topic: string }>;

    if (rows.length > 0) {
      const scored = rows.map(r => ({
        ...r,
        score: cosineSimilarity(qVec, unpackEmbedding(r.embedding)),
      })).sort((a, b) => b.score - a.score).slice(0, 5);

      semanticConcepts = scored.filter(s => s.score > 0.6).map(s => ({
        id: s.concept_id, goalId: s.goal_id, goalTopic: s.goal_topic,
        name: s.name, simpleDefinition: s.simple_definition,
        status: s.status as 'unknown' | 'weak' | 'improving' | 'strong' | 'mastered',
        prerequisites: [], sessionCount: 0, misconceptionCount: 0,
      }));
    }
  } catch {
    // Embeddings unavailable — keyword results are still returned
  }

  // Merge semantic + keyword, deduplicate
  const allConcepts = [...semanticConcepts, ...concepts.filter(c => !semanticConcepts.find(sc => sc.id === c.id))];

  return NextResponse.json({ concepts: allConcepts, misconceptions });
}
