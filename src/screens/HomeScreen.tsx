import { useState, type FormEvent } from 'react';

interface HomeScreenProps {
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  connecting: boolean;
  joinError: string | null;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

export function HomeScreen({
  serverUrl,
  onServerUrlChange,
  connecting,
  joinError,
  onCreate,
  onJoin,
}: HomeScreenProps) {
  const [code, setCode] = useState('');

  const submitJoin = (event: FormEvent) => {
    event.preventDefault();
    onJoin(code);
  };

  return (
    <main className="screen">
      <h1>Scroll or Solve</h1>
      <p>Head-to-head, 5 rounds. Same problem. First solver watches 5 videos; second watches 3.</p>

      <label>
        Server URL (leave as-is unless you were told to change it)
        <input
          value={serverUrl}
          onChange={(e) => onServerUrlChange(e.target.value)}
          placeholder="http://10.161.6.217:5173"
          autoComplete="off"
        />
      </label>

      <button type="button" onClick={onCreate} disabled={connecting}>
        Create Room
      </button>

      <form onSubmit={submitJoin}>
        <label>
          Room code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            autoComplete="off"
          />
        </label>
        <button type="submit" disabled={connecting}>
          Join Room
        </button>
      </form>

      {connecting && <p>Connecting…</p>}
      {joinError && <p className="error">{joinError}</p>}
    </main>
  );
}
