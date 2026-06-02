import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const TutorResponseSchema = z.object({
  tutorMessage: z.string().describe('The tutor\'s next message — a Socratic question, probe, or minimal explanation. Stay in character: guide, don\'t lecture.'),
  mode: z.enum(['asking', 'explaining']).describe('"asking" = Socratic probe. "explaining" = minimal clarification (use sparingly).'),
  conceptsExtracted: z.array(z.object({
    name: z.string(),
    status: z.enum(['confirmed', 'learning', 'untested']),
    simpleDefinition: z.string().optional(),
  })).describe('Concepts the user demonstrated understanding of (or gaps in) during this exchange.'),
  misconception: z.object({
    text: z.string().describe('What the user incorrectly believed (verbatim or paraphrase).'),
    correction: z.string().describe('The accurate version, stated concisely.'),
    conceptName: z.string(),
  }).nullable().describe('Set if a clear misconception was detected in the user\'s last answer. Null otherwise.'),
  gapDetected: z.string().nullable().describe('The specific gap in understanding this exchange revealed, if any. Used to tune next question.'),
  confidenceScore: z.number().min(0).max(1).describe('0–1: how well the user understood the concept in their last answer.'),
});

export type TutorResponse = z.infer<typeof TutorResponseSchema>;

export interface EngineContext {
  goalTopic: string;
  currentLevel: string;
  targetDepth: string;
  motivation: string;
  learningStyle: string;
  conversationHistory: Array<{ role: 'tutor' | 'user'; content: string }>;
  userAnswer: string;
}

const SYSTEM_PROMPT = `You are a Socratic AI tutor. Your role is to teach through guided questioning, not lecture.

Core principles:
- Ask one focused question at a time.
- Never explain something the user hasn't tried to explain first.
- Detect misconceptions early and probe them gently.
- Prefer questions that reveal whether the user truly understands vs. pattern-matched.
- Minimal explanations only when the user is stuck or has corrected a misconception.
- Keep messages concise (2–4 sentences max).

You MUST return structured JSON matching the schema exactly.`;

export async function runSocraticTurn(ctx: EngineContext): Promise<TutorResponse> {
  const history = ctx.conversationHistory
    .map(m => `${m.role === 'tutor' ? 'Tutor' : 'Learner'}: ${m.content}`)
    .join('\n');

  const userPrompt = `
Learning goal: "${ctx.goalTopic}"
Learner level: ${ctx.currentLevel} | Target depth: ${ctx.targetDepth}
Motivation: ${ctx.motivation}
Preferred style: ${ctx.learningStyle}

Conversation so far:
${history || '(session just started)'}

Learner's latest answer:
"${ctx.userAnswer}"

Analyze this answer and respond as the Socratic tutor.`.trim();

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: TutorResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.4,
  });

  return result.object as TutorResponse;
}

// ── Opening question when a session starts ────────────────────────────────────

const OpeningSchema = z.object({
  question: z.string(),
  diagnosticPlan: z.string().describe('What the tutor plans to assess in the first 3 questions.'),
});

export async function generateOpeningQuestion(ctx: Pick<EngineContext, 'goalTopic' | 'currentLevel' | 'learningStyle' | 'motivation'>): Promise<string> {
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: OpeningSchema,
    system: SYSTEM_PROMPT,
    prompt: `Start a Socratic session on "${ctx.goalTopic}". The learner is at ${ctx.currentLevel} level, prefers ${ctx.learningStyle} explanations, and is motivated by: "${ctx.motivation}". Ask an opening diagnostic question that reveals what they already know — NOT a yes/no question.`,
    temperature: 0.5,
  });
  return (result.object as { question: string; diagnosticPlan: string }).question;
}
