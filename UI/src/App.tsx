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
  { bg: "#111111", textColor: "#fff", accent: "#BEFF00" },
  { bg: "#BEFF00", textColor: "#000", accent: "#1B2D8F" },
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
  scrolls,
  currentIdx,
  total,
  accent,
}: {
  scrolls: number;
  currentIdx: number;
  total: number;
  accent: string;
}) {
  const TRACK_H = 88;
  const pct = total === 0 ? 0 : (total - scrolls) / total;
  const knobY = Math.min(1, Math.max(0, pct)) * TRACK_H;

  return (
    <div
      className="flex flex-col items-center justify-center py-5 gap-4 flex-shrink-0 h-full"
      style={{ width: 52, background: "#d9d7d2" }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="rounded-full overflow-hidden"
          style={{
            width: 36,
            height: 36,
            border: "2.5px solid #111",
            outline: `2.5px solid ${accent}`,
            outlineOffset: "1.5px",
            background: accent,
            transition: "outline-color 0.4s ease",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 9,
            height: 9,
            background: "#22C55E",
            border: "2px solid #d9d7d2",
            bottom: -1,
            right: -1,
          }}
        />
      </div>
      <div style={{ width: 20, height: 1, background: "rgba(0,0,0,0.15)" }} />
      <span className="font-mono font-bold leading-none tabular-nums" style={{ fontSize: 20, color: "#111" }}>
        {scrolls}
      </span>
      <div className="relative flex-shrink-0" style={{ width: 2, height: TRACK_H }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
        <div className="absolute inset-x-0 top-0 rounded-full" style={{ height: knobY, background: "#111" }} />
        <div
          className="absolute rounded-full"
          style={{
            width: 11,
            height: 11,
            background: accent,
            border: "2px solid #111",
            left: "50%",
            transform: "translateX(-50%)",
            top: knobY - 5.5,
          }}
        />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {Array.from({ length: Math.max(total, 1) }, (_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === currentIdx ? 7 : 4,
              height: i === currentIdx ? 7 : 4,
              background: i === currentIdx ? accent : "rgba(0,0,0,0.18)",
            }}
          />
        ))}
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
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: "#111", lineHeight: 1.05 }}>
          Scroll or
          <br />
          Solve
        </h2>
        <p className="text-sm mt-2" style={{ color: "rgba(0,0,0,0.42)" }}>
          Same integral. First solver gets 5 shorts. Second gets 3. Swipe the deck like the Figma slides.
        </p>
      </div>
      <label className="text-xs font-mono" style={{ color: "rgba(0,0,0,0.45)" }}>
        Server URL
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
        style={{ background: "#111", color: "#BEFF00", fontFamily: "'DM Serif Display', serif" }}
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
          style={{ background: "#1B2D8F", color: "#fff", fontFamily: "'DM Serif Display', serif" }}
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
          {opponent ? "Opponent found" : "Finding opponent…"}
        </h2>
        <p className="font-mono text-sm mt-2" style={{ color: "rgba(0,0,0,0.38)" }}>
          ROOM {room.roomCode} · PLAYER {me.slot}
        </p>
      </div>
      <label className="text-xs font-mono">
        Difficulty
        <select
          className="mt-1 w-full rounded-xl px-3 py-3"
          value={room.difficulty}
          disabled={me.slot !== 1}
          onChange={(e) => onDifficulty(e.target.value as Difficulty)}
        >
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
      </label>
      <ul className="text-sm font-mono" style={{ color: "#111" }}>
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
        style={{ background: "#111", color: "#BEFF00", fontFamily: "'DM Serif Display', serif" }}
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
}: {
  room: RoomState;
  problemError: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const problem = room.problem;
  const secondsLeft = useCountdown(room.solveDeadlineAt);
  const expired = room.solveDeadlineAt != null && secondsLeft <= 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (expired) return;
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
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          className="w-full rounded-xl px-4 py-3.5"
          style={{ background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", color: "#111" }}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Numeric answer"
          inputMode="decimal"
          disabled={expired}
        />
        <button
          type="submit"
          disabled={expired}
          className="w-full py-4 rounded-2xl font-bold"
          style={{ background: expired ? "#888" : "#1B2D8F", color: "#fff", fontFamily: "'DM Serif Display', serif" }}
        >
          Submit
        </button>
      </form>
      {expired && <p style={{ color: "#CC2200" }}>Time’s up — 0 points this round.</p>}
      {problemError && <p style={{ color: "#CC2200" }}>Incorrect — try again.</p>}
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
        style={{ width: 96, height: 96, background: "#BEFF00", border: "2px solid #111" }}
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
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "#BEFF00", lineHeight: 1 }}>
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
          style={{ background: "#111", color: "#BEFF00", fontFamily: "'DM Serif Display', serif" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function App() {
  const game = useGameClient();
  const { room, me } = game;
  const [busy, setBusy] = useState(false);
  const accent = palette(game.videoIndex).accent;
  const remaining = Math.max(0, game.playlist.length - game.videoIndex);

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
  } else if (me.phase === "solving") {
    main = <ProblemPanel room={room} problemError={game.problemError} onSubmit={game.submitProblemAnswer} />;
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
      style={{ width: "100%", height: "100dvh", background: "#d9d7d2", maxWidth: 440, margin: "0 auto" }}
    >
      <LeftStrip
        scrolls={me?.phase === "watching" ? game.videoIndex + 1 : remaining || 0}
        currentIdx={game.videoIndex}
        total={game.playlist.length || 5}
        accent={accent}
      />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
        <ScoreBar room={room} me={me} />
        {main}
        <BottomNav accent={accent} />
      </div>
    </div>
  );
}