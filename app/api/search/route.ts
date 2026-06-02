import { NextResponse } from 'next/server';
import { listConcepts, listMisconceptions, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';
import { searchSemanticMemory, SemanticSearchResult } from '@/lib/semanticSearch';
import { Concept, Misconception } from '@/types/learning';

export const runtime = 'nodejs';

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function compactResult(result: SemanticSearchResult): {
  sourceType: SemanticSearchResult['sourceType'];
  sourceId: string;
  title: string;
  text: string;
  goalTopic: string;
  href?: string;
  score: number;
} {
  return {
    sourceType: result.sourceType,
    sourceId: result.sourceId,
    title: result.title,
    text: result.text,
    goalTopic: result.goalTopic,
    href: result.href,
    score: Number(result.score.toFixed(4)),
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  seedDemoData();
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({
      concepts: [],
      misconceptions: [],
      messages: [],
      artifacts: [],
      flashcards: [],
      results: [],
      embeddingCache: { available: false, refreshed: 0, total: 0 },
    });
  }

  // Keyword fallback always works without embeddings
  const concepts = listConcepts(DEFAULT_USER_ID).filter(
    c => c.name.toLowerCase().includes(q.toLowerCase())
      || c.simpleDefinition.toLowerCase().includes(q.toLowerCase())
      || c.goalTopic.toLowerCase().includes(q.toLowerCase()),
  );
  const misconceptions = listMisconceptions(DEFAULT_USER_ID).filter(
    m => m.text.toLowerCase().includes(q.toLowerCase())
      || m.correction.toLowerCase().includes(q.toLowerCase())
      || m.conceptName.toLowerCase().includes(q.toLowerCase())
      || m.goalTopic.toLowerCase().includes(q.toLowerCase()),
  );

  let semanticResults: SemanticSearchResult[] = [];
  let embeddingCache = { available: false, refreshed: 0, total: 0 };
  try {
    const semantic = await searchSemanticMemory(DEFAULT_USER_ID, q);
    semanticResults = semantic.results;
    embeddingCache = { available: true, ...semantic.cache };
  } catch {
    // Embeddings unavailable — keyword results are still returned
  }

  const semanticConcepts = semanticResults
    .filter((result): result is SemanticSearchResult & { concept: Concept } => result.sourceType === 'concept' && Boolean(result.concept))
    .map(result => result.concept);
  const semanticMisconceptions = semanticResults
    .filter((result): result is SemanticSearchResult & { misconception: Misconception } => result.sourceType === 'misconception' && Boolean(result.misconception))
    .map(result => result.misconception);
  const messages = semanticResults
    .filter(result => result.sourceType === 'message' && result.message)
    .map(result => ({ ...result.message!, score: Number(result.score.toFixed(4)), href: result.href }));
  const artifacts = semanticResults
    .filter(result => result.sourceType === 'artifact' && result.artifact)
    .map(result => ({ ...result.artifact!, score: Number(result.score.toFixed(4)), href: result.href }));
  const flashcards = semanticResults
    .filter(result => result.sourceType === 'flashcard' && result.flashcard)
    .map(result => ({ ...result.flashcard!, score: Number(result.score.toFixed(4)), href: result.href }));

  const allConcepts = dedupeById([...semanticConcepts, ...concepts]);
  const allMisconceptions = dedupeById([...semanticMisconceptions, ...misconceptions]);

  return NextResponse.json({
    concepts: allConcepts,
    misconceptions: allMisconceptions,
    messages,
    artifacts,
    flashcards,
    results: semanticResults.map(compactResult),
    embeddingCache,
  });
}
