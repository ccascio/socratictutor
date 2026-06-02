import { NextResponse } from 'next/server';
import { listRecentSessions, createSession, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  seedDemoData();
  return NextResponse.json(listRecentSessions(DEFAULT_USER_ID));
}

export async function POST(req: Request): Promise<NextResponse> {
  const { goalId } = await req.json() as { goalId: string };
  if (!goalId) return NextResponse.json({ error: 'goalId required' }, { status: 400 });
  const sessionId = createSession(DEFAULT_USER_ID, goalId);
  return NextResponse.json({ id: sessionId }, { status: 201 });
}
