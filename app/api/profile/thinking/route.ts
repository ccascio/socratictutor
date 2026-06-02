import { NextResponse } from 'next/server';
import { listGoals, listConcepts, listMisconceptions, listRecentSessions, DEFAULT_USER_ID } from '@/lib/repos';
import { generateThinkingProfile } from '@/lib/thinkingProfiler';
import { seedDemoData } from '@/lib/seed';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  seedDemoData();

  // Gate: require at least one learning artifact before spending an LLM call
  const artifactCount = (getDb()
    .prepare(`SELECT COUNT(*) AS cnt FROM learning_artifacts`)
    .get() as { cnt: number }).cnt;

  if (artifactCount === 0) {
    return NextResponse.json({ insufficient: true, reason: 'Complete at least one session to generate your learning profile.' });
  }

  const goals = listGoals(DEFAULT_USER_ID);
  const concepts = listConcepts(DEFAULT_USER_ID);
  const misconceptions = listMisconceptions(DEFAULT_USER_ID);
  const sessions = listRecentSessions(DEFAULT_USER_ID, 20);

  try {
    const profile = await generateThinkingProfile({
      goals: goals.map(g => ({ topic: g.topic, motivation: g.motivation, currentLevel: g.currentLevel, targetDepth: g.targetDepth, masteryPercent: g.masteryPercent })),
      concepts: concepts.map(c => ({ name: c.name, status: c.status, goalTopic: c.goalTopic, misconceptionCount: c.misconceptionCount })),
      misconceptions: misconceptions.map(m => ({ conceptName: m.conceptName, text: m.text, correction: m.correction, goalTopic: m.goalTopic })),
      sessions: sessions.map(s => ({ topic: s.topic, durationMinutes: s.durationMinutes, misconceptionCount: s.misconceptionCount })),
    });
    return NextResponse.json({ profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
