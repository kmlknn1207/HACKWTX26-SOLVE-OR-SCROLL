import { useState, type FormEvent } from 'react';
import { MathDisplay } from '../components/MathDisplay';
import type { PublicPlayer, RoomState } from '../types';

interface ProblemScreenProps {
  room: RoomState;
  me: PublicPlayer;
  problemError: boolean;
  onSubmit: (answer: string) => void;
}

export function ProblemScreen({ room, me, problemError, onSubmit }: ProblemScreenProps) {
  const [answer, setAnswer] = useState('');
  const problem = room.problem;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(answer);
  };

  return (
    <main className="screen">
      <p>
        Round {room.round} / {room.totalRounds} · Player {me.slot} · {room.difficulty}
      </p>
      <h1>Solve</h1>
      {problem ? (
        <>
          {problem.latex ? (
            <MathDisplay latex={problem.latex} />
          ) : (
            <p className="prompt">{problem.question}</p>
          )}
          <p className="meta">Enter a number. Close answers within 0.01 count.</p>
        </>
      ) : (
        <p>Waiting for problem…</p>
      )}
      <form onSubmit={submit}>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Numeric answer"
          inputMode="decimal"
          autoComplete="off"
        />
        <button type="submit">Submit</button>
      </form>
      {problemError && <p className="error">Incorrect — try again. Solve order is not used yet.</p>}
      <p className="meta">
        Score {room.scores[me.playerId] ?? 0}
        {me.solveRank ? ` · you solved ${me.solveRank === 1 ? 'first' : 'second'}` : ''}
      </p>
    </main>
  );
}
