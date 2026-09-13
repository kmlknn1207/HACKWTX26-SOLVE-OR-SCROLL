import { useEffect, useRef, useState } from 'react';
import type { AttentionState } from './useAttentionDetector';
import './gaze.css';

const TOAST_LINES = ['eyes up', 'still there?', "screen's here", 'focus', 'hey'];

const BLACKOUT_LINES = [
  { head: 'you looked away.', sub: "the video's restarting." },
  { head: 'caught you.', sub: 'back to zero. try again.' },
  { head: "where'd you go?", sub: "the video didn't get less important." },
  { head: 'restarting.', sub: "you're welcome." },
  { head: 'focus tax collected.', sub: 'the bill is the whole video, again.' },
  { head: 'head up. screen forward.', sub: 'you know the drill.' },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface Props {
  state: AttentionState;
  onReturn: () => void;
}

export function AttentionOverlay({ state, onReturn }: Props) {
  const [toastLine, setToastLine] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [popping, setPopping] = useState(false);
  const [showBlackout, setShowBlackout] = useState(false);
  const [blackoutLine, setBlackoutLine] = useState(BLACKOUT_LINES[0]);
  const prevRef = useRef<AttentionState>('idle');

  useEffect(() => {
    const prev = prevRef.current;

    if (state === 'warning' && prev !== 'warning') {
      setToastLine(pick(TOAST_LINES));
      setPopping(false);
      setShowToast(true);
    }

    if (prev === 'warning' && state !== 'warning' && showToast) {
      setPopping(true);
      const id = window.setTimeout(() => {
        setShowToast(false);
        setPopping(false);
      }, 350);
      return () => clearTimeout(id);
    }

    if (state === 'distracted' && prev !== 'distracted') {
      setBlackoutLine(pick(BLACKOUT_LINES));
      setShowBlackout(true);
    }

    prevRef.current = state;
  }, [state, showToast]);

  const handleReturn = () => {
    setShowBlackout(false);
    onReturn();
  };

  return (
    <>
      {showToast && (
        <div className={`gaze-toast ${popping ? 'is-popping' : 'is-entering'}`}>
          <div className="gaze-toast-float">
            <div className="gaze-toast-buzz">
              <div className="gaze-toast-pill">{toastLine}</div>
            </div>
          </div>
        </div>
      )}
      {showBlackout && (
        <div className="gaze-blackout">
          <h2 className="gaze-blackout-title">{blackoutLine.head}</h2>
          <p className="gaze-blackout-sub">{blackoutLine.sub}</p>
          <button className="gaze-blackout-btn" onClick={handleReturn}>
            okay, I&apos;m here
          </button>
        </div>
      )}
    </>
  );
}