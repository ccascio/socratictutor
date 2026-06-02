import { NextResponse } from 'next/server';
import { getSession, getMessages, appendMessage, upsertConcept, createMisconception, getGoal, getLearnerProfile, DEFAULT_USER_ID, scheduleReview } from '@/lib/repos';
import { runSocraticTurn, generateOpeningQuestion } from '@/lib/socraticEngine';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

// POST /api/sessions/[id]/chat
// Body: { userMessage?: string }  — omit userMessage to get the opening question
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: sessionId } = await context.params;
  const { userMessage } = (await req.json()) as { userMessage?: string };

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const goal = getGoal(session.goalId);
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  const { learningStyle } = getLearnerProfile(DEFAULT_USER_ID);

  // Opening question (no user message yet)
  if (!userMessage) {
    const question = await generateOpeningQuestion({
      goalTopic: goal.topic,
      currentLevel: goal.currentLevel,
      learningStyle,
      motivation: goal.motivation,
    });
    appendMessage(sessionId, 'tutor', question);
    return NextResponse.json({ tutorMessage: question, mode: 'asking', conceptsExtracted: [], misconception: null, gapDetected: null, confidenceScore: 0 });
  }

  // Store user message
  appendMessage(sessionId, 'user', userMessage);

  // Run Socratic engine
  const history = getMessages(sessionId);
  const result = await runSocraticTurn({
    goalTopic: goal.topic,
    currentLevel: goal.currentLevel,
    targetDepth: goal.targetDepth,
    motivation: goal.motivation,
    learningStyle,
    conversationHistory: history.slice(0, -1).map(m => ({ role: m.role as 'tutor' | 'user', content: m.content })),
    userAnswer: userMessage,
  });

  // Persist tutor message
  appendMessage(sessionId, 'tutor', result.tutorMessage);

  // Persist extracted concepts
  for (const c of result.conceptsExtracted) {
    upsertConcept(DEFAULT_USER_ID, session.goalId, {
      name: c.name,
      simpleDefinition: c.simpleDefinition,
      status: c.status === 'confirmed' ? 'strong' : c.status === 'learning' ? 'improving' : 'weak',
    });
  }

  // Persist misconception + schedule review
  if (result.misconception) {
    const misc = createMisconception(DEFAULT_USER_ID, sessionId, goal.topic, {
      conceptName: result.misconception.conceptName,
      text: result.misconception.text,
      correction: result.misconception.correction,
    });
    scheduleReview(DEFAULT_USER_ID, {
      sourceType: 'misconception',
      sourceId: misc.id,
      label: result.misconception.text.slice(0, 80),
      goalTopic: goal.topic,
      daysFromNow: 0,
    });
  }

  return NextResponse.json(result);
}
