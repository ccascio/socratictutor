import { ChatBody } from '@/types/types';
import { OpenAIStream } from '@/utils/chatStream';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return new Response('Use POST to send a message.', { status: 405 });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { inputCode, model, apiKey } = (await req.json()) as ChatBody;

    const apiKeyFinal = getOpenAIKey(apiKey);

    const stream = await OpenAIStream(inputCode, model, apiKeyFinal);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}

function getOpenAIKey(apiKey?: string): string | undefined {
  return (
    apiKey?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY?.trim()
  );
}
