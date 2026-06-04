import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const TutorResponseSchema = z.object({
  tutorMessage: z.string().describe('The tutor\'s next message. Briefly sharpen the learner\'s answer first, then ask one Socratic follow-up question. Stay in character: guide, don\'t lecture.'),
  mode: z.enum(['asking', 'explaining']).describe('"asking" = Socratic probe. "explaining" = minimal clarification (use sparingly).'),
  conceptsExtracted: z.array(z.object({
    name: z.string(),
    status: z.enum(['confirmed', 'learning', 'untested']),
    simpleDefinition: z.string().nullable().describe('One-sentence definition, or null if not determined this turn.'),
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
  // Extracted text from documents the learner uploaded when creating this goal.
  sourceContext?: string;
  scaffoldRequested?: boolean;
}

const BASE_SYSTEM_PROMPT = `You are a Socratic AI tutor. Your role is to teach through guided questioning, not lecture.

Core principles:
- Ask one focused question at a time.
- Teach, then question. Socratic tutoring is not withholding help.
- Usually ask before explaining, but do explain when the learner asks for help, says they do not remember, appears stuck, or asks what a term means.
- After each substantive learner answer, briefly precise it before moving on: name what is right, tighten the wording, add one missing nuance, or contrast it with a nearby misconception.
- Use the pattern "Yes / close / not quite → more precise version → next question." Keep the precision pass short; do not turn it into a lecture.
- Detect misconceptions early and probe them gently.
- Prefer questions that reveal whether the user truly understands vs. pattern-matched.
- In scaffold mode: give a short explanation, hint, analogy, or concrete example first; then ask a smaller follow-up question the learner can reasonably answer.
- Keep messages concise (3–5 sentences max): usually 1–2 sentences of refinement plus 1 focused question.
- Do not punish "help" as a wrong answer or treat it as a misconception by itself.

You MUST return structured JSON matching the schema exactly.`;

export function buildSystemPrompt(sourceContext?: string): string {
  if (!sourceContext) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}

REFERENCE MATERIAL
The learner uploaded the following document(s) as their source material. Ground your Socratic questions in this content — ask about concepts, claims, or mechanisms that appear in it rather than general knowledge about the topic.

${sourceContext}`;
}

export function buildSocraticTurnPrompt(ctx: EngineContext): string {
  const history = ctx.conversationHistory
    .map(m => `${m.role === 'tutor' ? 'Tutor' : 'Learner'}: ${m.content}`)
    .join('\n');

  return `
Learning goal: "${ctx.goalTopic}"
Learner level: ${ctx.currentLevel} | Target depth: ${ctx.targetDepth}
Motivation: ${ctx.motivation}
Preferred style: ${ctx.learningStyle}
Scaffold requested: ${ctx.scaffoldRequested ? 'yes — explain briefly before asking the next smaller question' : 'no'}

Conversation so far:
${history || '(session just started)'}

Learner's latest answer:
"${ctx.userAnswer}"

Analyze this answer and respond as the Socratic tutor.

Response shape:
1. Start by briefly sharpening the learner's answer: validate the useful part and make it more precise, or correct it gently if needed.
2. Then ask exactly one next question that follows from that refinement.
3. If scaffold requested is yes, include the short explanation/hint before the question.`.trim();
}

export async function runSocraticTurn(ctx: EngineContext): Promise<TutorResponse> {
  const userPrompt = buildSocraticTurnPrompt(ctx);

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: TutorResponseSchema,
    system: buildSystemPrompt(ctx.sourceContext),
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

export function buildOpeningPrompt(ctx: Pick<EngineContext, 'goalTopic' | 'currentLevel' | 'learningStyle' | 'motivation' | 'sourceContext'>): string {
  const sourcePart = ctx.sourceContext
    ? ` The learner has uploaded reference material — open with a question grounded in that content.`
    : '';
  return `Start a Socratic session on "${ctx.goalTopic}". The learner is at ${ctx.currentLevel} level, prefers ${ctx.learningStyle} explanations, and is motivated by: "${ctx.motivation}".${sourcePart} Ask an opening diagnostic question that reveals what they already know — NOT a yes/no question.`;
}

export async function generateOpeningQuestion(ctx: Pick<EngineContext, 'goalTopic' | 'currentLevel' | 'learningStyle' | 'motivation' | 'sourceContext'>): Promise<string> {
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: OpeningSchema,
    system: buildSystemPrompt(ctx.sourceContext),
    prompt: buildOpeningPrompt(ctx),
    temperature: 0.5,
  });
  return (result.object as { question: string; diagnosticPlan: string }).question;
}
