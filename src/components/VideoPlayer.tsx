import { useEffect, useRef } from 'react';

let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    if (window.YT?.Player) resolve();
  });

  return youtubeApiPromise;
}

interface VideoPlayerProps {
  youtubeId: string;
  onEnded: () => void;
}

export function VideoPlayer({ youtubeId, onEnded }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const host = document.createElement('div');
    container.appendChild(host);

    let player: YT.Player | null = null;
    let cancelled = false;
    let finished = false;
    let pollId = 0;
    let lastTime = 0;

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      window.clearInterval(pollId);
      onEndedRef.current();
    };

    loadYoutubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;

      player = new window.YT.Player(host, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          loop: 0,
          origin: window.location.origin,
          widget_referrer: window.location.href,
        },
        events: {
          onReady: (event) => {
            try {
              event.target.getIframe()?.setAttribute(
                'referrerpolicy',
                'strict-origin-when-cross-origin',
              );
            } catch {
              /* iframe may not exist yet */
            }
            event.target.playVideo();
            pollId = window.setInterval(() => {
              if (cancelled || finished || !player) return;
              let time = 0;
              let duration = 0;
              try {
                time = player.getCurrentTime() ?? 0;
                duration = player.getDuration() ?? 0;
              } catch {
                return;
              }

              // Shorts often loop instead of firing ENDED.
              if (lastTime > 1.25 && time < 0.45) {
                finish();
                return;
              }

              if (duration > 0 && time >= Math.max(0.5, duration - 0.35)) {
                finish();
                return;
              }

              lastTime = time;
            }, 200);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            const ended = window.YT?.PlayerState?.ENDED ?? 0;
            if (event.data === ended) finish();
          },
          onError: () => {
            // Private, deleted, or embedding-disabled clips should not stall the round.
            finish();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      player?.destroy();
      host.remove();
    };
  }, [youtubeId]);

  return (
    <div className="video-player">
      <div className="video-player-host" ref={containerRef} />
    </div>
  );
}
