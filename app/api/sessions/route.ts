import { NextResponse } from 'next/server';
import { listRecentSessions, createSession, getGoal, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';
import { parseJsonBody } from '@/lib/apiValidation';
import { z } from 'zod';

export const runtime = 'nodejs';

const CreateSessionSchema = z.object({
  goalId: z.string().trim().min(1),
});

export async function GET(): Promise<NextResponse> {
  seedDemoData();
  return NextResponse.json(listRecentSessions(DEFAULT_USER_ID));
}

export async function POST(req: Request): Promise<NextResponse> {
  seedDemoData();
  const parsed = await parseJsonBody(req, CreateSessionSchema);
  if ('response' in parsed) return parsed.response;
  const { goalId } = parsed.data;
  if (!getGoal(goalId)) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }
  const sessionId = createSession(DEFAULT_USER_ID, goalId);
  return NextResponse.json({ id: sessionId }, { status: 201 });
}
