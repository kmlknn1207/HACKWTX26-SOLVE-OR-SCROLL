import { HomeScreen } from './screens/HomeScreen';
import { ProblemScreen } from './screens/ProblemScreen';
import { QuestionScreen } from './screens/QuestionScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { RoundTransition } from './screens/RoundTransition';
import { VideoPlayerScreen } from './screens/VideoPlayerScreen';
import { WaitingOnOpponent } from './screens/WaitingOnOpponent';
import { WaitingRoom } from './screens/WaitingRoom';
import { useGameClient } from './socket/useGameClient';
import './App.css';

export function App() {
  const game = useGameClient();
  const { room, me } = game;

  if (!room || !me) {
    return (
      <HomeScreen
        serverUrl={game.serverUrl}
        onServerUrlChange={game.setServerUrl}
        connecting={game.connecting}
        joinError={game.joinError}
        onCreate={game.createRoom}
        onJoin={game.joinRoom}
      />
    );
  }

  if (room.phase === 'lobby') {
    return (
      <WaitingRoom
        room={room}
        me={me}
        onDifficulty={game.setDifficulty}
        onReady={game.setReady}
        onLeave={game.leaveRoom}
      />
    );
  }

  if (room.phase === 'finished' || me.phase === 'game_complete') {
    return <ResultsScreen room={room} onPlayAgain={game.playAgain} />;
  }

  if (room.phase === 'round_transition') {
    return <RoundTransition room={room} />;
  }

  if (me.phase === 'solving') {
    return (
      <ProblemScreen
        room={room}
        me={me}
        problemError={game.problemError}
        onSubmit={game.submitProblemAnswer}
      />
    );
  }

  if (me.phase === 'watching') {
    return (
      <VideoPlayerScreen
        me={me}
        videos={game.playlist}
        videoIndex={game.videoIndex}
        onEnded={game.onVideoEnded}
      />
    );
  }

  if (me.phase === 'question') {
    return (
      <QuestionScreen question={game.videoQuestion} onSubmit={game.submitVideoAnswer} />
    );
  }

  return <WaitingOnOpponent room={room} me={me} />;
}

export default App;
