import { NextResponse } from 'next/server';
import { getSession, getGoal, getMessages, endSession, saveArtifact, scheduleReview, DEFAULT_USER_ID } from '@/lib/repos';
import { generateSessionArtifact } from '@/lib/artifactGenerator';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: sessionId } = await context.params;

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const goal = getGoal(session.goalId);
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  endSession(sessionId);

  const messages = getMessages(sessionId);
  if (messages.length < 2) {
    return NextResponse.json({ error: 'Not enough messages to generate artifact' }, { status: 422 });
  }

  const generated = await generateSessionArtifact(goal.topic, messages);

  const artifact = saveArtifact(sessionId, goal.topic, {
    summary: generated.summary,
    mastered: generated.mastered,
    weak: generated.weak,
    nextQuestions: generated.nextQuestions,
    flashcards: generated.flashcards,
    suggestedNext: generated.suggestedNext,
  });

  // Schedule flashcard reviews
  for (const card of generated.flashcards) {
    scheduleReview(DEFAULT_USER_ID, {
      sourceType: 'flashcard',
      sourceId: artifact.id,
      label: card.q.slice(0, 80),
      goalTopic: goal.topic,
      daysFromNow: 1,
    });
  }

  return NextResponse.json(artifact);
}
