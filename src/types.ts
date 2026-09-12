export type PlayerId = 1 | 2;

export type PlayerPhase =
  | 'IDLE'
  | 'SOLVING'
  | 'WATCHING_VIDEO'
  | 'ANSWERING_VIDEO_QUESTION'
  | 'ROUND_COMPLETE'
  | 'GAME_COMPLETE';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Problem {
  id: string;
  difficulty: Difficulty;
  prompt: string;
  answer: string;
}

export interface VideoClip {
  id: string;
  youtubeId: string;
  question: string;
  options: string[];
  /** 0-based index into `options`. */
  correct: number;
}

export interface RoundRecord {
  roundIndex: number;
  problemId: string;
  timeMs: number;
  videosWatched: number;
  wrongVideoAnswers: number;
}

export interface PlayerRuntime {
  phase: PlayerPhase;
  answerInput: string;
  answerError: boolean;
  currentVideo: VideoClip | null;
  videosWatchedThisRound: number;
  wrongVideoAnswersThisRound: number;
  usedVideoIds: string[];
  roundStartedAt: number | null;
  frozenTimeMs: number | null;
  solvingAccumulatedMs: number;
  lastSolvingTickAt: number | null;
  interruptsFired: number;
  history: RoundRecord[];
}

export interface GameState {
  players: Record<PlayerId, PlayerRuntime>;
  roundIndex: number;
  currentProblem: Problem | null;
  usedProblemIds: string[];
  now: number;
}

export interface GazeStatusEvent {
  playerId: PlayerId;
  isWatchingScreen: boolean;
  timestamp: number;
}
