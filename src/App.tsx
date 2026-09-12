import { PlayerPane } from './components/PlayerPane';
import { ResultsScreen } from './components/ResultsScreen';
import { TOTAL_ROUNDS } from './game/constants';
import { useGame } from './game/useGame';
import './App.css';

export function App() {
  const game = useGame();
  const { state } = game;
  const idle = state.players[1].phase === 'IDLE';
  const complete = state.players[1].phase === 'GAME_COMPLETE';

  if (idle) {
    return (
      <main className="lobby">
        <h1>Scroll or Solve</h1>
        <p>
          2 players · {TOTAL_ROUNDS} rounds · same problem · lowest total time wins.
          After 30s unsolved, a Short plays; miss the video question and another
          Short starts immediately.
        </p>
        <button type="button" onClick={game.startGame}>
          Start
        </button>
      </main>
    );
  }

  if (complete) {
    return <ResultsScreen state={state} onPlayAgain={game.startGame} />;
  }

  return (
    <main className="split">
      <PlayerPane
        playerId={1}
        player={state.players[1]}
        state={state}
        onAnswerChange={(value) => game.setAnswerInput(1, value)}
        onSubmitProblem={() => game.submitProblem(1)}
        onVideoEnded={() => game.onVideoEnded(1)}
        onSubmitVideoAnswer={(index) => game.submitVideoAnswer(1, index)}
      />
      <PlayerPane
        playerId={2}
        player={state.players[2]}
        state={state}
        onAnswerChange={(value) => game.setAnswerInput(2, value)}
        onSubmitProblem={() => game.submitProblem(2)}
        onVideoEnded={() => game.onVideoEnded(2)}
        onSubmitVideoAnswer={(index) => game.submitVideoAnswer(2, index)}
      />
    </main>
  );
}

export default App;
