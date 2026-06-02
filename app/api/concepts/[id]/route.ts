import { NextResponse } from 'next/server';
import { getConceptDetail } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id } = await params;
  const detail = getConceptDetail(id);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}
