import path from 'path';
import { NextResponse } from 'next/server';
import { upsertEnvValue } from '@/utils/envFile';
import { isLocalRequest, parseJsonBody } from '@/lib/apiValidation';
import { z } from 'zod';

export const runtime = 'nodejs';

const ENV_KEY = 'OPENAI_API_KEY';
const LEGACY_ENV_KEY = 'NEXT_PUBLIC_OPENAI_API_KEY';
const SaveKeySchema = z.object({
  apiKey: z.string().trim().min(1, 'apiKey must not be empty.').regex(/^sk-/, 'OpenAI API keys should start with sk-.'),
});

export async function GET(): Promise<NextResponse> {
  const source = getConfiguredOpenAIKeySource();

  return NextResponse.json({
    configured: Boolean(source),
    source,
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    if (!isLocalRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Saving API keys is only available from localhost.' },
        { status: 403 },
      );
    }

    const parsed = await parseJsonBody(req, SaveKeySchema);
    if ('response' in parsed) return parsed.response;
    const { apiKey } = parsed.data;

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

function getConfiguredOpenAIKeySource(): string | null {
  if (process.env[ENV_KEY]?.trim()) return ENV_KEY;
  if (process.env[LEGACY_ENV_KEY]?.trim()) return LEGACY_ENV_KEY;
  return null;
}
