import type { GazeStatusEvent } from '../types';

/**
 * Teammate CV / gaze module should call this (also available as `window.onGazeStatus`).
 *
 * Example:
 *   onGazeStatus({ playerId: 1, isWatchingScreen: false, timestamp: Date.now() })
 */
export function onGazeStatus(event: GazeStatusEvent): void {
  console.log('[gaze]', event);

  // HOOK: penalty / flagging for later.
  // When `event.isWatchingScreen` is false during WATCHING_VIDEO (or SOLVING),
  // apply a time penalty, increment a "looked away" counter, or flag the round.
  // Keep this function as the only integration surface so the CV module
  // does not need to know about the game reducer.
}

export function installGazeBridge(): void {
  window.onGazeStatus = onGazeStatus;
}
