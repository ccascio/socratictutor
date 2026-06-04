import { NextResponse } from 'next/server';
import {
  appendMessage,
  DEFAULT_USER_ID,
  forkSessionBeforeMessage,
  getGoal,
  getLearnerProfile,
  getMessage,
  getMessages,
  getMessagesBeforeTurn,
  getSession,
  isLastMessage,
  listSourceDocuments,
  replaceMessageContent,
} from '@/lib/repos';
import { retrieveRelevantChunksWithScores } from '@/lib/documentRetrieval';
import {
  buildOpeningPrompt,
  buildSocraticTurnPrompt,
  buildSystemPrompt,
  generateOpeningQuestion,
  runSocraticTurn,
} from '@/lib/socraticEngine';
import { seedDemoData } from '@/lib/seed';
import type { ChatMessage, LearningGoal } from '@/types/learning';

export const runtime = 'nodejs';

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
  previousMessages: Pick<ChatMessage, 'role' | 'content'>[],
  goal: Pick<LearningGoal, 'topic' | 'motivation'>,
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

async function buildSourceContext(goalId: string, goal: LearningGoal, userMessage: string | undefined, previousMessages: ChatMessage[]) {
  const ragQuery = buildRetrievalQuery(userMessage, previousMessages, goal);
  const sourceDocuments = listSourceDocuments(goalId);
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
    const retrieval = await retrieveRelevantChunksWithScores(goalId, ragQuery);
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

  return {
    sourceContext,
    traceBase: {
      retrieval: retrievalTrace,
      sourceContextChars: sourceContext?.length ?? 0,
    },
  };
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: sessionId, messageId } = await context.params;

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const goal = getGoal(session.goalId);
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  const targetMessage = getMessage(sessionId, messageId);
  if (!targetMessage) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (targetMessage.role !== 'tutor') {
    return NextResponse.json({ error: 'Only tutor messages can be regenerated' }, { status: 400 });
  }
  if (targetMessage.turnIndex === undefined) {
    return NextResponse.json({ error: 'Message turn not found' }, { status: 400 });
  }

  const shouldReplaceInPlace = isLastMessage(sessionId, messageId);
  const activeSessionId = shouldReplaceInPlace ? sessionId : forkSessionBeforeMessage(sessionId, messageId);
  if (!activeSessionId) {
    return NextResponse.json({ error: 'Could not fork conversation' }, { status: 500 });
  }

  const messagesBefore = shouldReplaceInPlace
    ? getMessagesBeforeTurn(sessionId, targetMessage.turnIndex)
    : getMessages(activeSessionId);
  const lastUserIndex = [...messagesBefore].reverse().findIndex(m => m.role === 'user');
  const lastUser = lastUserIndex >= 0
    ? messagesBefore[messagesBefore.length - 1 - lastUserIndex]
    : undefined;

  const previousForRetrieval = lastUser
    ? messagesBefore.slice(0, messagesBefore.indexOf(lastUser))
    : messagesBefore;
  const { sourceContext, traceBase } = await buildSourceContext(
    session.goalId,
    goal,
    lastUser?.content,
    previousForRetrieval,
  );
  const { learningStyle } = getLearnerProfile(DEFAULT_USER_ID);

  let tutorMessage: string;
  let requestTrace: { model: string; temperature: number; system: string; prompt: string };
  if (lastUser) {
    const conversationBeforeAnswer = messagesBefore.slice(0, messagesBefore.indexOf(lastUser));
    const turnContext = {
      goalTopic: goal.topic,
      currentLevel: goal.currentLevel,
      targetDepth: goal.targetDepth,
      motivation: goal.motivation,
      learningStyle,
      conversationHistory: conversationBeforeAnswer.map(m => ({ role: m.role as 'tutor' | 'user', content: m.content })),
      userAnswer: lastUser.content,
      sourceContext,
      scaffoldRequested: isScaffoldRequest(lastUser.content),
    };
    const result = await runSocraticTurn(turnContext);
    tutorMessage = result.tutorMessage;
    requestTrace = {
      model: 'gpt-4o-mini',
      temperature: 0.4,
      system: buildSystemPrompt(sourceContext),
      prompt: buildSocraticTurnPrompt(turnContext),
    };
  } else {
    const openingContext = {
      goalTopic: goal.topic,
      currentLevel: goal.currentLevel,
      learningStyle,
      motivation: goal.motivation,
      sourceContext,
    };
    tutorMessage = await generateOpeningQuestion(openingContext);
    requestTrace = {
      model: 'gpt-4o-mini',
      temperature: 0.5,
      system: buildSystemPrompt(sourceContext),
      prompt: buildOpeningPrompt(openingContext),
    };
  }

  if (shouldReplaceInPlace) {
    replaceMessageContent(sessionId, messageId, tutorMessage);
  } else {
    appendMessage(activeSessionId, 'tutor', tutorMessage);
  }

  return NextResponse.json({
    forked: !shouldReplaceInPlace,
    sessionId: activeSessionId,
    tutorMessage,
    messages: getMessages(activeSessionId),
    llmTrace: {
      ...traceBase,
      skipped: false,
      request: requestTrace,
    },
  });
}
