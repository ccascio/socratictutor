import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { LearningArtifact, Misconception } from '@/types/learning';

const BRAND = '#4A25E1';
const ORANGE = '#E87500';
const GRAY = '#6B7280';
const LIGHT_GRAY = '#F3F4F6';
const DARK = '#1A1A2E';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: DARK, padding: '40 48', lineHeight: 1.5 },

  // header
  header: { marginBottom: 28 },
  headerTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BRAND, marginBottom: 4 },
  headerMeta: { fontSize: 9, color: GRAY },

  // section
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },

  // summary box
  summaryBox: { backgroundColor: LIGHT_GRAY, borderRadius: 6, padding: '12 14', marginBottom: 20 },
  summaryText: { fontSize: 10, lineHeight: 1.7, color: DARK },

  // two-column concepts
  conceptsRow: { flexDirection: 'row', gap: 14 },
  conceptsCol: { flex: 1 },
  conceptItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  bullet: { fontSize: 10, marginRight: 5, marginTop: 1 },
  bulletGreen: { color: '#16A34A' },
  bulletOrange: { color: ORANGE },
  conceptName: { fontSize: 10, flex: 1 },

  // misconception card
  miscCard: { backgroundColor: '#FFF7ED', borderLeft: `3 solid ${ORANGE}`, borderRadius: 4, padding: '8 10', marginBottom: 8 },
  miscHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  miscConcept: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },
  miscStatus: { fontSize: 8, color: ORANGE },
  miscBelieved: { fontSize: 9, color: DARK, marginBottom: 3, fontStyle: 'italic' },
  miscCorrection: { fontSize: 9, color: GRAY },

  // flashcard
  flashcard: { borderBottom: `1 solid ${LIGHT_GRAY}`, paddingBottom: 8, paddingTop: 8 },
  flashQ: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 },
  flashA: { fontSize: 10, color: GRAY },

  // next steps
  nextItem: { flexDirection: 'row', marginBottom: 5 },
  nextNum: { fontSize: 10, color: BRAND, fontFamily: 'Helvetica-Bold', marginRight: 6, width: 14 },
  nextText: { fontSize: 10, flex: 1 },

  // suggested next
  suggestBox: { backgroundColor: BRAND, borderRadius: 6, padding: '10 14', marginTop: 10 },
  suggestLabel: { fontSize: 8, color: 'white', opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  suggestText: { fontSize: 10, color: 'white' },

  // footer
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: GRAY },
});

interface PdfProps {
  artifact: LearningArtifact;
  misconceptions: Misconception[];
  generatedAt: string;
}

export function SessionPdf({ artifact, misconceptions, generatedAt }: PdfProps) {
  return (
    <Document title={`${artifact.goalTopic} — Session Notes`} author="Socratic AI">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{artifact.goalTopic}</Text>
          <Text style={s.headerMeta}>Session Notes · Generated {generatedAt}</Text>
        </View>

        {/* Summary */}
        <View style={s.summaryBox}>
          <Text style={s.sectionLabel}>Summary</Text>
          <Text style={s.summaryText}>{artifact.summary}</Text>
        </View>

        {/* Concepts — two columns */}
        {(artifact.mastered.length > 0 || artifact.weak.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Concepts</Text>
            <View style={s.conceptsRow}>
              {artifact.mastered.length > 0 && (
                <View style={s.conceptsCol}>
                  <Text style={[s.sectionLabel, { color: '#16A34A', marginBottom: 6 }]}>Mastered</Text>
                  {artifact.mastered.map((c, i) => (
                    <View key={i} style={s.conceptItem}>
                      <Text style={[s.bullet, s.bulletGreen]}>✓</Text>
                      <Text style={s.conceptName}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
              {artifact.weak.length > 0 && (
                <View style={s.conceptsCol}>
                  <Text style={[s.sectionLabel, { color: ORANGE, marginBottom: 6 }]}>Needs Review</Text>
                  {artifact.weak.map((c, i) => (
                    <View key={i} style={s.conceptItem}>
                      <Text style={[s.bullet, s.bulletOrange]}>○</Text>
                      <Text style={s.conceptName}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Misconceptions */}
        {misconceptions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Misconceptions Detected ({misconceptions.length})</Text>
            {misconceptions.map((m, i) => (
              <View key={i} style={s.miscCard}>
                <View style={s.miscHeader}>
                  <Text style={s.miscConcept}>{m.conceptName}</Text>
                  <Text style={s.miscStatus}>{m.status.toUpperCase()}</Text>
                </View>
                <Text style={s.miscBelieved}>"{m.text}"</Text>
                <Text style={s.miscCorrection}>→ {m.correction}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Flashcards */}
        {artifact.flashcards.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Flashcards ({artifact.flashcards.length})</Text>
            {artifact.flashcards.map((f, i) => (
              <View key={i} style={s.flashcard}>
                <Text style={s.flashQ}>Q: {f.q}</Text>
                <Text style={s.flashA}>A: {f.a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Next steps */}
        {artifact.nextQuestions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Next Questions</Text>
            {artifact.nextQuestions.map((q, i) => (
              <View key={i} style={s.nextItem}>
                <Text style={s.nextNum}>{i + 1}.</Text>
                <Text style={s.nextText}>{q}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Suggested next */}
        {artifact.suggestedNext && (
          <View style={s.suggestBox}>
            <Text style={s.suggestLabel}>Suggested Next</Text>
            <Text style={s.suggestText}>{artifact.suggestedNext}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Socratic AI · {artifact.goalTopic}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
