import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { ChatMessage } from '@/types/learning';

const ArtifactSchema = z.object({
  summary: z.string().describe('2–4 sentence summary of what the learner demonstrated and where gaps remain.'),
  mastered: z.array(z.string()).describe('Concepts the learner clearly understood by the end of the session.'),
  weak: z.array(z.string()).describe('Concepts that remain unclear or partially understood.'),
  nextQuestions: z.array(z.string()).max(3).describe('The 2–3 best Socratic follow-up questions for the next session.'),
  flashcards: z.array(z.object({
    q: z.string(),
    a: z.string(),
  })).max(6).describe('Up to 6 flashcards covering the key concepts from this session.'),
  suggestedNext: z.string().describe('One sentence: what to focus on next session.'),
});

export type GeneratedArtifact = z.infer<typeof ArtifactSchema>;

export async function generateSessionArtifact(
  goalTopic: string,
  messages: ChatMessage[],
): Promise<GeneratedArtifact> {
  const transcript = messages
    .map(m => `${m.role === 'tutor' ? 'Tutor' : 'Learner'}: ${m.content}`)
    .join('\n');

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ArtifactSchema,
    system: `You are generating structured learning artifacts from a completed Socratic tutoring session on "${goalTopic}". Be precise and evidence-based — only list concepts as mastered if the learner clearly demonstrated understanding in the transcript.`,
    prompt: `Here is the complete session transcript:\n\n${transcript}\n\nGenerate the session artifact.`,
    temperature: 0.2,
  });

  return result.object as GeneratedArtifact;
}
