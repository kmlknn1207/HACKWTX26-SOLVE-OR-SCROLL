import { useEffect, useRef } from 'react';
import { VideoPlayer } from '../components/VideoPlayer';
import type { PlaylistVideo, PublicPlayer } from '../types';

interface VideoPlayerScreenProps {
  me: PublicPlayer;
  videos: PlaylistVideo[];
  videoIndex: number;
  onEnded: () => void;
  onActiveChange: (index: number) => void;
}

export function VideoPlayerScreen({
  me,
  videos,
  videoIndex,
  onEnded,
  onActiveChange,
}: VideoPlayerScreenProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const slidingRef = useRef(false);
  const total = videos.length || me.videoCount;

  useEffect(() => {
    const node = feedRef.current?.querySelector<HTMLElement>(`[data-slide="${videoIndex}"]`);
    if (!node) return;
    slidingRef.current = true;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const id = window.setTimeout(() => {
      slidingRef.current = false;
    }, 450);
    return () => window.clearTimeout(id);
  }, [videoIndex]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const slides = [...feed.querySelectorAll<HTMLElement>('[data-slide]')];
    const observer = new IntersectionObserver(
      (entries) => {
        if (slidingRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.65)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const next = Number((visible.target as HTMLElement).dataset.slide);
        if (Number.isInteger(next)) onActiveChange(next);
      },
      { root: feed, threshold: [0.65, 0.9] },
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [onActiveChange, videos.length]);

  return (
    <div className="shorts-root">
      <header className="shorts-hud">
        <p>
          Player {me.slot} · {me.solveRank === 1 ? 'First' : 'Second'} solver
        </p>
        <p>
          {Math.min(videoIndex + 1, total)} / {total}
        </p>
      </header>

      <div className="shorts-pips" aria-hidden="true">
        {videos.map((video, index) => (
          <span key={video.id} className={index === videoIndex ? 'is-active' : ''} />
        ))}
      </div>

      <div className="shorts-feed" ref={feedRef}>
        {videos.map((video, index) => (
          <section key={video.id} className="shorts-slide" data-slide={index}>
            {Math.abs(index - videoIndex) <= 1 ? (
              <VideoPlayer
                youtubeId={video.youtubeId}
                active={index === videoIndex}
                onEnded={() => {
                  if (index === videoIndex) onEnded();
                }}
              />
            ) : (
              <div className="video-player" />
            )}
            <div className="shorts-scroll-catcher" />
            <p className="shorts-hint">Swipe up</p>
          </section>
        ))}
      </div>
    </div>
  );
}
