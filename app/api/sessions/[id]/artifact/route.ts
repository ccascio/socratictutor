import { NextResponse } from 'next/server';
import { getArtifact } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: sessionId } = await context.params;
  const artifact = getArtifact(sessionId);
  if (!artifact) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(artifact);
}
