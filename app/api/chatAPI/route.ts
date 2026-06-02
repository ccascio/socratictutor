import { ChatBody } from '@/types/types';
import { OpenAIStream } from '@/utils/chatStream';
import { parseJsonBody } from '@/lib/apiValidation';
import { z } from 'zod';

export const runtime = 'nodejs';

const ChatBodySchema = z.object({
  inputCode: z.string().trim().min(1),
  model: z.enum(['gpt-4o', 'gpt-3.5-turbo']),
});

export async function GET(): Promise<Response> {
  return new Response('Use POST to send a message.', { status: 405 });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, ChatBodySchema);
    if ('response' in parsed) return parsed.response;

    const { inputCode, model } = parsed.data satisfies ChatBody;

    const stream = await OpenAIStream(inputCode, model);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}
