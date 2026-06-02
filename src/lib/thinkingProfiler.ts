import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ThinkingProfile } from '@/types/learning';
import type { LearningGoal, Concept, Misconception, Session } from '@/types/learning';

const ProfileSchema = z.object({
  strengths: z.array(z.object({
    trait: z.string().describe('A CROSS-CUTTING cognitive trait — e.g. "Systems thinking", "Abstraction", "Pattern recognition". NEVER a concept name or topic. A mastered concept is evidence FOR a trait, never the trait itself.'),
    evidence: z.string().describe('One sentence explaining which concepts or behaviors led to this inference.'),
  })).max(5).describe('Cross-cutting cognitive strengths inferred from how the learner engages with material. Empty is better than listing concept names.'),

  weaknesses: z.array(z.object({
    trait: z.string().describe('A CROSS-CUTTING learning difficulty — e.g. "Precision under formalism", "Distinguishing correlated mechanisms", "Avoiding over-generalisation". NEVER a concept name or topic.'),
    evidence: z.string().describe('One sentence explaining which mistakes or weak concepts led to this inference.'),
  })).max(4).describe('Cross-cutting cognitive difficulties inferred from misconceptions and weak areas. Empty is better than listing concept names.'),

  commonMistakes: z.array(z.object({
    pattern: z.string().describe('An ABSTRACT mistake pattern that describes a category of error — e.g. "Treating dynamic values as fixed properties", "Over-applying simple heuristics to complex tradeoffs". Must generalize across ≥2 data points if possible.'),
    example: z.string().describe('One brief concrete example drawn from the misconceptions data, illustrating the pattern.'),
  })).max(4).describe('Abstracted error patterns. If only 1–2 misconceptions exist, describe the pattern they share. Empty if no clear pattern.'),

  learningStyleAssessment: z.string().describe('2–3 sentences inferring how this person learns best, based on their stated motivations, chosen topics, and how they recover from mistakes. Do NOT report a stored label — infer from behavior.'),

  narrative: z.string().describe('2–3 sentences: an overall honest cognitive profile. If data is limited, say so directly — e.g. "With only one session completed, this profile is preliminary."'),

  dataQualityNote: z.string().describe('One sentence stating what this profile is based on. E.g. "Based on 3 sessions across 2 goals with 4 misconceptions recorded."'),
});

export interface ProfileInput {
  goals: Pick<LearningGoal, 'topic' | 'motivation' | 'currentLevel' | 'targetDepth' | 'masteryPercent'>[];
  concepts: Pick<Concept, 'name' | 'status' | 'goalTopic' | 'misconceptionCount'>[];
  misconceptions: Pick<Misconception, 'conceptName' | 'text' | 'correction' | 'goalTopic'>[];
  sessions: Pick<Session, 'topic' | 'durationMinutes' | 'misconceptionCount'>[];
}

export async function generateThinkingProfile(input: ProfileInput): Promise<ThinkingProfile> {
  const goalLines = input.goals
    .map(g => `  - "${g.topic}" (level: ${g.currentLevel}, target: ${g.targetDepth}, mastery: ${g.masteryPercent}%, motivation: "${g.motivation}")`)
    .join('\n');

  const conceptLines = input.concepts
    .map(c => `  - ${c.name} [${c.status}]${c.misconceptionCount > 0 ? ` ⚠ ${c.misconceptionCount} misconception(s)` : ''}`)
    .join('\n');

  const miscLines = input.misconceptions
    .map(m => `  - In "${m.goalTopic}" / ${m.conceptName}: believed "${m.text}" → correct: "${m.correction}"`)
    .join('\n');

  const sessionLines = input.sessions
    .map(s => `  - "${s.topic}" — ${s.durationMinutes} min, ${s.misconceptionCount} misconception(s)`)
    .join('\n');

  const prompt = `
Analyze this learner's history and generate an honest, evidence-based cognitive profile.

LEARNING GOALS:
${goalLines || '  (none)'}

CONCEPTS (status: unknown/weak/improving/strong/mastered):
${conceptLines || '  (none)'}

MISCONCEPTIONS DETECTED:
${miscLines || '  (none — or data insufficient)'}

SESSION HISTORY:
${sessionLines || '  (none completed)'}

Rules:
- Strengths and weaknesses must be cross-cutting COGNITIVE TRAITS, never concept names or topic names.
  BAD: "Softmax normalization"  →  GOOD: "Mechanical reasoning" (with evidence: mastery of softmax)
  BAD: "Multi-head attention"   →  GOOD: "Compositional abstraction" (with evidence: weak on multi-head)
- A mastered concept is EVIDENCE FOR a trait, never the trait itself.
- commonMistakes must abstract across misconceptions, not restate them verbatim.
- If data is thin (1–2 sessions, few misconceptions), keep lists short and say so in the narrative.
- Empty lists are correct when there is insufficient evidence. Do not pad.
- Infer learning style from the topics chosen, motivation statements, and mistake recovery — not from any stored label.
`.trim();

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ProfileSchema,
    system: `You are a learning scientist generating an evidence-based cognitive profile for a Socratic learning system. Your output must be grounded in the provided data. Be honest when data is limited. Never fabricate traits.`,
    prompt,
    temperature: 0.3,
  });

  return result.object as ThinkingProfile;
}
