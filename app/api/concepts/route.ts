import { NextResponse } from 'next/server';
import { listConcepts, listMisconceptions, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  seedDemoData();
  return NextResponse.json({
    concepts: listConcepts(DEFAULT_USER_ID),
    misconceptions: listMisconceptions(DEFAULT_USER_ID),
  });
}
