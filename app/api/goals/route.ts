import { NextResponse } from 'next/server';
import { listGoals, createGoal, updateLearnerProfile, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';
import { parseJsonBody } from '@/lib/apiValidation';
import { z } from 'zod';

export const runtime = 'nodejs';

const CreateGoalSchema = z.object({
  topic: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  currentLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  targetDepth: z.enum(['conceptual', 'applied', 'deep']).optional(),
  motivation: z.string().trim().max(1000).optional(),
  learningStyle: z.enum(['intuition-first', 'math-ok', 'analogy-heavy', 'example-driven']).optional(),
});

export async function GET(): Promise<NextResponse> {
  seedDemoData();
  return NextResponse.json(listGoals(DEFAULT_USER_ID));
}

export async function POST(req: Request): Promise<NextResponse> {
  seedDemoData();
  const parsed = await parseJsonBody(req, CreateGoalSchema);
  if ('response' in parsed) return parsed.response;
  const body = parsed.data;
  if (body.learningStyle) {
    updateLearnerProfile(DEFAULT_USER_ID, { learningStyle: body.learningStyle });
  }
  const goal = createGoal(DEFAULT_USER_ID, {
    topic: body.topic,
    description: body.description ?? '',
    currentLevel: body.currentLevel ?? 'intermediate',
    targetDepth: body.targetDepth ?? 'conceptual',
    motivation: body.motivation ?? '',
  });
  return NextResponse.json(goal, { status: 201 });
}
