import type { Difficulty, PublicPlayer, RoomState } from '../types';

interface WaitingRoomProps {
  room: RoomState;
  me: PublicPlayer;
  onDifficulty: (difficulty: Difficulty) => void;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
}

export function WaitingRoom({ room, me, onDifficulty, onReady, onLeave }: WaitingRoomProps) {
  const opponent = room.players.find((p) => p.playerId !== me.playerId);

  return (
    <main className="screen">
      <h1>Waiting Room</h1>
      <p>
        Room code: <strong>{room.roomCode}</strong> · You are Player {me.slot}
      </p>
      <p>{opponent ? `Player ${opponent.slot} joined` : 'Waiting for Player 2…'}</p>
      {!opponent?.connected && opponent ? <p className="error">Opponent disconnected</p> : null}

      <label>
        Difficulty
        <select
          value={room.difficulty}
          disabled={me.slot !== 1}
          onChange={(e) => onDifficulty(e.target.value as Difficulty)}
        >
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
      </label>
      {me.slot !== 1 && <p className="meta">Player 1 chooses difficulty.</p>}

      <ul>
        {room.players.map((p) => (
          <li key={p.playerId}>
            Player {p.slot}: {p.ready ? 'ready' : 'not ready'}
            {p.connected ? '' : ' (offline)'}
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => onReady(!me.ready)} disabled={!opponent}>
        {me.ready ? 'Unready' : 'Ready up'}
      </button>
      <button type="button" onClick={onLeave}>
        Leave
      </button>
    </main>
  );
}
