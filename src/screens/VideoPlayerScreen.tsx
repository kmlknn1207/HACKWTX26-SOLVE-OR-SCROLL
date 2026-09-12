import { VideoPlayer } from '../components/VideoPlayer';
import type { PlaylistVideo, PublicPlayer } from '../types';

interface VideoPlayerScreenProps {
  me: PublicPlayer;
  videos: PlaylistVideo[];
  videoIndex: number;
  onEnded: () => void;
}

export function VideoPlayerScreen({
  me,
  videos,
  videoIndex,
  onEnded,
}: VideoPlayerScreenProps) {
  const current = videos[videoIndex];
  const total = videos.length || me.videoCount;

  return (
    <main className="screen">
      <p>
        Player {me.slot} · {me.solveRank === 1 ? 'First' : 'Second'} solver · video{' '}
        {Math.min(videoIndex + 1, total)} of {total}
      </p>
      {current ? (
        <VideoPlayer youtubeId={current.youtubeId} onEnded={onEnded} />
      ) : (
        <p>Loading videos…</p>
      )}
    </main>
  );
}
