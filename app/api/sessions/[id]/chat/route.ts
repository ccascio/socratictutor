import { NextResponse } from 'next/server';
import { getSession, getMessages, appendMessage, upsertConcept, createMisconception, getGoal, getLearnerProfile, listSourceDocuments, DEFAULT_USER_ID, scheduleReview, recomputeGoalMastery } from '@/lib/repos';
import { retrieveRelevantChunksWithScores } from '@/lib/documentRetrieval';
import { runSocraticTurn, generateOpeningQuestion, buildOpeningPrompt, buildSocraticTurnPrompt, buildSystemPrompt } from '@/lib/socraticEngine';
import { seedDemoData } from '@/lib/seed';
import { parseJsonBody } from '@/lib/apiValidation';
import { z } from 'zod';

export const runtime = 'nodejs';

const ChatTurnSchema = z.object({
  userMessage: z.string().trim().min(1).max(8000).optional(),
});

function compactError(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown retrieval error';
}

function isScaffoldRequest(message?: string): boolean {
  if (!message) return false;
  return /\b(help|hint|explain|explanation|teach me|walk me through|i don't know|i dont know|don't remember|dont remember|not sure|stuck|remind me|what does|what is|can you tell me)\b/i
    .test(message);
}

function buildRetrievalQuery(
  userMessage: string | undefined,
  previousMessages: { role: string; content: string }[],
  goal: { topic: string; motivation: string },
): string {
  if (!userMessage) return `${goal.topic} ${goal.motivation}`;

  const lastTutorMessage = [...previousMessages].reverse().find(m => m.role === 'tutor');
  if (!lastTutorMessage) return `${goal.topic}\n${userMessage}`;

  return [
    goal.topic,
    `Tutor question: ${lastTutorMessage.content}`,
    `Learner response: ${userMessage}`,
  ].join('\n');
}

// POST /api/sessions/[id]/chat
// Body: { userMessage?: string }  — omit userMessage to get the opening question
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: sessionId } = await context.params;
  const parsed = await parseJsonBody(req, ChatTurnSchema);
  if ('response' in parsed) return parsed.response;
  const { userMessage } = parsed.data;

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const goal = getGoal(session.goalId);
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  const { learningStyle } = getLearnerProfile(DEFAULT_USER_ID);
  const previousMessages = getMessages(sessionId);
  const scaffoldRequested = isScaffoldRequest(userMessage);

  // Build source context via RAG: embed the current query and retrieve the most
  // relevant document chunks for this goal. For the opening question we use the
  // goal topic + motivation as a broad semantic anchor. For chat turns we combine
  // the learner's answer with the last tutor question, so vague requests like
  // "help" still retrieve against the actual concept being discussed.
  //
  // Fallback: if no chunk embeddings exist (document uploaded before RAG was added,
  // or the embedding step failed), load the raw text and truncate — same behaviour
  // as before.
  const ragQuery = buildRetrievalQuery(userMessage, previousMessages, goal);
  const sourceDocuments = listSourceDocuments(session.goalId);
  const retrievalTrace = {
    query: ragQuery,
    embeddingModel: 'text-embedding-3-small',
    vectorChunkCount: 0,
    vectorSearchRan: false,
    similarityThreshold: 0.45,
    matchedChunkCount: 0,
    fallbackUsed: false,
    sourceDocumentCount: sourceDocuments.length,
    error: null as string | null,
    chunks: [] as { score: number; content: string }[],
  };

  let sourceContext: string | undefined;

  try {
    const retrieval = await retrieveRelevantChunksWithScores(session.goalId, ragQuery);
    retrievalTrace.embeddingModel = retrieval.model;
    retrievalTrace.vectorChunkCount = retrieval.availableChunkCount;
    retrievalTrace.vectorSearchRan = retrieval.availableChunkCount > 0;
    retrievalTrace.similarityThreshold = retrieval.threshold;
    retrievalTrace.matchedChunkCount = retrieval.chunks.length;
    retrievalTrace.chunks = retrieval.chunks.map(chunk => ({
      score: Number(chunk.score.toFixed(3)),
      content: chunk.content,
    }));
    if (retrieval.chunks.length > 0) {
      sourceContext = retrieval.chunks.map(chunk => chunk.content).join('\n\n---\n\n');
    }
  } catch (err) {
    retrievalTrace.error = compactError(err);
  }

  if (!sourceContext) {
    const flat = sourceDocuments
      .map(d => `[${d.filename}]\n${d.contentText.slice(0, 6_000)}`)
      .join('\n\n---\n\n')
      .slice(0, 12_000);
    if (flat) sourceContext = flat;
    retrievalTrace.fallbackUsed = !!flat;
  }

  const llmTraceBase = {
    retrieval: retrievalTrace,
    sourceContextChars: sourceContext?.length ?? 0,
  };

  // Opening question (no user message yet)
  if (!userMessage) {
    const existingMessages = previousMessages;
    if (existingMessages.length > 0) {
      const lastTutorMessage = [...existingMessages].reverse().find(m => m.role === 'tutor');
      return NextResponse.json({
        tutorMessage: lastTutorMessage?.content ?? existingMessages[existingMessages.length - 1].content,
        mode: 'asking',
        conceptsExtracted: [],
        misconception: null,
        gapDetected: null,
        confidenceScore: 0,
        messages: existingMessages,
        llmTrace: {
          ...llmTraceBase,
          skipped: true,
          reason: 'Existing session messages were returned; no new LLM request was made.',
        },
      });
    }

    const openingContext = {
      goalTopic: goal.topic,
      currentLevel: goal.currentLevel,
      learningStyle,
      motivation: goal.motivation,
      sourceContext,
    };
    const question = await generateOpeningQuestion(openingContext);
    const messageId = appendMessage(sessionId, 'tutor', question);
    return NextResponse.json({
      tutorMessage: question,
      mode: 'asking',
      conceptsExtracted: [],
      misconception: null,
      gapDetected: null,
      confidenceScore: 0,
      messages: [{ id: messageId, role: 'tutor', content: question, turnIndex: 0 }],
      llmTrace: {
        ...llmTraceBase,
        skipped: false,
        request: {
          model: 'gpt-4o-mini',
          temperature: 0.5,
          system: buildSystemPrompt(sourceContext),
          prompt: buildOpeningPrompt(openingContext),
        },
      },
    });
  }

  // Store user message
  appendMessage(sessionId, 'user', userMessage);

  // Run Socratic engine
  const history = getMessages(sessionId);
  const turnContext = {
    goalTopic: goal.topic,
    currentLevel: goal.currentLevel,
    targetDepth: goal.targetDepth,
    motivation: goal.motivation,
    learningStyle,
    conversationHistory: history.slice(0, -1).map(m => ({ role: m.role as 'tutor' | 'user', content: m.content })),
    userAnswer: userMessage,
    sourceContext,
    scaffoldRequested,
  };
  const result = await runSocraticTurn(turnContext);

  // Persist tutor message
  appendMessage(sessionId, 'tutor', result.tutorMessage);

  // Persist extracted concepts
  for (const c of result.conceptsExtracted) {
    upsertConcept(DEFAULT_USER_ID, session.goalId, {
      name: c.name,
      simpleDefinition: c.simpleDefinition ?? undefined,
      status: c.status === 'confirmed' ? 'strong' : c.status === 'learning' ? 'improving' : 'unknown',
    });
  }

  // Persist misconception + schedule review
  if (result.misconception) {
    const misc = createMisconception(DEFAULT_USER_ID, sessionId, session.goalId, goal.topic, {
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

  // Roll the freshly extracted concepts up into the goal's mastery %.
  recomputeGoalMastery(session.goalId);

  return NextResponse.json({
    ...result,
    messages: getMessages(sessionId),
    llmTrace: {
      ...llmTraceBase,
      skipped: false,
      request: {
        model: 'gpt-4o-mini',
        temperature: 0.4,
        system: buildSystemPrompt(sourceContext),
        prompt: buildSocraticTurnPrompt(turnContext),
      },
    },
  });
}
