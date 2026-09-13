import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type TouchEvent,
  type WheelEvent,
} from "react";
import { MathDisplay } from "../../src/components/MathDisplay";
import { VideoPlayer } from "../../src/components/VideoPlayer";
import { installGazeBridge } from "../../src/gaze/gazeBridge";
import { useAttentionDetector } from "../../src/gaze/useAttentionDetector";
import { AttentionOverlay } from "../../src/gaze/AttentionOverlay";
import { useCountdown } from "../../src/hooks/useCountdown";
import { useGameClient } from "../../src/socket/useGameClient";
import type { Difficulty, PlaylistVideo, PublicPlayer, RoomState, VideoQuestion } from "../../src/types";

installGazeBridge();

const PALETTES = [
  { bg: "#1B2D8F", textColor: "#fff", accent: "#FFD600" },
  { bg: "#111111", textColor: "#fff", accent: "#f2e8d5" },
  { bg: "#f2e8d5", textColor: "#000", accent: "#1B2D8F" },
  { bg: "#F0EDE8", textColor: "#111", accent: "#CC2200" },
  { bg: "#CC2200", textColor: "#fff", accent: "#FFD600" },
];

function palette(i: number) {
  return PALETTES[i % PALETTES.length]!;
}

function deckStyle(delta: number, n: number): CSSProperties {
  if (delta === 0) {
    return { transform: "translate(0%, 0%) scale(1) rotate(0deg)", zIndex: 10, opacity: 1, pointerEvents: "auto" };
  }
  if (delta === -1 || delta === n - 1) {
    return { transform: "translate(22%, -36%) scale(0.72) rotate(-4deg)", zIndex: 7, opacity: 0.9, pointerEvents: "none" };
  }
  if (delta === 1 || delta === -(n - 1)) {
    return { transform: "translate(-14%, 38%) scale(0.70) rotate(3deg)", zIndex: 6, opacity: 0.82, pointerEvents: "none" };
  }
  if (delta === -2 || delta === n - 2) {
    return { transform: "translate(36%, -58%) scale(0.56) rotate(-7deg)", zIndex: 4, opacity: 0.5, pointerEvents: "none" };
  }
  return { transform: "scale(0.5)", zIndex: 1, opacity: 0, pointerEvents: "none" };
}

function circularDelta(idx: number, current: number, n: number): number {
  if (n <= 0) return 0;
  let d = idx - current;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

function LeftStrip({
}: {
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-5 gap-4 flex-shrink-0 h-full"
      style={{ width: 52, background: "#274c43" }}
    >
      <div className="side-doodles" aria-hidden="true">
        <svg viewBox="0 0 52 220" role="presentation">
          <path className="doodle-line doodle-star" d="M11 19l2.4 7.2 7.6.2-6 4.5 2.1 7.3-6.1-4.2-6 4.2 2.1-7.3-6-4.5 7.6-.2z" />
          <path className="doodle-line doodle-spiral" d="M39 67c-8-7-18 0-14 9 4 8 17 6 18-4 1-10-13-15-20-7" />
          <path className="doodle-line doodle-bolt" d="M14 119l-8 15h7l-3 15 11-18h-7z" />
          <path className="doodle-line doodle-spark" d="M39 157h8M43 153v8M10 188h7M13.5 184.5v7" />
        </svg>
      </div>
    </div>
  );
}

function RightStrip() {
  return (
    <div
      className="flex flex-col items-center justify-center py-5 gap-4 flex-shrink-0 h-full"
      style={{ width: 52, background: "#274c43" }}
    >
      <div className="side-doodles side-doodles-right" aria-hidden="true">
        <svg viewBox="0 0 52 220" role="presentation">
          <path className="doodle-line doodle-circle" d="M37 23c0 8-6 14-14 14S9 31 9 23 15 9 23 9s14 6 14 14z" />
          <path className="doodle-line doodle-wave" d="M7 73c5-9 10 9 15 0s10 9 15 0 8 3 10 0" />
          <path className="doodle-line doodle-arrow" d="M40 112l-19 17m0 0 2-10m-2 10 10-2" />
          <path className="doodle-line doodle-sun" d="M12 177h18M21 168v18M14.5 170.5l13 13M27.5 170.5l-13 13" />
        </svg>
      </div>
    </div>
  );
}

function ScoreBar({ room, me }: { room: RoomState | null; me: PublicPlayer | null }) {
  const you = me ? (room?.scores[me.playerId] ?? 0) : 0;
  const opponent = room?.players.find((p) => p.playerId !== me?.playerId);
  const them = opponent ? (room?.scores[opponent.playerId] ?? 0) : 0;

  return (
    <div className="flex-shrink-0 px-3 pt-3">
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-2.5"
        style={{ background: "#111", color: "#fff" }}
      >
        <div>
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>
            YOU{me ? ` · P${me.slot}` : ""}
          </p>
          <p className="font-mono font-bold tabular-nums" style={{ fontSize: 22, color: "#BEFF00", lineHeight: 1.1 }}>
            {you}
          </p>
        </div>
        <p className="font-mono text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          VS
        </p>
        <div className="text-right">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>
            {opponent ? `P${opponent.slot}` : "OPPONENT"}
          </p>
          <p className="font-mono font-bold tabular-nums" style={{ fontSize: 22, color: "#FFD600", lineHeight: 1.1 }}>
            {them}
          </p>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="flex items-center justify-center w-10 h-10 rounded-full active:opacity-60">
      {children}
    </button>
  );
}

function BottomNav({ accent }: { accent: string }) {
  return (
    <div className="flex-shrink-0 px-3 pb-5 pt-2">
      <nav className="flex items-center justify-between px-6" style={{ background: "#111", borderRadius: 999, height: 60 }}>
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </NavBtn>
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </NavBtn>
        <button
          type="button"
          className="flex items-center justify-center rounded-full active:scale-95"
          style={{ width: 46, height: 38, background: accent }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="#111" strokeWidth="2.5" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </NavBtn>
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </NavBtn>
      </nav>
    </div>
  );
}

function FeedScreen({
  videos,
  currentIdx,
  onScroll,
  onEnded,
}: {
  videos: PlaylistVideo[];
  currentIdx: number;
  onScroll: (dir: 1 | -1) => void;
  onEnded: () => void;
}) {
  const n = videos.length;
  const touchStartY = useRef<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const dragging = useRef(false);

  // === CV: attention detector ===
  const [restartToken, setRestartToken] = useState(0);
  const { state: gazeState } = useAttentionDetector({
    enabled: true,
  });
  const isDistracted = gazeState === "distracted";

  const onTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    dragging.current = true;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!dragging.current || touchStartY.current === null) return;
    setDragDelta(e.touches[0].clientY - touchStartY.current);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!dragging.current || touchStartY.current === null) return;
    const d = touchStartY.current - e.changedTouches[0].clientY;
    dragging.current = false;
    setDragDelta(0);
    touchStartY.current = null;
    if (Math.abs(d) > 50) onScroll(d > 0 ? 1 : -1);
  };
  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 20) onScroll(e.deltaY > 0 ? 1 : -1);
    },
    [onScroll],
  );

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ minHeight: 0 }}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {videos.map((video, i) => {
        const delta = circularDelta(i, currentIdx, n);
        const style = deckStyle(delta, n);
        const colors = palette(i);
        let dragNudge = "";
        if (delta === 0) dragNudge = `translateY(${dragDelta * 0.5}px)`;
        else if (delta === 1 || delta === -(n - 1)) dragNudge = `translateY(${dragDelta * 0.08}px)`;
        else if (delta === -1 || delta === n - 1) dragNudge = `translateY(${dragDelta * 0.05}px)`;

        return (
          <div
            key={video.id}
            className="absolute"
            style={{
              inset: 12,
              ...style,
              transform: dragNudge ? `${style.transform} ${dragNudge}` : style.transform,
              transition: dragging.current
                ? "opacity 0.2s ease"
                : "transform 0.42s cubic-bezier(.4,0,.2,1), opacity 0.42s ease",
            }}
          >
            <div className="absolute inset-0 rounded-[20px] overflow-hidden" style={{ background: colors.bg }}>
              {Math.abs(i - currentIdx) <= 1 ? (
                <VideoPlayer
                  key={`${video.id}-${i === currentIdx ? restartToken : 0}`}
                  youtubeId={video.youtubeId}
                  active={i === currentIdx && !isDistracted}
                  onEnded={() => {
                    if (i === currentIdx) onEnded();
                  }}
                />
              ) : null}
              <div className="absolute inset-0 z-10" />
              <div className="absolute top-4 left-4 z-20">
                <span
                  className="text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}
                >
                  Short {i + 1}/{n}
                </span>
              </div>
              <div className="absolute top-4 right-4 rounded-full z-20" style={{ width: 8, height: 8, background: colors.accent }} />
            </div>
          </div>
        );
      })}
      <AttentionOverlay
        state={gazeState}
        onReturn={() => setRestartToken((t) => t + 1)}
      />
    </div>
  );
}

function HomePanel({
  serverUrl,
  onServerUrlChange,
  connecting,
  joinError,
  onCreate,
  onJoin,
}: {
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  connecting: boolean;
  joinError: string | null;
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const submitJoin = (event: FormEvent) => {
    event.preventDefault();
    onJoin(code);
  };

  return (
    <div className="flex-1 flex flex-col gap-5 px-5 py-6 overflow-y-auto hide-scrollbar">
      <div>
        <p className="font-mono text-xs tracking-widest" style={{ color: "rgba(0,0,0,0.38)" }}>
          HEAD TO HEAD
        </p>
        <h2 className="game-title">Scroll or Solve</h2>
        <p className="text-sm mt-2 text-center" style={{ color: "#f2e8d5" }}>
          Compete to test your concentration. Same integral. Faster solver gets 5 shorts. Slower solver only gets 3. Get the prompt rigth and earn points
        </p>
      </div>
      <label className="text-xs font-mono" style={{ color: "#f2e8d5" }}>
        Server URL:
        <input
          className="mt-1 w-full rounded-xl px-3 py-3 text-sm"
          style={{ background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", color: "#111" }}
          value={serverUrl}
          onChange={(e) => onServerUrlChange(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={onCreate}
        disabled={connecting}
        className="w-full py-4 rounded-2xl font-bold text-lg active:scale-95"
        style={{ background: "#111", color: "#f2e8d5", fontFamily: "'DM Serif Display', serif" }}
      >
        Create Room
      </button>
      <form onSubmit={submitJoin} className="flex flex-col gap-3">
        <input
          className="w-full rounded-xl px-3 py-3 text-sm uppercase tracking-widest"
          style={{ background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", color: "#111" }}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ROOM CODE"
        />
        <button
          type="submit"
          disabled={connecting}
          className="w-full py-4 rounded-2xl font-bold text-lg active:scale-95"
          style={{ background: "#d98878", color: "#000", fontFamily: "'DM Serif Display', serif" }}
        >
          Join Room
        </button>
      </form>
      {connecting && <p className="font-mono text-sm">Connecting…</p>}
      {joinError && <p className="text-sm" style={{ color: "#CC2200" }}>{joinError}</p>}
    </div>
  );
}

function WaitingPanel({
  room,
  me,
  onDifficulty,
  onReady,
  onLeave,
}: {
  room: RoomState;
  me: PublicPlayer;
  onDifficulty: (d: Difficulty) => void;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
}) {
  const opponent = room.players.find((p) => p.playerId !== me.playerId);
  return (
    <div className="flex-1 flex flex-col gap-6 px-6 py-6">
      <div className="text-center">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: "#111", lineHeight: 1.05 }}>
          {opponent ? "Opponent found" : (
            <>
              Finding opponent<span className="waiting-dots" aria-label="loading"><i /> <i /> <i /></span>
            </>
          )}
        </h2>
        <p className="font-mono text-sm mt-2" style={{ color: "#f2e8d5" }}>
          ROOM {room.roomCode} · PLAYER {me.slot}
        </p>
      </div>
      <label className="difficulty-control text-xs font-mono">
        Difficulty
        <select
          className="difficulty-select mt-1 w-full rounded-xl px-3 py-3"
          value={room.difficulty}
          disabled={me.slot !== 1}
          onChange={(e) => onDifficulty(e.target.value as Difficulty)}
        >
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
      </label>
      <ul className="text-sm font-mono" style={{ color: "#f2e8d5" }}>
        {room.players.map((p) => (
          <li key={p.playerId}>
            Player {p.slot}: {p.ready ? "ready" : "not ready"}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!opponent}
        onClick={() => onReady(!me.ready)}
        className="w-full py-4 rounded-2xl font-bold text-lg"
        style={{ background: "#111", color: "#f2e8d5", fontFamily: "'DM Serif Display', serif" }}
      >
        {me.ready ? "Unready" : "Ready up"}
      </button>
      <button type="button" onClick={onLeave} className="w-full py-3 rounded-2xl font-mono text-sm">
        Leave
      </button>
    </div>
  );
}

function ProblemPanel({
  room,
  problemError,
  onSubmit,
  onTimeout,
}: {
  room: RoomState;
  problemError: boolean;
  onSubmit: (answer: string) => void;
  onTimeout: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [answerBlocked, setAnswerBlocked] = useState(false);
  const problem = room.problem;
  const secondsLeft = useCountdown(room.solveDeadlineAt);
  const expired = room.solveDeadlineAt != null && secondsLeft <= 0;
  const timedOutRef = useRef(false);

  useEffect(() => {
    timedOutRef.current = false;
  }, [room.round, problem?.id]);

  useEffect(() => {
    if (!problemError) return;
    setAnswerBlocked(true);
    const timeout = window.setTimeout(() => setAnswerBlocked(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [problemError]);

  useEffect(() => {
    if (!expired || timedOutRef.current) return;
    timedOutRef.current = true;
    onTimeout();
  }, [expired, onTimeout]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (expired || answerBlocked) return;
    onSubmit(answer);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 px-5 py-4 overflow-y-auto hide-scrollbar">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs" style={{ color: "rgba(0,0,0,0.38)", letterSpacing: "0.08em" }}>
          ROUND {room.round} / {room.totalRounds}
        </p>
        <div
          className="flex items-center justify-center rounded-full font-mono font-bold text-white"
          style={{
            width: 44,
            height: 44,
            background: secondsLeft > 10 ? "#111" : "#CC2200",
            fontSize: 16,
            transition: "background 0.3s ease",
            flexShrink: 0,
          }}
        >
          {secondsLeft}
        </div>
      </div>
      <div className="rounded-2xl p-5" style={{ background: "#111" }}>
        <p className="font-mono text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
          {room.difficulty.toUpperCase()} · 60 SECONDS
        </p>
        {problem?.latex ? (
          <div className="math-display math-display-light">
            <MathDisplay latex={problem.latex} />
          </div>
        ) : (
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: "#fff" }}>{problem?.question}</p>
        )}
      </div>
      <div className="problem-answer-area">
        {problemError && answerBlocked && (
          <div className="wrong-answer-bubble" role="alert">
            Wrong answer. Try again.
          </div>
        )}
        <form onSubmit={submit} className="flex flex-col gap-2">
            <input
              className="w-full rounded-xl px-4 py-3"
              style={{ background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", color: "#111" }}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Numeric answer"
              inputMode="decimal"
              disabled={expired || answerBlocked}
            />
          <button
            type="submit"
            disabled={expired || answerBlocked}
            className="w-full py-4 rounded-2xl font-bold"
            style={{
              background: expired ? "#888" : "#d98878",
              color: "#000",
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Submit
          </button>
        </form>
      </div>
      {expired && <p style={{ color: "#CC2200" }}>Time’s up — 0 points this round.</p>}
    </div>
  );
}

function QuestionPanel({ question, onSubmit }: { question: VideoQuestion | null; onSubmit: (answer: string) => void }) {
  if (!question) {
    return <div className="flex-1 flex items-center justify-center font-mono text-sm">Loading question…</div>;
  }
  return (
    <div className="flex-1 flex flex-col gap-4 px-5 py-4 overflow-y-auto hide-scrollbar">
      <div className="rounded-2xl p-5" style={{ background: "#111" }}>
        <p className="font-mono text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          {question.reelNumber && question.reelCount
            ? `QUESTION FROM REEL ${question.reelNumber} OF ${question.reelCount}`
            : "VIDEO QUESTION"}
        </p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: "#fff", lineHeight: 1.3 }}>
          {question.question}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSubmit(opt)}
            className="w-full text-left rounded-xl px-4 py-3.5"
            style={{ background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", color: "#111" }}
          >
            <span className="font-medium text-sm">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultPanel({
  title,
  body,
  reward,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  reward?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 px-8" style={{ animation: "pop-in 0.45s cubic-bezier(.4,0,.2,1)" }}>
      <div
        className="flex items-center justify-center text-5xl rounded-2xl"
        style={{ width: 96, height: 96, background: "#f2e8d5", border: "2px solid #111" }}
      >
        🏆
      </div>
      <div className="text-center">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#111", lineHeight: 1 }}>{title}</h2>
        <p className="text-sm mt-2" style={{ color: "rgba(0,0,0,0.42)" }}>
          {body}
        </p>
      </div>
      {reward && (
        <div className="flex items-center gap-5 rounded-2xl px-8 py-5 w-full" style={{ background: "#111" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "#f2e8d5", lineHeight: 1 }}>
            {reward}
          </span>
          <p className="font-bold text-white">this round</p>
        </div>
      )}
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="w-full py-4 rounded-2xl font-bold text-lg"
          style={{ background: "#111", color: "#f2e8d5", fontFamily: "'DM Serif Display', serif" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function TimeUpPanel() {
  return (
    <div className="time-up-panel" role="alert">
      <div className="time-up-hourglass">⌛</div>
      <h2>Time&apos;s up</h2>
      <p>Time penalty -10pts</p>
      <small>Loading shorts...</small>
    </div>
  );
}

export default function App() {
  const game = useGameClient();
  const { room, me } = game;
  const [busy, setBusy] = useState(false);
  const accent = palette(game.videoIndex).accent;

  const handleScroll = useCallback(
    (dir: 1 | -1) => {
      if (busy || !game.playlist.length) return;
      setBusy(true);
      if (dir === 1) game.onVideoEnded();
      else game.setWatchIndex(Math.max(0, game.videoIndex - 1));
      window.setTimeout(() => setBusy(false), 420);
    },
    [busy, game],
  );

  useEffect(() => {
    document.title = "Scroll or Solve";
  }, []);

  let main: ReactNode;
  if (!room || !me) {
    main = (
      <HomePanel
        serverUrl={game.serverUrl}
        onServerUrlChange={game.setServerUrl}
        connecting={game.connecting}
        joinError={game.joinError}
        onCreate={game.createRoom}
        onJoin={game.joinRoom}
      />
    );
  } else if (room.phase === "lobby") {
    main = (
      <WaitingPanel
        room={room}
        me={me}
        onDifficulty={game.setDifficulty}
        onReady={game.setReady}
        onLeave={game.leaveRoom}
      />
    );
  } else if (room.phase === "finished" || me.phase === "game_complete") {
    const winner =
      room.winnerSlot === 0 ? "Draw" : room.winnerSlot ? `Player ${room.winnerSlot} wins` : "Results";
    main = (
      <ResultPanel
        title={winner}
        body={`P1 ${room.players.find((p) => p.slot === 1) ? room.scores[room.players.find((p) => p.slot === 1)!.playerId] ?? 0 : 0} · P2 ${room.players.find((p) => p.slot === 2) ? room.scores[room.players.find((p) => p.slot === 2)!.playerId] ?? 0 : 0}`}
        actionLabel="Play again →"
        onAction={game.playAgain}
      />
    );
  } else if (room.phase === "round_transition") {
    main = (
      <ResultPanel
        title={`Round ${room.round} locked`}
        body="Next round starting…"
        reward={`${me.roundPoints}`}
      />
    );
  } else if (game.timeUp) {
    main = <TimeUpPanel />;
  } else if (me.phase === "solving") {
    main = (
      <ProblemPanel
        room={room}
        problemError={game.problemError}
        onSubmit={game.submitProblemAnswer}
        onTimeout={game.timeoutProblem}
      />
    );
  } else if (me.phase === "watching") {
    main = (
      <FeedScreen
        videos={game.playlist}
        currentIdx={game.videoIndex}
        onScroll={handleScroll}
        onEnded={game.onVideoEnded}
      />
    );
  } else if (me.phase === "question") {
    main = <QuestionPanel question={game.videoQuestion} onSubmit={game.submitVideoAnswer} />;
  } else {
    main = (
      <ResultPanel title="Round locked in" body="Waiting for the other player to finish…" reward={`${me.roundPoints}`} />
    );
  }

  return (
    <div
      className="flex overflow-hidden"
      style={{ width: "100%", height: "100dvh", background: "#274c43", maxWidth: 440, margin: "0 auto" }}
    >
      <LeftStrip />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
        <ScoreBar room={room} me={me} />
        {main}
        <BottomNav accent={accent} />
      </div>
      <RightStrip />
    </div>
  );
}