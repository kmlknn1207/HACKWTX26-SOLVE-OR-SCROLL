import { useState, useRef, useCallback, useEffect } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    id: 0,
    bg: "#1B2D8F",
    textColor: "#fff",
    accent: "#FFD600",
    user: "@neon_rider",
    title: "Tokyo Rain",
    caption: "3am and the city never sleeps",
    img: "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?w=600&h=900&fit=crop&auto=format",
    likes: "248K", comments: "4.2K", shares: "18K",
  },
  {
    id: 1,
    bg: "#111111",
    textColor: "#fff",
    accent: "#BEFF00",
    user: "@citylights.wav",
    title: "Night Walk",
    caption: "Every intersection is a vibe",
    img: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=600&h=900&fit=crop&auto=format",
    likes: "91K", comments: "1.8K", shares: "6K",
  },
  {
    id: 2,
    bg: "#BEFF00",
    textColor: "#000",
    accent: "#1B2D8F",
    user: "@baked.club",
    title: "Sign Says It All",
    caption: "No further comment needed fr",
    img: "https://images.unsplash.com/photo-1542902093-d55926049754?w=600&h=900&fit=crop&auto=format",
    likes: "512K", comments: "9.1K", shares: "41K",
  },
  {
    id: 3,
    bg: "#F0EDE8",
    textColor: "#111",
    accent: "#CC2200",
    user: "@nightcrawler.mp4",
    title: "Last Light",
    caption: "The moment before midnight",
    img: "https://images.unsplash.com/photo-1541702467897-41915a07d3a7?w=600&h=900&fit=crop&auto=format",
    likes: "177K", comments: "3.3K", shares: "12K",
  },
  {
    id: 4,
    bg: "#CC2200",
    textColor: "#fff",
    accent: "#FFD600",
    user: "@overhead.views",
    title: "Above It All",
    caption: "Seen from up high everything makes sense",
    img: "https://images.unsplash.com/photo-1544259342-306eccfec481?w=600&h=900&fit=crop&auto=format",
    likes: "330K", comments: "5.7K", shares: "27K",
  },
];

const N = CARDS.length;

const TRIVIA = [
  { q: "What year was TikTok launched internationally?", options: ["2016","2017","2018","2019"], answer: 2 },
  { q: "How many sides does a hexagon have?", options: ["5","6","7","8"], answer: 1 },
  { q: "What planet is known as the Red Planet?", options: ["Venus","Jupiter","Mars","Saturn"], answer: 2 },
  { q: "What is the capital of Japan?", options: ["Seoul","Beijing","Bangkok","Tokyo"], answer: 3 },
  { q: "How many zeros are in one billion?", options: ["6","7","8","9"], answer: 3 },
];

const OPPONENTS = [
  { name: "DarkBolt99", avatar: "⚡", rating: 847 },
  { name: "QuizMasterFlex", avatar: "🧠", rating: 1203 },
  { name: "NightScrollerr", avatar: "🌙", rating: 692 },
  { name: "TriviaGod", avatar: "🔥", rating: 1511 },
  { name: "ScrollHunter", avatar: "🎯", rating: 934 },
];

// ─── Deck positions ───────────────────────────────────────────────────────────
// delta: distance from current card in circular order
// -1 = previous,  0 = current,  +1 = next

function deckStyle(delta: number): React.CSSProperties {
  if (delta === 0) return {
    transform: "translate(0%, 0%) scale(1) rotate(0deg)",
    zIndex: 10,
    opacity: 1,
    pointerEvents: "auto",
  };
  if (delta === -1 || delta === N - 1) return {
    // previous: top-right, smaller, slight CCW tilt
    transform: "translate(22%, -36%) scale(0.72) rotate(-4deg)",
    zIndex: 7,
    opacity: 0.9,
    pointerEvents: "none",
  };
  if (delta === 1 || delta === -(N - 1)) return {
    // next: bottom-left, smaller, slight CW tilt
    transform: "translate(-14%, 38%) scale(0.70) rotate(3deg)",
    zIndex: 6,
    opacity: 0.82,
    pointerEvents: "none",
  };
  if (delta === -2 || delta === N - 2) return {
    transform: "translate(36%, -58%) scale(0.56) rotate(-7deg)",
    zIndex: 4,
    opacity: 0.5,
    pointerEvents: "none",
  };
  // everything else hidden
  return { transform: "scale(0.5)", zIndex: 1, opacity: 0, pointerEvents: "none" };
}

function circularDelta(idx: number, current: number): number {
  let d = idx - current;
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  return d;
}

// ─── Card component ───────────────────────────────────────────────────────────

function Card({ card }: { card: (typeof CARDS)[0] }) {
  return (
    <div
      className="absolute inset-0 rounded-[20px] overflow-hidden"
      style={{ background: card.bg }}
    >
      {/* luminosity photo */}
      <img
        src={card.img}
        alt={card.caption}
        className="absolute inset-0 w-full h-full object-cover select-none"
        style={{ mixBlendMode: "luminosity", opacity: 0.15 }}
        draggable={false}
      />

      {/* user tag */}
      <div className="absolute top-4 left-4 z-10">
        <span
          className="text-xs font-mono font-bold px-2.5 py-1 rounded-full"
          style={{
            background: card.textColor === "#fff" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.07)",
            color: card.textColor,
          }}
        >
          {card.user}
        </span>
      </div>

      {/* accent dot */}
      <div
        className="absolute top-4 right-4 rounded-full"
        style={{ width: 8, height: 8, background: card.accent }}
      />

      {/* title + caption */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(26px, 5.5vw, 38px)",
            lineHeight: 1.05,
            color: card.textColor,
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}
        >
          {card.title}
        </h2>
        <p className="text-sm font-medium leading-snug" style={{ color: card.textColor, opacity: 0.6, maxWidth: "82%" }}>
          {card.caption}
        </p>
        {/* stats */}
        <div className="flex items-center gap-5 mt-4">
          {[{ icon: "♥", v: card.likes }, { icon: "💬", v: card.comments }, { icon: "↗", v: card.shares }].map((s) => (
            <div key={s.icon} className="flex items-center gap-1.5">
              <span style={{ color: card.textColor, opacity: 0.45, fontSize: 12 }}>{s.icon}</span>
              <span className="font-mono font-bold" style={{ color: card.textColor, opacity: 0.75, fontSize: 11 }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Left Strip ───────────────────────────────────────────────────────────────

function LeftStrip({ scrolls, currentIdx, accent }: { scrolls: number; currentIdx: number; accent: string }) {
  const TRACK_H = 88;
  const pct = scrolls === N ? 0 : (N - scrolls) / N;
  const knobY = pct * TRACK_H;

  return (
    <div
      className="flex flex-col items-center justify-center py-5 gap-4 flex-shrink-0 h-full"
      style={{ width: 52, background: "#d9d7d2" }}
    >
      {/* avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="rounded-full overflow-hidden bg-gray-300"
          style={{
            width: 36, height: 36,
            border: "2.5px solid #111",
            outline: `2.5px solid ${accent}`,
            outlineOffset: "1.5px",
            transition: "outline-color 0.4s ease",
          }}
        >
          <img
            src="/src/imports/image-1.jpg"
            alt="You"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              img.parentElement!.style.background = accent;
            }}
          />
        </div>
        <div
          className="absolute rounded-full"
          style={{ width: 9, height: 9, background: "#22C55E", border: "2px solid #d9d7d2", bottom: -1, right: -1 }}
        />
      </div>

      {/* rule */}
      <div style={{ width: 20, height: 1, background: "rgba(0,0,0,0.15)" }} />

      {/* scroll count */}
      <span
        className="font-mono font-bold leading-none tabular-nums"
        style={{ fontSize: 20, color: accent, transition: "color 0.4s ease" }}
      >
        {scrolls}
      </span>

      {/* vertical track */}
      <div className="relative flex-shrink-0" style={{ width: 2, height: TRACK_H }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
        {/* filled */}
        <div
          className="absolute inset-x-0 top-0 rounded-full"
          style={{ height: knobY, background: "#111", transition: "height 0.45s cubic-bezier(.4,0,.2,1)" }}
        />
        {/* knob */}
        <div
          className="absolute rounded-full"
          style={{
            width: 11, height: 11,
            background: accent,
            border: "2px solid #111",
            left: "50%",
            transform: "translateX(-50%)",
            top: knobY - 5.5,
            transition: "top 0.45s cubic-bezier(.4,0,.2,1), background 0.4s ease",
          }}
        />
      </div>

      {/* dot scrubber */}
      <div className="flex flex-col items-center gap-1.5">
        {CARDS.map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === currentIdx ? 7 : 4,
              height: i === currentIdx ? 7 : 4,
              background: i === currentIdx ? accent : "rgba(0,0,0,0.18)",
              transition: "all 0.35s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ accent }: { accent: string }) {
  return (
    <div className="flex-shrink-0 px-3 pb-5 pt-2">
      <nav
        className="flex items-center justify-between px-6"
        style={{
          background: "#111",
          borderRadius: 999,
          height: 60,
        }}
      >
        {/* home */}
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </NavBtn>

        {/* discover */}
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </NavBtn>

        {/* create */}
        <button
          className="flex items-center justify-center rounded-full transition-all active:scale-95"
          style={{ width: 46, height: 38, background: accent, transition: "background 0.4s ease" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="#111" strokeWidth="2.5" fill="none">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        {/* messages */}
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </NavBtn>

        {/* profile */}
        <NavBtn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </NavBtn>
      </nav>
    </div>
  );
}

function NavBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex items-center justify-center w-10 h-10 rounded-full active:opacity-60 transition-opacity">
      {children}
    </button>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

function FeedScreen({
  scrolls, currentIdx, onScroll,
}: {
  scrolls: number; currentIdx: number; onScroll: (dir: 1 | -1) => void;
}) {
  const touchStartY = useRef<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    dragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || touchStartY.current === null) return;
    setDragDelta(e.touches[0].clientY - touchStartY.current);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current || touchStartY.current === null) return;
    const d = touchStartY.current - e.changedTouches[0].clientY;
    dragging.current = false;
    setDragDelta(0);
    touchStartY.current = null;
    if (Math.abs(d) > 50) onScroll(d > 0 ? 1 : -1);
  };
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > 20) onScroll(e.deltaY > 0 ? 1 : -1);
  }, [onScroll]);

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ minHeight: 0 }}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* card deck — all 5 rendered, positioned by delta */}
      {CARDS.map((card, i) => {
        const delta = circularDelta(i, currentIdx);
        const style = deckStyle(delta);

        // small live drag nudge on current + adjacent
        let dragNudge = "";
        if (delta === 0) dragNudge = `translateY(${dragDelta * 0.5}px)`;
        else if (delta === 1 || delta === -(N - 1)) dragNudge = `translateY(${dragDelta * 0.08}px)`;
        else if (delta === -1 || delta === N - 1) dragNudge = `translateY(${dragDelta * 0.05}px)`;

        return (
          <div
            key={card.id}
            className="absolute"
            style={{
              inset: "12px 12px 12px 12px",
              ...style,
              transform: dragNudge
                ? style.transform + " " + dragNudge
                : style.transform,
              transition: dragging.current
                ? "opacity 0.2s ease"
                : "transform 0.42s cubic-bezier(.4,0,.2,1), opacity 0.42s ease",
            }}
          >
            <Card card={card} />
          </div>
        );
      })}

      {/* no-scrolls overlay */}
      {scrolls === 0 && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3"
          style={{ background: "rgba(217,215,210,0.88)", backdropFilter: "blur(10px)" }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: "#111" }}
          >
            ⚔
          </div>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#111" }}>
            Finding opponent…
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Matchmaking ──────────────────────────────────────────────────────────────

function MatchmakingScreen({ onFound }: { onFound: (o: (typeof OPPONENTS)[0]) => void }) {
  const [dots, setDots] = useState(0);
  const [found, setFound] = useState(false);
  const [opp] = useState(() => OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)]);

  useEffect(() => {
    const di = setInterval(() => setDots((d) => (d + 1) % 4), 380);
    const ft = setTimeout(() => { setFound(true); clearInterval(di); setTimeout(() => onFound(opp), 1500); }, 3000);
    return () => { clearInterval(di); clearTimeout(ft); };
  }, [onFound, opp]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8">
      <div className="text-center">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: "#111", lineHeight: 1.05 }}>
          Out of<br />Scrolls
        </h2>
        <p className="text-sm font-mono mt-2" style={{ color: "rgba(0,0,0,0.38)", letterSpacing: "0.06em" }}>
          BATTLE TO EARN MORE
        </p>
      </div>

      <div className="relative flex items-center justify-center" style={{ width: 148, height: 148 }}>
        {[144, 100, 60].map((s, i) => (
          <div key={s} className="absolute rounded-full border"
            style={{ width: s, height: s, borderColor: `rgba(0,0,0,${0.06 + i * 0.04})`,
              animation: `pulse-soft ${1.3 + i * 0.35}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
        ))}
        <div className="flex items-center justify-center rounded-full text-2xl"
          style={{ width: 56, height: 56, background: "#111", color: "#fff" }}>
          👤
        </div>
        {found && (
          <div className="absolute top-2 right-2" style={{ animation: "pop-in 0.38s cubic-bezier(.4,0,.2,1)" }}>
            <div className="flex items-center justify-center rounded-full text-xl"
              style={{ width: 44, height: 44, background: "#1B2D8F", color: "#fff", border: "2px solid #fff" }}>
              {opp.avatar}
            </div>
          </div>
        )}
      </div>

      {!found ? (
        <p className="font-mono text-sm" style={{ color: "rgba(0,0,0,0.38)" }}>
          Searching{".".repeat(dots)}
        </p>
      ) : (
        <div className="text-center" style={{ animation: "pop-in 0.38s ease" }}>
          <p className="font-mono text-xs mb-1.5" style={{ color: "rgba(0,0,0,0.35)", letterSpacing: "0.1em" }}>OPPONENT FOUND</p>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#111" }}>
            {opp.avatar} {opp.name}
          </p>
          <p className="font-mono text-sm mt-1" style={{ color: "#1B2D8F" }}>Rating {opp.rating}</p>
        </div>
      )}
    </div>
  );
}

// ─── Trivia ───────────────────────────────────────────────────────────────────

function TriviaScreen({ opp, onComplete }: { opp: (typeof OPPONENTS)[0]; onComplete: (won: boolean) => void }) {
  const [qIdx] = useState(() => Math.floor(Math.random() * TRIVIA.length));
  const q = TRIVIA[qIdx];
  const [sel, setSel] = useState<number | null>(null);
  const [oppPick, setOppPick] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [phase, setPhase] = useState<"playing" | "done">("playing");

  useEffect(() => {
    if (phase !== "playing") return;
    const ti = setInterval(() => setTimeLeft((t) => {
      if (t <= 1) {
        clearInterval(ti);
        setOppPick(p => p ?? Math.floor(Math.random() * 4));
        setPhase("done");
        return 0;
      }
      return t - 1;
    }), 1000);
    const ot = setTimeout(() => setOppPick(Math.floor(Math.random() * 4)), 3000 + Math.random() * 4000);
    return () => { clearInterval(ti); clearTimeout(ot); };
  }, [phase]);

  const pick = (i: number) => {
    if (sel !== null) return;
    setSel(i);
    setOppPick(p => p ?? Math.floor(Math.random() * 4));
    setPhase("done");
  };

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => onComplete(sel === q.answer), 2200);
      return () => clearTimeout(t);
    }
  }, [phase, sel, q.answer, onComplete]);

  const revealed = phase === "done";

  return (
    <div className="flex-1 flex flex-col gap-4 px-5 py-4 overflow-y-auto hide-scrollbar" style={{ minHeight: 0 }}>
      {/* players header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300" style={{ border: "2px solid #111" }}>
            <img src="/src/imports/image-1.jpg" alt="You" className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.background = "#1B2D8F"; }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "#111" }}>You</p>
            <p className="text-xs font-mono" style={{ color: "#22C55E" }}>● live</p>
          </div>
        </div>

        <div
          className="flex items-center justify-center rounded-full font-mono font-bold text-white"
          style={{ width: 44, height: 44, background: timeLeft > 4 ? "#111" : "#CC2200",
            fontSize: 16, transition: "background 0.3s ease", flexShrink: 0 }}
        >
          {timeLeft}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="font-bold text-sm" style={{ color: "#111" }}>{opp.name}</p>
            <p className="text-xs font-mono" style={{ color: "#1B2D8F" }}>⚔ {opp.rating}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: "#1B2D8F", border: "2px solid #111", flexShrink: 0 }}>
            {opp.avatar}
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
        <span className="font-mono font-bold text-xs tracking-widest" style={{ color: "#CC2200" }}>VS</span>
        <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.1)" }} />
      </div>

      {/* question card */}
      <div className="rounded-2xl p-5" style={{ background: "#111" }}>
        <p className="font-mono text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
          QUESTION {qIdx + 1} / {TRIVIA.length}
        </p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: "#fff", lineHeight: 1.3 }}>
          {q.q}
        </p>
      </div>

      {/* options */}
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isMe = sel === i;
          const isOpp = oppPick === i;
          const correct = i === q.answer;

          let bg = "#fff", border = "rgba(0,0,0,0.1)", color = "#111";
          if (revealed) {
            if (correct) { bg = "#111"; border = "#111"; color = "#fff"; }
            else if (isMe) { bg = "#CC2200"; border = "#CC2200"; color = "#fff"; }
          } else if (isMe) {
            bg = "#1B2D8F"; border = "#1B2D8F"; color = "#fff";
          }

          return (
            <button key={i} onClick={() => pick(i)} disabled={sel !== null}
              className="w-full text-left rounded-xl px-4 py-3.5 transition-all duration-200 active:scale-99"
              style={{ background: bg, border: `1.5px solid ${border}`, color }}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{opt}</span>
                <span className="text-xs font-mono flex gap-1.5">
                  {isMe && <span style={{ opacity: 0.75 }}>YOU</span>}
                  {isOpp && revealed && <span>{opp.avatar}</span>}
                  {revealed && correct && <span>✓</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────────

function ResultScreen({ won, reward, onContinue }: { won: boolean; reward: number; onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 px-8" style={{ animation: "pop-in 0.45s cubic-bezier(.4,0,.2,1)" }}>
      <div className="flex items-center justify-center text-5xl rounded-2xl"
        style={{ width: 96, height: 96, background: won ? "#BEFF00" : "#F0EDE8", border: "2px solid #111" }}>
        {won ? "🏆" : "😤"}
      </div>

      <div className="text-center">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#111", lineHeight: 1 }}>
          {won ? "You Won!" : "You Lost"}
        </h2>
        <p className="text-sm mt-2" style={{ color: "rgba(0,0,0,0.42)" }}>
          {won ? "Correct — winner's bonus unlocked" : "Incorrect — consolation reward granted"}
        </p>
      </div>

      <div className="flex items-center gap-5 rounded-2xl px-8 py-5 w-full" style={{ background: "#111" }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 56, color: won ? "#BEFF00" : "#FFD600", lineHeight: 1 }}>
          +{reward}
        </span>
        <div>
          <p className="font-bold text-white">scrolls</p>
          <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {won ? "WINNER BONUS" : "CONSOLATION"}
          </p>
        </div>
      </div>

      <button onClick={onContinue}
        className="w-full py-4 rounded-2xl font-bold text-lg tracking-tight transition-all active:scale-95"
        style={{ background: "#111", color: won ? "#BEFF00" : "#FFD600",
          fontFamily: "'DM Serif Display', serif" }}>
        Keep Scrolling →
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type Screen = "feed" | "matchmaking" | "trivia" | "result";

export default function App() {
  const [scrolls, setScrolls] = useState(5);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [screen, setScreen] = useState<Screen>("feed");
  const [opponent, setOpponent] = useState<(typeof OPPONENTS)[0] | null>(null);
  const [won, setWon] = useState(false);
  const [reward, setReward] = useState(5);
  const [busy, setBusy] = useState(false);

  const card = CARDS[currentIdx];

  const handleScroll = useCallback((dir: 1 | -1) => {
    if (busy) return;
    if (dir === 1 && scrolls <= 0) return;
    setBusy(true);
    if (dir === 1) {
      const nextIdx = (currentIdx + 1) % N;
      const nextScrolls = scrolls - 1;
      setCurrentIdx(nextIdx);
      setScrolls(nextScrolls);
      setTimeout(() => {
        setBusy(false);
        if (nextScrolls === 0) setTimeout(() => setScreen("matchmaking"), 450);
      }, 420);
    } else {
      setCurrentIdx((i) => (i - 1 + N) % N);
      setTimeout(() => setBusy(false), 420);
    }
  }, [busy, currentIdx, scrolls]);

  return (
    <div className="flex overflow-hidden"
      style={{ width: "100%", height: "100dvh", background: "#d9d7d2", maxWidth: 440, margin: "0 auto" }}>

      {/* left strip — always present */}
      <LeftStrip scrolls={scrolls} currentIdx={currentIdx} accent={card.accent} />

      {/* main column */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
        {screen === "feed" && (
          <>
            <FeedScreen scrolls={scrolls} currentIdx={currentIdx} onScroll={handleScroll} />
            <BottomNav accent={card.accent} />
          </>
        )}
        {screen === "matchmaking" && (
          <>
            <MatchmakingScreen onFound={(o) => { setOpponent(o); setScreen("trivia"); }} />
            <BottomNav accent={card.accent} />
          </>
        )}
        {screen === "trivia" && opponent && (
          <>
            <TriviaScreen opp={opponent} onComplete={(w) => {
              setWon(w); setReward(w ? 5 : 3); setScreen("result");
            }} />
            <BottomNav accent={card.accent} />
          </>
        )}
        {screen === "result" && (
          <>
            <ResultScreen won={won} reward={reward} onContinue={() => { setScrolls(reward); setScreen("feed"); }} />
            <BottomNav accent={card.accent} />
          </>
        )}
      </div>
    </div>
  );
}
