import { NextResponse } from 'next/server';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

// Called once at app start via layout; safe to call repeatedly (idempotent seed).
export async function GET(): Promise<NextResponse> {
  try {
    seedDemoData();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[db-init]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
