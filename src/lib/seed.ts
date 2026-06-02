import { getDb } from './db';
import { DEFAULT_USER_ID, ensureDefaultUser } from './repos';

export function seedDemoData(): void {
  const db = getDb();

  ensureDefaultUser();

  // Idempotent — skip if already seeded
  const existing = db.prepare(`SELECT id FROM learning_goals WHERE id = 'goal-1'`).get();
  if (existing) return;

  db.prepare(`
    INSERT OR IGNORE INTO learning_goals
      (id, user_id, topic, description, current_level, target_depth, motivation, mastery_percent, last_session_at)
    VALUES
      ('goal-1', ?, 'Transformer Architecture', 'Understand how transformers work at a conceptual level', 'intermediate', 'conceptual', 'Making architectural decisions for our LLM integration', 38, '2026-05-29T10:00:00Z'),
      ('goal-2', ?, 'RAG Fundamentals', 'Understand retrieval-augmented generation end to end', 'beginner', 'applied', 'Building a document Q&A system at work', 15, '2026-05-24T09:00:00Z')
  `).run(DEFAULT_USER_ID, DEFAULT_USER_ID);

  db.prepare(`
    INSERT OR IGNORE INTO sessions (id, goal_id, user_id, topic, started_at, ended_at, duration_minutes, turn_count)
    VALUES
      ('session-1', 'goal-1', ?, 'Attention mechanisms', '2026-05-29T10:00:00Z', '2026-05-29T10:42:00Z', 42, 18),
      ('session-2', 'goal-1', ?, 'Embedding spaces', '2026-05-26T14:30:00Z', '2026-05-26T14:58:00Z', 28, 12),
      ('session-3', 'goal-2', ?, 'Vector similarity basics', '2026-05-24T09:00:00Z', '2026-05-24T09:35:00Z', 35, 15)
  `).run(DEFAULT_USER_ID, DEFAULT_USER_ID, DEFAULT_USER_ID);

  // Seed messages for session-1
  const msgs = [
    { role: 'tutor', content: "Let's explore attention in transformers. Before we dive in — what do you already know about the difference between a transformer and an RNN?" },
    { role: 'user', content: 'Transformers are faster because they process all tokens at once instead of one at a time.' },
    { role: 'tutor', content: 'Good observation. What makes that parallel processing possible?' },
    { role: 'user', content: "I think it uses attention? But I'm not sure exactly how it works." },
    { role: 'tutor', content: 'Right direction. For each token, the model produces three vectors: Query, Key, and Value. The dot product of Q and K gives the relevance score. Why do you think we apply softmax to those scores?' },
    { role: 'user', content: 'To normalize them so they sum to 1?' },
    { role: 'tutor', content: 'Exactly. And then the values are weighted by those probabilities. Quick check — are Q/K/V vectors fixed properties of each word like embeddings?' },
    { role: 'user', content: 'Yeah, I assumed they were like word embeddings.' },
    { role: 'tutor', content: "Actually that's a subtle misconception. They're produced by learned linear projections — they change per layer and depend on context. Can you see why that matters?" },
  ];
  msgs.forEach((m, i) => {
    db.prepare(`INSERT OR IGNORE INTO messages (id, session_id, role, content, turn_index) VALUES (?, 'session-1', ?, ?, ?)`)
      .run(`msg-s1-${i}`, m.role, m.content, i);
  });

  // Seed concepts
  const concepts = [
    { id: 'c-1', goal_id: 'goal-1', name: 'QKV Mechanism', def: 'Each token produces three vectors (Query, Key, Value) that determine how it attends to other tokens.', status: 'mastered', misc: 1 },
    { id: 'c-2', goal_id: 'goal-1', name: 'Softmax normalization', def: 'Converts raw attention scores into a probability distribution that sums to 1.', status: 'strong', misc: 0 },
    { id: 'c-3', goal_id: 'goal-1', name: 'Multi-head attention', def: 'Running multiple attention operations in parallel to capture different relationship types.', status: 'weak', misc: 0 },
    { id: 'c-4', goal_id: 'goal-1', name: 'Positional encoding', def: "A signal added to token embeddings to convey each token's position in the sequence.", status: 'unknown', misc: 0 },
    { id: 'c-5', goal_id: 'goal-1', name: 'Embedding spaces', def: 'A high-dimensional vector space where semantically similar tokens are geometrically close.', status: 'improving', misc: 0 },
    { id: 'c-6', goal_id: 'goal-2', name: 'Vector similarity', def: 'Measuring how close two vectors are using cosine similarity or dot product.', status: 'improving', misc: 0 },
    { id: 'c-7', goal_id: 'goal-2', name: 'Chunking strategy', def: 'How documents are split into retrievable pieces — affects recall quality significantly.', status: 'weak', misc: 1 },
  ];
  concepts.forEach(c => {
    db.prepare(`INSERT OR IGNORE INTO concepts (id, user_id, goal_id, name, simple_definition, status, session_count, misconception_count) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(c.id, DEFAULT_USER_ID, c.goal_id, c.name, c.def, c.status, c.misc);
  });

  // Seed misconceptions
  db.prepare(`
    INSERT OR IGNORE INTO misconceptions (id, user_id, concept_id, concept_name, session_id, goal_topic, text, correction, status, detected_at)
    VALUES
      ('m-1', ?, 'c-1', 'QKV Mechanism', 'session-1', 'Transformer Architecture',
       'Q/K/V vectors are fixed properties of each word, like word embeddings.',
       'Q/K/V are produced by learned linear projections — they change per layer and are context-dependent.',
       'unresolved', '2026-05-29T10:00:00Z'),
      ('m-2', ?, 'c-7', 'Chunking strategy', 'session-3', 'RAG Fundamentals',
       'Smaller chunks always produce better retrieval results.',
       'Chunk size is a tradeoff: too small loses context, too large dilutes signal.',
       'unresolved', '2026-05-24T09:00:00Z')
  `).run(DEFAULT_USER_ID, DEFAULT_USER_ID);

  // Seed artifact for session-1
  db.prepare(`
    INSERT OR IGNORE INTO learning_artifacts
      (id, session_id, goal_topic, summary, mastered, weak, next_questions, flashcards, suggested_next)
    VALUES (
      'artifact-1', 'session-1', 'Transformer Architecture',
      'You understand the QKV mechanism and can derive why softmax normalizes attention scores. You have a misconception about the nature of Q/K/V projections. Multi-head attention and positional encoding remain unexplored.',
      '["Parallel processing advantage over RNNs","QKV mechanism","Softmax normalization"]',
      '["Multi-head attention","Positional encoding"]',
      '["Why does multi-head attention use multiple Q/K/V projections instead of one large one?","How does a transformer know the order of tokens if it processes them all at once?"]',
      '[{"q":"What does a Query vector represent?","a":"What the current token is looking for in other tokens."},{"q":"Why apply softmax to raw attention scores?","a":"To convert them into a probability distribution over all tokens."}]',
      'Multi-head attention: why run attention multiple times in parallel?'
    )
  `).run();
  db.prepare(`UPDATE sessions SET artifact_id = 'artifact-1' WHERE id = 'session-1'`).run();

  // Seed review items
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const today = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO review_items (id, user_id, source_type, source_id, label, goal_topic, due_at)
    VALUES
      ('r-1', ?, 'misconception', 'm-1', 'Q/K/V vectors are fixed like embeddings', 'Transformer Architecture', ?),
      ('r-2', ?, 'concept', 'c-2', 'Softmax normalization in attention', 'Transformer Architecture', ?),
      ('r-3', ?, 'flashcard', 'f-1', 'What does a Query vector represent?', 'Transformer Architecture', ?)
  `).run(DEFAULT_USER_ID, yesterday, DEFAULT_USER_ID, today, DEFAULT_USER_ID, today);
}
