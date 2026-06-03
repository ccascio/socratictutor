export const FIRST_RUN_ONBOARDING_KEY = 'socratic-first-run:v1:completed';
export const LEARNING_STYLE_KEY = 'pref_learningStyle';
export const TARGET_DEPTH_KEY = 'pref_targetDepth';
export const ONBOARDING_COMPLETE_EVENT = 'socratic:first-run-complete';

export type StoredLearningStyle =
  | 'intuition-first'
  | 'analogy-heavy'
  | 'example-driven'
  | 'math-ok';

export type StoredTargetDepth = 'conceptual' | 'applied' | 'deep';

export const DEFAULT_LEARNING_STYLE: StoredLearningStyle = 'intuition-first';
export const DEFAULT_TARGET_DEPTH: StoredTargetDepth = 'conceptual';

export function isFirstRunOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(FIRST_RUN_ONBOARDING_KEY) === 'true';
}

export function markFirstRunOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FIRST_RUN_ONBOARDING_KEY, 'true');
  window.dispatchEvent(new CustomEvent(ONBOARDING_COMPLETE_EVENT));
}

export function getStoredLearningStyle(): StoredLearningStyle {
  if (typeof window === 'undefined') return DEFAULT_LEARNING_STYLE;
  const stored = window.localStorage.getItem(LEARNING_STYLE_KEY);
  if (
    stored === 'intuition-first' ||
    stored === 'analogy-heavy' ||
    stored === 'example-driven' ||
    stored === 'math-ok'
  ) {
    return stored;
  }
  return DEFAULT_LEARNING_STYLE;
}

export function getStoredTargetDepth(): StoredTargetDepth {
  if (typeof window === 'undefined') return DEFAULT_TARGET_DEPTH;
  const stored = window.localStorage.getItem(TARGET_DEPTH_KEY);
  if (stored === 'conceptual' || stored === 'applied' || stored === 'deep') {
    return stored;
  }
  return DEFAULT_TARGET_DEPTH;
}

export function saveLearningPreferences(
  learningStyle: StoredLearningStyle,
  targetDepth: StoredTargetDepth,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEARNING_STYLE_KEY, learningStyle);
  window.localStorage.setItem(TARGET_DEPTH_KEY, targetDepth);
}
