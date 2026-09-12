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
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (cancelled) return;
            const ended = window.YT?.PlayerState?.ENDED ?? 0;
            if (event.data === ended) onEndedRef.current();
          },
        },
      });
    });

    return () => {
      cancelled = true;
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
