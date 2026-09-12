import { answersMatch, pickProblem, pickVideo, problemBank, videoBank } from '../data/banks';
import type { GameState, PlayerId, PlayerRuntime } from '../types';
import { PLAYER_IDS, ROUND_DIFFICULTY, TOTAL_ROUNDS, VIDEO_INTERRUPT_MS } from './constants';

export type GameAction =
  | { type: 'START_GAME'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'SET_ANSWER_INPUT'; playerId: PlayerId; value: string }
  | { type: 'SUBMIT_PROBLEM'; playerId: PlayerId }
  | { type: 'VIDEO_ENDED'; playerId: PlayerId }
  | { type: 'SUBMIT_VIDEO_ANSWER'; playerId: PlayerId; optionIndex: number };

function emptyPlayer(): PlayerRuntime {
  return {
    phase: 'IDLE',
    answerInput: '',
    answerError: false,
    currentVideo: null,
    videosWatchedThisRound: 0,
    wrongVideoAnswersThisRound: 0,
    usedVideoIds: [],
    roundStartedAt: null,
    frozenTimeMs: null,
    solvingAccumulatedMs: 0,
    lastSolvingTickAt: null,
    interruptsFired: 0,
    history: [],
  };
}

export function createInitialState(now = Date.now()): GameState {
  return {
    players: {
      1: emptyPlayer(),
      2: emptyPlayer(),
    },
    roundIndex: 0,
    currentProblem: null,
    usedProblemIds: [],
    now,
  };
}

function beginRound(
  state: GameState,
  now: number,
  roundIndex: number,
  history: Record<PlayerId, PlayerRuntime['history']>,
): GameState {
  const difficulty = ROUND_DIFFICULTY[roundIndex] ?? 'medium';
  const problem = pickProblem(problemBank, state.usedProblemIds, difficulty);
  const usedProblemIds = state.usedProblemIds.includes(problem.id)
    ? state.usedProblemIds
    : [...state.usedProblemIds, problem.id];

  const startPlayer = (playerHistory: PlayerRuntime['history']): PlayerRuntime => ({
    ...emptyPlayer(),
    phase: 'SOLVING',
    roundStartedAt: now,
    lastSolvingTickAt: now,
    history: playerHistory,
  });

  return {
    ...state,
    now,
    roundIndex,
    currentProblem: problem,
    usedProblemIds,
    players: {
      1: startPlayer(history[1]),
      2: startPlayer(history[2]),
    },
  };
}

function assignVideo(player: PlayerRuntime): PlayerRuntime {
  const video = pickVideo(videoBank, player.usedVideoIds);
  const usedVideoIds = player.usedVideoIds.includes(video.id)
    ? player.usedVideoIds
    : [...player.usedVideoIds, video.id];

  return {
    ...player,
    phase: 'WATCHING_VIDEO',
    currentVideo: video,
    usedVideoIds,
    videosWatchedThisRound: player.videosWatchedThisRound + 1,
    lastSolvingTickAt: null,
    answerError: false,
  };
}

function completeRoundForPlayer(state: GameState, playerId: PlayerId, now: number): PlayerRuntime {
  const player = state.players[playerId];
  const started = player.roundStartedAt ?? now;
  const timeMs = player.frozenTimeMs ?? now - started;
  const record = {
    roundIndex: state.roundIndex,
    problemId: state.currentProblem?.id ?? '',
    timeMs,
    videosWatched: player.videosWatchedThisRound,
    wrongVideoAnswers: player.wrongVideoAnswersThisRound,
  };

  return {
    ...player,
    phase: 'ROUND_COMPLETE',
    frozenTimeMs: timeMs,
    currentVideo: null,
    lastSolvingTickAt: null,
    answerError: false,
    history: [...player.history, record],
  };
}

function maybeAdvanceRound(state: GameState, now: number): GameState {
  const bothDone = PLAYER_IDS.every((id) => state.players[id].phase === 'ROUND_COMPLETE');
  if (!bothDone) return state;

  const nextRound = state.roundIndex + 1;
  if (nextRound >= TOTAL_ROUNDS) {
    return {
      ...state,
      now,
      players: {
        1: { ...state.players[1], phase: 'GAME_COMPLETE' },
        2: { ...state.players[2], phase: 'GAME_COMPLETE' },
      },
    };
  }

  return beginRound(state, now, nextRound, {
    1: state.players[1].history,
    2: state.players[2].history,
  });
}

function tickPlayer(player: PlayerRuntime, now: number): PlayerRuntime {
  if (player.phase !== 'SOLVING' || player.lastSolvingTickAt == null) {
    return player;
  }

  const delta = Math.max(0, now - player.lastSolvingTickAt);
  const solvingAccumulatedMs = player.solvingAccumulatedMs + delta;
  const nextInterruptAt = (player.interruptsFired + 1) * VIDEO_INTERRUPT_MS;

  if (solvingAccumulatedMs >= nextInterruptAt) {
    return assignVideo({
      ...player,
      solvingAccumulatedMs,
      lastSolvingTickAt: null,
      interruptsFired: player.interruptsFired + 1,
    });
  }

  return {
    ...player,
    solvingAccumulatedMs,
    lastSolvingTickAt: now,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return beginRound(createInitialState(action.now), action.now, 0, {
        1: [],
        2: [],
      });

    case 'TICK': {
      const ticked: GameState = {
        ...state,
        now: action.now,
        players: {
          1: tickPlayer(state.players[1], action.now),
          2: tickPlayer(state.players[2], action.now),
        },
      };
      return ticked;
    }

    case 'SET_ANSWER_INPUT':
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...state.players[action.playerId],
            answerInput: action.value,
            answerError: false,
          },
        },
      };

    case 'SUBMIT_PROBLEM': {
      const player = state.players[action.playerId];
      if (player.phase !== 'SOLVING' || !state.currentProblem) return state;
      if (!answersMatch(state.currentProblem.answer, player.answerInput)) {
        return {
          ...state,
          players: {
            ...state.players,
            [action.playerId]: { ...player, answerError: true },
          },
        };
      }

      const completed: GameState = {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: completeRoundForPlayer(state, action.playerId, state.now),
        },
      };
      return maybeAdvanceRound(completed, state.now);
    }

    case 'VIDEO_ENDED': {
      const player = state.players[action.playerId];
      if (player.phase !== 'WATCHING_VIDEO') return state;
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            phase: 'ANSWERING_VIDEO_QUESTION',
          },
        },
      };
    }

    case 'SUBMIT_VIDEO_ANSWER': {
      const player = state.players[action.playerId];
      if (player.phase !== 'ANSWERING_VIDEO_QUESTION' || !player.currentVideo) {
        return state;
      }

      const correct = action.optionIndex === player.currentVideo.correct;
      if (correct) {
        return {
          ...state,
          players: {
            ...state.players,
            [action.playerId]: {
              ...player,
              phase: 'SOLVING',
              currentVideo: null,
              lastSolvingTickAt: state.now,
              answerError: false,
            },
          },
        };
      }

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: assignVideo({
            ...player,
            wrongVideoAnswersThisRound: player.wrongVideoAnswersThisRound + 1,
          }),
        },
      };
    }

    default:
      return state;
  }
}

export function roundElapsedMs(player: PlayerRuntime, now: number): number {
  if (player.frozenTimeMs != null) return player.frozenTimeMs;
  if (player.roundStartedAt == null) return 0;
  return Math.max(0, now - player.roundStartedAt);
}

export function totalsForPlayer(player: PlayerRuntime) {
  return player.history.reduce(
    (acc, round) => ({
      timeMs: acc.timeMs + round.timeMs,
      videosWatched: acc.videosWatched + round.videosWatched,
      wrongVideoAnswers: acc.wrongVideoAnswers + round.wrongVideoAnswers,
    }),
    { timeMs: 0, videosWatched: 0, wrongVideoAnswers: 0 },
  );
}

export function winnerId(state: GameState): PlayerId | 0 {
  const t1 = totalsForPlayer(state.players[1]).timeMs;
  const t2 = totalsForPlayer(state.players[2]).timeMs;
  if (t1 === t2) return 0;
  return t1 < t2 ? 1 : 2;
}

export function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}
