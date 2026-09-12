import { useCallback, useEffect, useReducer } from 'react';
import { onGazeStatus } from '../gaze/gazeBridge';
import type { PlayerId } from '../types';
import { createInitialState, gameReducer } from './machine';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(Date.now()),
  );

  useEffect(() => {
    const bothIdle = state.players[1].phase === 'IDLE';
    const bothDone = state.players[1].phase === 'GAME_COMPLETE';
    if (bothIdle || bothDone) return;

    const id = window.setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() });
    }, 100);

    return () => window.clearInterval(id);
  }, [state.players[1].phase, state.players[2].phase]);

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME', now: Date.now() });
  }, []);

  const setAnswerInput = useCallback((playerId: PlayerId, value: string) => {
    dispatch({ type: 'SET_ANSWER_INPUT', playerId, value });
  }, []);

  const submitProblem = useCallback((playerId: PlayerId) => {
    dispatch({ type: 'SUBMIT_PROBLEM', playerId });
  }, []);

  const onVideoEnded = useCallback((playerId: PlayerId) => {
    dispatch({ type: 'VIDEO_ENDED', playerId });
  }, []);

  const submitVideoAnswer = useCallback((playerId: PlayerId, optionIndex: number) => {
    dispatch({ type: 'SUBMIT_VIDEO_ANSWER', playerId, optionIndex });
  }, []);

  return {
    state,
    startGame,
    setAnswerInput,
    submitProblem,
    onVideoEnded,
    submitVideoAnswer,
    /** CV teammate: call this (or `window.onGazeStatus`) with gaze samples. */
    onGazeStatus,
  };
}
