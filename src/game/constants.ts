export const TOTAL_ROUNDS = 5;
export const VIDEO_INTERRUPT_MS = 30_000;
export const PLAYER_IDS = [1, 2] as const;

/** Round 1–5 difficulties. Extra problems of that difficulty are preferred, with fallback. */
export const ROUND_DIFFICULTY = [
  'easy',
  'easy',
  'medium',
  'medium',
  'hard',
] as const;
