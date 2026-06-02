import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function parseJsonBody<T>(
  req: Request,
  schema: z.Schema<T>,
): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return {
      response: NextResponse.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        {
          error: 'Invalid request body.',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data };
}

export function isLocalRequest(req: Request): boolean {
  const host = req.headers.get('host')?.split(':')[0]?.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
}
