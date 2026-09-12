import type { PublicPlayer, RoomState } from '../types';

interface RoundTransitionProps {
  room: RoomState;
}

function lineFor(player: PublicPlayer | undefined, room: RoomState) {
  if (!player) return '—';
  const rank =
    player.solveRank === 1 ? 'first solver' : player.solveRank === 2 ? 'second solver' : 'unsolved';
  const video = player.videoCorrect == null ? 'no video answer' : player.videoCorrect ? 'video Q correct' : 'video Q wrong';
  return `Player ${player.slot} scored ${player.roundPoints} (${rank}, ${video}). Total: ${room.scores[player.playerId] ?? 0}`;
}

export function RoundTransition({ room }: RoundTransitionProps) {
  const p1 = room.players.find((p) => p.slot === 1);
  const p2 = room.players.find((p) => p.slot === 2);

  return (
    <main className="screen">
      <h1>Round {room.round} complete</h1>
      <p>{lineFor(p1, room)}</p>
      <p>{lineFor(p2, room)}</p>
      <p className="meta">Next round starting…</p>
    </main>
  );
}
