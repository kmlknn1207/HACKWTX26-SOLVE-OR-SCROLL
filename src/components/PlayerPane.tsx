import type { FormEvent } from 'react';
import type { GameState, PlayerId, PlayerRuntime } from '../types';
import { TOTAL_ROUNDS } from '../game/constants';
import { formatMs, roundElapsedMs } from '../game/machine';
import { VideoPlayer } from './VideoPlayer';

interface PlayerPaneProps {
  playerId: PlayerId;
  player: PlayerRuntime;
  state: GameState;
  onAnswerChange: (value: string) => void;
  onSubmitProblem: () => void;
  onVideoEnded: () => void;
  onSubmitVideoAnswer: (optionIndex: number) => void;
}

export function PlayerPane({
  playerId,
  player,
  state,
  onAnswerChange,
  onSubmitProblem,
  onVideoEnded,
  onSubmitVideoAnswer,
}: PlayerPaneProps) {
  const elapsed = roundElapsedMs(player, state.now);
  const problem = state.currentProblem;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmitProblem();
  };

  return (
    <section className="player-pane" data-player={playerId}>
      <header className="player-pane-header">
        <h2>Player {playerId}</h2>
        <p>
          Round {Math.min(state.roundIndex + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS} · {player.phase}
        </p>
        <p className="timer">{formatMs(elapsed)}</p>
        <p>
          Videos: {player.videosWatchedThisRound} · Wrong video answers:{' '}
          {player.wrongVideoAnswersThisRound}
        </p>
      </header>

      {player.phase === 'SOLVING' && problem && (
        <form onSubmit={onSubmit}>
          <p className="prompt">{problem.prompt}</p>
          <p className="meta">Difficulty: {problem.difficulty}</p>
          <input
            value={player.answerInput}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Your answer"
            autoComplete="off"
          />
          <button type="submit">Submit</button>
          {player.answerError && <p className="error">Incorrect — keep going.</p>}
        </form>
      )}

      {player.phase === 'WATCHING_VIDEO' && player.currentVideo && (
        <VideoPlayer youtubeId={player.currentVideo.youtubeId} onEnded={onVideoEnded} />
      )}

      {player.phase === 'ANSWERING_VIDEO_QUESTION' && player.currentVideo && (
        <div>
          <p className="prompt">{player.currentVideo.question}</p>
          <ul className="options">
            {player.currentVideo.options.map((option, index) => (
              <li key={`${player.currentVideo?.id}-${index}`}>
                <button type="button" onClick={() => onSubmitVideoAnswer(index)}>
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {player.phase === 'ROUND_COMPLETE' && (
        <p>Solved in {formatMs(elapsed)}. Waiting for the other player…</p>
      )}

      {player.phase === 'GAME_COMPLETE' && <p>Game complete.</p>}
    </section>
  );
}
