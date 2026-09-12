import type { RoomState } from '../types';

interface ResultsScreenProps {
  room: RoomState;
  onPlayAgain: () => void;
}

export function ResultsScreen({ room, onPlayAgain }: ResultsScreenProps) {
  const p1 = room.players.find((p) => p.slot === 1);
  const p2 = room.players.find((p) => p.slot === 2);
  const winner =
    room.winnerSlot === 0
      ? 'Draw'
      : room.winnerSlot
        ? `Player ${room.winnerSlot} wins`
        : 'Results';

  const rounds = Array.from({ length: room.totalRounds }, (_, i) => i + 1);

  return (
    <main className="screen">
      <h1>Final results</h1>
      <p>{winner}</p>
      <div className="results-grid">
        <article>
          <h2>Player 1</h2>
          <p>Total: {p1 ? (room.scores[p1.playerId] ?? 0) : 0}</p>
        </article>
        <article>
          <h2>Player 2</h2>
          <p>Total: {p2 ? (room.scores[p2.playerId] ?? 0) : 0}</p>
        </article>
      </div>
      <ol className="round-breakdown">
        {rounds.map((round) => {
          const r1 = p1 ? room.roundHistory[p1.playerId]?.find((r) => r.round === round) : undefined;
          const r2 = p2 ? room.roundHistory[p2.playerId]?.find((r) => r.round === round) : undefined;
          return (
            <li key={round}>
              Round {round}: P1 {r1 ? `${r1.points} pts` : '—'} · P2 {r2 ? `${r2.points} pts` : '—'}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onPlayAgain}>
        Play again
      </button>
    </main>
  );
}
