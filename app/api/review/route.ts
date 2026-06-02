import { NextResponse } from 'next/server';
import { listReviewItems, updateReviewItem, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';
import { parseJsonBody } from '@/lib/apiValidation';
import { z } from 'zod';

export const runtime = 'nodejs';

const UpdateReviewSchema = z.object({
  id: z.string().trim().min(1),
  quality: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export async function GET(): Promise<NextResponse> {
  seedDemoData();
  return NextResponse.json(listReviewItems(DEFAULT_USER_ID));
}

export async function POST(req: Request): Promise<NextResponse> {
  seedDemoData();
  const parsed = await parseJsonBody(req, UpdateReviewSchema);
  if ('response' in parsed) return parsed.response;
  const { id, quality } = parsed.data;
  if (!updateReviewItem(id, quality)) {
    return NextResponse.json({ error: 'Review item not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
