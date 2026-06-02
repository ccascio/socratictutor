import { NextResponse } from 'next/server';
import { getArtifact, listMisconceptions, DEFAULT_USER_ID } from '@/lib/repos';
import { seedDemoData } from '@/lib/seed';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { SessionPdf } from '@/lib/pdfTemplate';

export const runtime = 'nodejs';

// GET /api/export?session=session-1&format=markdown|anki|json
export async function GET(req: Request): Promise<NextResponse> {
  seedDemoData();
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session');
  const format = url.searchParams.get('format') ?? 'markdown';

  if (!sessionId) return NextResponse.json({ error: 'session param required' }, { status: 400 });

  const artifact = getArtifact(sessionId);
  if (!artifact) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });

  if (format === 'pdf') {
    const sessionMisconceptions = listMisconceptions(DEFAULT_USER_ID).filter(m => m.sessionId === sessionId);
    const generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const element = createElement(SessionPdf, { artifact, misconceptions: sessionMisconceptions, generatedAt });
    const buffer = await renderToBuffer(element);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="session-${sessionId}.pdf"`,
      },
    });
  }

  if (format === 'json') {
    return NextResponse.json(artifact, {
      headers: { 'Content-Disposition': `attachment; filename="session-${sessionId}.json"` },
    });
  }

  if (format === 'anki') {
    // Anki CSV: Front,Back,Tags
    const rows = artifact.flashcards.map(
      f => `"${f.q.replace(/"/g, '""')}","${f.a.replace(/"/g, '""')}","${artifact.goalTopic.replace(/\s+/g, '_')}"`,
    );
    const csv = ['Front,Back,Tags', ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="anki-${sessionId}.csv"`,
      },
    });
  }

  // Default: Markdown
  const md = [
    `# ${artifact.goalTopic} — Session Notes`,
    ``,
    `## Summary`,
    artifact.summary,
    ``,
    `## Concepts`,
    `### Mastered`,
    artifact.mastered.map(c => `- ✓ ${c}`).join('\n'),
    `### Needs Review`,
    artifact.weak.map(c => `- ○ ${c}`).join('\n'),
    ``,
    `## Misconceptions Detected`,
    listMisconceptions(DEFAULT_USER_ID)
      .filter(m => m.sessionId === sessionId)
      .map(m => `- **${m.conceptName}**: ~~${m.text}~~ → ${m.correction}`)
      .join('\n') || '_None detected._',
    ``,
    `## Flashcards`,
    artifact.flashcards.map((f, i) => `**${i + 1}. ${f.q}**\n> ${f.a}`).join('\n\n'),
    ``,
    `## Next Steps`,
    artifact.nextQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
    ``,
    `**Suggested next topic:** ${artifact.suggestedNext}`,
  ].join('\n');

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="session-${sessionId}.md"`,
    },
  });
}
