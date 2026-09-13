export {};

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: typeof YT.Player;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    /** CV / gaze-tracking teammate entry point */
    reportGazeStatus?: (payload: { isWatchingScreen: boolean }) => void;
    onGazeStatus?: (event: {
      playerId?: string | number;
      isWatchingScreen: boolean;
      timestamp?: number;
    }) => void;
  }

  namespace YT {
    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }

    interface PlayerVars {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      disablekb?: 0 | 1;
      fs?: 0 | 1;
      modestbranding?: 0 | 1;
      rel?: 0 | 1;
      playsinline?: 0 | 1;
      loop?: 0 | 1;
      origin?: string;
      widget_referrer?: string;
    }

    interface PlayerOptions {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: PlayerVars;
      events?: {
        onReady?: (event: { target: Player }) => void;
        onStateChange?: (event: { data: PlayerState; target: Player }) => void;
        onError?: (event: { data: number; target: Player }) => void;
      };
    }

    class Player {
      constructor(element: string | HTMLElement, options: PlayerOptions);
      playVideo(): void;
      pauseVideo(): void;
      destroy(): void;
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): PlayerState;
      getIframe(): HTMLIFrameElement;
    }
  }
}
