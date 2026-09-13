export type Difficulty = 'easy' | 'medium' | 'hard';

export type RoomPhase = 'lobby' | 'playing' | 'round_transition' | 'finished';

export type PlayerPhase =
  | 'lobby'
  | 'solving'
  | 'watching'
  | 'question'
  | 'round_complete'
  | 'game_complete';

export interface PublicProblem {
  id: string;
  difficulty: Difficulty;
  question: string;
  latex?: string;
}

export interface PlaylistVideo {
  id: string;
  youtubeId: string;
}

export interface VideoQuestion {
  videoId: string;
  question: string;
  options: string[];
}

export interface PublicPlayer {
  playerId: string;
  slot: 1 | 2;
  ready: boolean;
  connected: boolean;
  phase: PlayerPhase;
  solveRank: 1 | 2 | null;
  videoCount: number;
  roundPoints: number;
  videoCorrect: boolean | null;
}

export interface RoundRecord {
  round: number;
  solveRank: 1 | 2 | null;
  videoCorrect: boolean | null;
  points: number;
  problemId: string;
}

export interface RoomState {
  roomCode: string;
  phase: RoomPhase;
  round: number;
  totalRounds: number;
  difficulty: Difficulty;
  problem: PublicProblem | null;
  players: PublicPlayer[];
  scores: Record<string, number>;
  roundHistory: Record<string, RoundRecord[]>;
  gazes: Record<string, boolean>;
  points: { first: number; second: number };
  winnerSlot: 0 | 1 | 2 | null;
  solveDeadlineAt?: number | null;
  problemTimeLimitMs?: number;
}

export interface GazeStatusPayload {
  isWatchingScreen: boolean;
}
