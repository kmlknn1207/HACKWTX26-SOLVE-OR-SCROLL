import type { PublicPlayer, RoomState } from '../types';

interface WaitingOnOpponentProps {
  room: RoomState;
  me: PublicPlayer;
}

export function WaitingOnOpponent({ room, me }: WaitingOnOpponentProps) {
  return (
    <main className="screen">
      <h1>Round {room.round} locked in</h1>
      <p>
        You scored {me.roundPoints} this round
        {me.videoCorrect ? ' (video question correct)' : ' (video question incorrect)'}.
      </p>
      <p>Waiting for the other player to finish solve → videos → question…</p>
      <p className="meta">Your total: {room.scores[me.playerId] ?? 0}</p>
    </main>
  );
}
