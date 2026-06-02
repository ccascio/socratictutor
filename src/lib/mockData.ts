import {
  LearningGoal,
  Session,
  Concept,
  Misconception,
  LearningArtifact,
  ReviewItem,
  ChatMessage,
} from '@/types/learning';

export const mockGoals: LearningGoal[] = [
  {
    id: 'goal-1',
    topic: 'Transformer Architecture',
    description: 'Understand how transformers work at a conceptual level',
    currentLevel: 'intermediate',
    targetDepth: 'conceptual',
    motivation: 'Making architectural decisions for our LLM integration',
    status: 'active',
    masteryPercent: 38,
    createdAt: '2026-05-10',
    lastSessionAt: '2026-05-29',
    sessionCount: 3,
    weakConceptCount: 4,
  },
  {
    id: 'goal-2',
    topic: 'RAG Fundamentals',
    description: 'Understand retrieval-augmented generation end to end',
    currentLevel: 'beginner',
    targetDepth: 'applied',
    motivation: 'Building a document Q&A system at work',
    status: 'active',
    masteryPercent: 15,
    createdAt: '2026-05-20',
    lastSessionAt: '2026-05-24',
    sessionCount: 1,
    weakConceptCount: 6,
  },
];

export const mockSessions: Session[] = [
  {
    id: 'session-1',
    goalId: 'goal-1',
    topic: 'Attention mechanisms',
    startedAt: '2026-05-29T10:00:00Z',
    durationMinutes: 42,
    conceptCount: 4,
    misconceptionCount: 1,
  },
  {
    id: 'session-2',
    goalId: 'goal-1',
    topic: 'Embedding spaces',
    startedAt: '2026-05-26T14:30:00Z',
    durationMinutes: 28,
    conceptCount: 3,
    misconceptionCount: 0,
  },
  {
    id: 'session-3',
    goalId: 'goal-2',
    topic: 'Vector similarity basics',
    startedAt: '2026-05-24T09:00:00Z',
    durationMinutes: 35,
    conceptCount: 5,
    misconceptionCount: 1,
  },
];

export const mockConcepts: Concept[] = [
  {
    id: 'c-1',
    goalId: 'goal-1',
    goalTopic: 'Transformer Architecture',
    name: 'QKV Mechanism',
    simpleDefinition:
      'Each token produces three vectors (Query, Key, Value) that determine how it attends to other tokens.',
    status: 'mastered',
    prerequisites: [],
    sessionCount: 2,
    misconceptionCount: 1,
  },
  {
    id: 'c-2',
    goalId: 'goal-1',
    goalTopic: 'Transformer Architecture',
    name: 'Softmax normalization',
    simpleDefinition:
      'Converts raw attention scores into a probability distribution that sums to 1.',
    status: 'strong',
    prerequisites: ['QKV Mechanism'],
    sessionCount: 2,
    misconceptionCount: 0,
  },
  {
    id: 'c-3',
    goalId: 'goal-1',
    goalTopic: 'Transformer Architecture',
    name: 'Multi-head attention',
    simpleDefinition:
      'Running multiple attention operations in parallel to capture different relationship types.',
    status: 'weak',
    prerequisites: ['QKV Mechanism'],
    sessionCount: 1,
    misconceptionCount: 0,
  },
  {
    id: 'c-4',
    goalId: 'goal-1',
    goalTopic: 'Transformer Architecture',
    name: 'Positional encoding',
    simpleDefinition:
      "A signal added to token embeddings to convey each token's position in the sequence.",
    status: 'unknown',
    prerequisites: ['Embedding spaces'],
    sessionCount: 0,
    misconceptionCount: 0,
  },
  {
    id: 'c-5',
    goalId: 'goal-1',
    goalTopic: 'Transformer Architecture',
    name: 'Embedding spaces',
    simpleDefinition:
      'A high-dimensional vector space where semantically similar tokens are geometrically close.',
    status: 'improving',
    prerequisites: [],
    sessionCount: 1,
    misconceptionCount: 0,
  },
  {
    id: 'c-6',
    goalId: 'goal-2',
    goalTopic: 'RAG Fundamentals',
    name: 'Vector similarity',
    simpleDefinition:
      'Measuring how close two vectors are using cosine similarity or dot product.',
    status: 'improving',
    prerequisites: [],
    sessionCount: 1,
    misconceptionCount: 0,
  },
  {
    id: 'c-7',
    goalId: 'goal-2',
    goalTopic: 'RAG Fundamentals',
    name: 'Chunking strategy',
    simpleDefinition:
      'How documents are split into retrievable pieces — affects recall quality significantly.',
    status: 'weak',
    prerequisites: [],
    sessionCount: 1,
    misconceptionCount: 1,
  },
];

export const mockMisconceptions: Misconception[] = [
  {
    id: 'm-1',
    conceptId: 'c-1',
    conceptName: 'QKV Mechanism',
    sessionId: 'session-1',
    goalTopic: 'Transformer Architecture',
    text: 'Q, K, V vectors are fixed properties of each word, like word embeddings.',
    correction:
      'Q, K, V vectors are produced by learned linear projections — they change with every layer and are context-dependent.',
    status: 'unresolved',
    detectedAt: '2026-05-29',
  },
  {
    id: 'm-2',
    conceptId: 'c-7',
    conceptName: 'Chunking strategy',
    sessionId: 'session-3',
    goalTopic: 'RAG Fundamentals',
    text: 'Smaller chunks always produce better retrieval results.',
    correction:
      'Chunk size is a tradeoff: too small loses context, too large dilutes signal. Optimal size depends on query type and document structure.',
    status: 'unresolved',
    detectedAt: '2026-05-24',
  },
];

export const mockArtifact: LearningArtifact = {
  id: 'artifact-1',
  sessionId: 'session-1',
  goalTopic: 'Transformer Architecture',
  summary:
    'You understand the QKV mechanism and can derive why softmax normalizes attention scores. You grasped why transformers process tokens in parallel, but have a misconception about the nature of Q/K/V projections. Multi-head attention and positional encoding remain unexplored.',
  mastered: [
    'Parallel processing advantage over RNNs',
    'QKV mechanism',
    'Softmax as probability normalization',
  ],
  weak: ['Multi-head attention', 'Positional encoding'],
  nextQuestions: [
    'Why does multi-head attention use multiple Q/K/V projections instead of one large one?',
    'How does a transformer know the order of tokens if it processes them all at once?',
  ],
  flashcards: [
    {
      q: 'What does a Query vector represent?',
      a: 'What the current token is looking for in other tokens.',
    },
    {
      q: 'Why apply softmax to raw attention scores?',
      a: 'To convert them into a probability distribution (summing to 1) over all tokens.',
    },
    {
      q: 'What replaces the sequential hidden state from RNNs in a transformer?',
      a: 'The attention mechanism, which lets every token attend to every other token directly.',
    },
    {
      q: 'Are Q/K/V vectors fixed word properties?',
      a: 'No — they are produced by learned linear projections and change per layer and context.',
    },
  ],
  suggestedNext:
    'Multi-head attention: why run attention multiple times in parallel?',
};

export const mockReviewItems: ReviewItem[] = [
  {
    id: 'r-1',
    sourceType: 'misconception',
    label: 'Q/K/V vectors are fixed like embeddings',
    dueAt: '2026-05-28',
    overdue: true,
    goalTopic: 'Transformer Architecture',
  },
  {
    id: 'r-2',
    sourceType: 'concept',
    label: 'Softmax normalization in attention',
    dueAt: '2026-05-31',
    overdue: false,
    goalTopic: 'Transformer Architecture',
  },
  {
    id: 'r-3',
    sourceType: 'flashcard',
    label: 'What does a Query vector represent?',
    dueAt: '2026-05-31',
    overdue: false,
    goalTopic: 'Transformer Architecture',
  },
];

export const mockSessionMessages: ChatMessage[] = [
  {
    role: 'tutor',
    content:
      "Let's explore attention in transformers. Before we dive in — what do you already know about the difference between a transformer and an RNN? Take a shot at it.",
  },
  {
    role: 'user',
    content:
      'Transformers are faster because they process all tokens at once instead of one at a time.',
  },
  {
    role: 'tutor',
    content:
      'Good observation. What makes that parallel processing possible? What does a transformer use instead of the sequential hidden state an RNN carries forward?',
  },
  {
    role: 'user',
    content: "I think it uses attention? But I'm not sure exactly how it works.",
  },
  {
    role: 'tutor',
    content:
      'Right direction. Let\'s build up from there. Imagine reading the sentence "The cat sat on the mat because it was tired." When you reach the word "it," how do you figure out what it refers to?',
  },
  {
    role: 'user',
    content:
      'I look back at the sentence — "cat" makes more sense than "mat" because cats get tired.',
  },
  {
    role: 'tutor',
    content:
      "Exactly — you scanned the sentence and assigned relevance. Now, if a model needs to do the same thing, what would it need to compute for each word?",
  },
  {
    role: 'user',
    content: 'Some kind of relevance score between words?',
  },
  {
    role: 'tutor',
    content:
      "Precisely. Attention formalizes this. For each token, the model produces three vectors: Query, Key, and Value. The Query asks 'what am I looking for?' The Key says 'what do I contain?' The dot product of Q and K gives the relevance score. Why do you think we then apply softmax to those scores?",
  },
];

export const mockLiveConcepts: Array<{
  name: string;
  status: 'confirmed' | 'learning' | 'untested';
}> = [
  { name: 'Parallel processing advantage', status: 'confirmed' },
  { name: 'QKV mechanism', status: 'learning' },
  { name: 'Softmax normalization', status: 'untested' },
  { name: 'Multi-head attention', status: 'untested' },
];

export const cannedTutorResponses = [
  "Interesting. What makes you say that? Can you think of a specific example that would support or challenge your answer?",
  "You're on the right track. Before I add more — what do you think would happen if the opposite were true?",
  "Good instinct. What evidence would you need to be more confident in that position?",
  "That's a common way to think about it. Can you apply that logic to a concrete example — say, a single token in a sentence?",
  "Almost. There's a subtle distinction worth noticing. What assumption are you making about how the model processes context?",
];
