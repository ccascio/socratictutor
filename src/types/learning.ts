export type MasteryStatus = 'unknown' | 'weak' | 'improving' | 'strong' | 'mastered';
export type DepthLevel = 'beginner' | 'intermediate' | 'advanced';
export type GoalStatus = 'active' | 'paused' | 'completed';
export type MisconceptionStatus = 'unresolved' | 'acknowledged' | 'resolved';
export type MessageRole = 'tutor' | 'user';
export type LearningStyle = 'intuition-first' | 'math-ok' | 'analogy-heavy' | 'example-driven';

export interface LearningGoal {
  id: string;
  topic: string;
  description: string;
  currentLevel: DepthLevel;
  targetDepth: 'conceptual' | 'applied' | 'deep';
  motivation: string;
  status: GoalStatus;
  masteryPercent: number;
  createdAt: string;
  lastSessionAt?: string;
  sessionCount: number;
  weakConceptCount: number;
}

export interface Session {
  id: string;
  goalId: string;
  topic: string;
  startedAt: string;
  durationMinutes: number;
  conceptCount: number;
  misconceptionCount: number;
}

export interface Concept {
  id: string;
  goalId: string;
  goalTopic: string;
  name: string;
  simpleDefinition: string;
  status: MasteryStatus;
  prerequisites: string[];
  sessionCount: number;
  misconceptionCount: number;
}

export interface Misconception {
  id: string;
  conceptId: string;
  conceptName: string;
  sessionId: string;
  goalTopic: string;
  text: string;
  correction: string;
  status: MisconceptionStatus;
  detectedAt: string;
}

export interface Flashcard {
  q: string;
  a: string;
}

export interface LearningArtifact {
  id: string;
  sessionId: string;
  goalTopic: string;
  summary: string;
  mastered: string[];
  weak: string[];
  nextQuestions: string[];
  flashcards: Flashcard[];
  suggestedNext: string;
}

export interface ReviewItem {
  id: string;
  sourceType: 'misconception' | 'concept' | 'flashcard';
  label: string;
  dueAt: string;
  overdue: boolean;
  goalTopic: string;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ThinkingProfileStrength {
  trait: string;
  evidence: string;
}

export interface ThinkingProfileMistake {
  pattern: string;
  example: string;
}

export interface ThinkingProfile {
  strengths: ThinkingProfileStrength[];
  weaknesses: ThinkingProfileStrength[];
  commonMistakes: ThinkingProfileMistake[];
  learningStyleAssessment: string;
  narrative: string;
  dataQualityNote: string;
}

export interface GoalSetupForm {
  topic: string;
  currentLevel: DepthLevel | '';
  targetDepth: 'conceptual' | 'applied' | 'deep' | '';
  learningStyle: LearningStyle | '';
  motivation: string;
  timeAvailable: '15' | '30' | '45' | '';
}
