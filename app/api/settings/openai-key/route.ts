import path from 'path';
import { NextResponse } from 'next/server';
import { upsertEnvValue } from '@/utils/envFile';

export const runtime = 'nodejs';

const ENV_KEY = 'OPENAI_API_KEY';
const LEGACY_ENV_KEY = 'NEXT_PUBLIC_OPENAI_API_KEY';

export async function GET(): Promise<NextResponse> {
  const source = getConfiguredOpenAIKeySource();

  return NextResponse.json({
    configured: Boolean(source),
    source,
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { apiKey?: unknown };
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'apiKey must not be empty.' },
        { status: 400 },
      );
    }

    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { ok: false, error: 'OpenAI API keys should start with sk-.' },
        { status: 400 },
      );
    }

    await upsertEnvValue(path.join(process.cwd(), '.env'), ENV_KEY, apiKey);
    process.env[ENV_KEY] = apiKey;

    return NextResponse.json({ ok: true, configured: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: 'Unable to save the OpenAI API key.' },
      { status: 500 },
    );
  }
}

function getConfiguredOpenAIKey(): string {
  return (
    process.env[ENV_KEY]?.trim() ||
    process.env[LEGACY_ENV_KEY]?.trim() ||
    ''
  );
}

function getConfiguredOpenAIKeySource(): string | null {
  if (process.env[ENV_KEY]?.trim()) return ENV_KEY;
  if (process.env[LEGACY_ENV_KEY]?.trim()) return LEGACY_ENV_KEY;
  return null;
}
