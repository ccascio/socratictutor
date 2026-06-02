import { NextResponse } from 'next/server';
import { listReviewItems, updateReviewItem, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  seedDemoData();
  return NextResponse.json(listReviewItems(DEFAULT_USER_ID));
}

export async function POST(req: Request): Promise<NextResponse> {
  const { id, quality } = await req.json() as { id: string; quality: 0 | 1 | 2 | 3 | 4 | 5 };
  updateReviewItem(id, quality);
  return NextResponse.json({ ok: true });
}
