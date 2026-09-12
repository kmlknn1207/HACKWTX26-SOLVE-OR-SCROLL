import type { GameState } from '../types';
import { formatMs, totalsForPlayer, winnerId } from '../game/machine';
import { TOTAL_ROUNDS } from '../game/constants';

interface ResultsScreenProps {
  state: GameState;
  onPlayAgain: () => void;
}

export function ResultsScreen({ state, onPlayAgain }: ResultsScreenProps) {
  const p1 = totalsForPlayer(state.players[1]);
  const p2 = totalsForPlayer(state.players[2]);
  const winner = winnerId(state);

  return (
    <section className="results">
      <h1>Results</h1>
      <p>
        {winner === 0
          ? 'Draw — same total solve time.'
          : `Player ${winner} wins (lowest total time).`}
      </p>
      <div className="results-grid">
        <article>
          <h2>Player 1</h2>
          <p>Total time: {formatMs(p1.timeMs)}</p>
          <p>Videos watched: {p1.videosWatched}</p>
          <p>Wrong video answers: {p1.wrongVideoAnswers}</p>
        </article>
        <article>
          <h2>Player 2</h2>
          <p>Total time: {formatMs(p2.timeMs)}</p>
          <p>Videos watched: {p2.videosWatched}</p>
          <p>Wrong video answers: {p2.wrongVideoAnswers}</p>
        </article>
      </div>
      <ol className="round-breakdown">
        {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
          const r1 = state.players[1].history[i];
          const r2 = state.players[2].history[i];
          return (
            <li key={i}>
              Round {i + 1}: P1 {r1 ? formatMs(r1.timeMs) : '—'} · P2{' '}
              {r2 ? formatMs(r2.timeMs) : '—'}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onPlayAgain}>
        Play again
      </button>
    </section>
  );
}
