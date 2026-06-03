import { NextResponse } from 'next/server';
import { getGoal, saveSourceDocument } from '@/lib/repos';
import { embedAndStoreChunks } from '@/lib/documentRetrieval';
import { seedDemoData } from '@/lib/seed';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_CHARS = 50_000;            // ~12 500 tokens — enough for a chapter

async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text.slice(0, MAX_TEXT_CHARS);
  }

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8').slice(0, MAX_TEXT_CHARS);
  }

  throw new Error(`Unsupported file type: .${ext}. Upload a PDF, .txt, or .md file.`);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  seedDemoData();
  const { id: goalId } = await context.params;

  const goal = getGoal(goalId);
  if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Request must be multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'file field is required.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File must be under 10 MB.' }, { status: 413 });
  }

  let contentText: string;
  try {
    contentText = await extractText(file);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  if (!contentText.trim()) {
    return NextResponse.json({ error: 'No text could be extracted from this file.' }, { status: 422 });
  }

  const doc = saveSourceDocument(goalId, {
    filename: file.name,
    contentText,
    sizeBytes: file.size,
  });

  // Embed chunks synchronously — the wizard awaits this request before creating the
  // session, so chunks will be ready before the first Socratic turn. Non-fatal: if the
  // embeddings API fails, the session falls back to flat text truncation.
  try {
    await embedAndStoreChunks(doc.id, goalId, contentText);
  } catch (err) {
    console.error('[documents] chunk embedding failed, falling back to flat context:', err);
  }

  return NextResponse.json(doc, { status: 201 });
}
