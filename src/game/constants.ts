import constants from '../../shared/constants.json';

export const TOTAL_ROUNDS = constants.TOTAL_ROUNDS;
export const FIRST_SOLVER_VIDEO_COUNT = constants.FIRST_SOLVER_VIDEO_COUNT;
export const SECOND_SOLVER_VIDEO_COUNT = constants.SECOND_SOLVER_VIDEO_COUNT;
export const FIRST_SOLVER_POINTS = constants.FIRST_SOLVER_POINTS;
export const SECOND_SOLVER_POINTS = constants.SECOND_SOLVER_POINTS;
export const SERVER_PORT = constants.SERVER_PORT;
export const PROBLEM_TIME_LIMIT_MS = constants.PROBLEM_TIME_LIMIT_MS;

function inferServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  if (typeof window === 'undefined') return `http://localhost:${SERVER_PORT}`;
  // Same origin as the page: Vite proxies /socket.io to :3001, and the
  // production server already serves UI + sockets together.
  return window.location.origin;
}

export const DEFAULT_SERVER_URL = inferServerUrl();
