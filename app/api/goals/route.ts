import { NextResponse } from 'next/server';
import { listGoals, createGoal, updateLearnerProfile, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  seedDemoData();
  return NextResponse.json(listGoals(DEFAULT_USER_ID));
}

export async function POST(req: Request): Promise<NextResponse> {
  seedDemoData();
  const body = await req.json() as { topic: string; description?: string; currentLevel?: string; targetDepth?: string; motivation?: string; learningStyle?: string };
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
