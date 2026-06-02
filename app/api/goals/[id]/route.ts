import { NextResponse } from 'next/server';
import { archiveGoal } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id } = await params;
  archiveGoal(id);
  return NextResponse.json({ ok: true });
}
