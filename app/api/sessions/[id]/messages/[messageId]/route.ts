import { NextResponse } from 'next/server';
import { deleteMessage, editMessageOrForkSession, getMessages, getSession } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';
import { parseJsonBody } from '@/lib/apiValidation';
import { z } from 'zod';

export const runtime = 'nodejs';

const EditMessageSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: sessionId, messageId } = await context.params;
  if (!getSession(sessionId)) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const parsed = await parseJsonBody(req, EditMessageSchema);
  if ('response' in parsed) return parsed.response;

  const result = editMessageOrForkSession(sessionId, messageId, parsed.data.content);
  if (!result) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  return NextResponse.json({
    forked: result.forked,
    sessionId: result.sessionId,
    messages: result.messages,
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: sessionId, messageId } = await context.params;
  if (!getSession(sessionId)) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const deleted = deleteMessage(sessionId, messageId);
  if (!deleted) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  return NextResponse.json({ messages: getMessages(sessionId) });
}
