import type { GazeStatusPayload } from '../types';

type GazeEmitter = (payload: GazeStatusPayload) => void;

let emitGaze: GazeEmitter | null = null;

/**
 * Called by the game client once the Socket.io connection exists.
 * CV teammates should not call this — use `reportGazeStatus` only.
 */
export function bindGazeEmitter(emitter: GazeEmitter | null): void {
  emitGaze = emitter;
}

/**
 * CV / webcam teammate entry point.
 *
 * Call this whenever gaze tracking updates:
 *   reportGazeStatus({ isWatchingScreen: true })
 *
 * For now this only emits the `gaze-status` socket event. No scoring
 * penalty is applied yet — the server logs and broadcasts the sample.
 */
export function reportGazeStatus({ isWatchingScreen }: GazeStatusPayload): void {
  console.log('[gaze]', { isWatchingScreen, at: Date.now() });
  emitGaze?.({ isWatchingScreen });
}

export function installGazeBridge(): void {
  window.reportGazeStatus = reportGazeStatus;
  window.onGazeStatus = (event) => {
    reportGazeStatus({ isWatchingScreen: event.isWatchingScreen });
  };
}
